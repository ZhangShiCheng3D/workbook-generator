"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Printer,
  Wand2,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Timer,
  RotateCw,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { downloadStudentPDF, downloadTeacherPDF } from "@/lib/pdf/download";
import { notify } from "@/lib/toast";
import { InputForm } from "@/components/generate/input-form";
import { ParseResultDisplay } from "@/components/generate/parse-result";
import { StreamingCards } from "@/components/generate/streaming-cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParseResult, QuestionOutput, WorkbookOutput } from "@/types";

// ---------------------------------------------------------------------------
// Pipeline SSE event types
// ---------------------------------------------------------------------------
interface SSEClaimEvent { type: "generating"; message: string }
interface SSEQuestionEvent { type: "question"; data: QuestionOutput }
interface SSERubricEvent {
  type: "rubric";
  data: { criteria: string; maxScore: number; scoreLevels: { score: number; description: string }[] };
}
interface SSECompleteEvent { type: "complete"; workbookId: string; workbook: WorkbookOutput }
interface SSEErrorEvent { type: "error"; message: string; code?: string }
type PipelineSSEEvent =
  | SSEClaimEvent | SSEQuestionEvent | SSERubricEvent | SSECompleteEvent | SSEErrorEvent;

interface APIJsonError { error: string }
interface APIClarification {
  needsClarification: true;
  clarificationQuestion: string;
  parsedPreview: { subject: string; topic: string; gradeLevel: string; questionCount: number };
}

interface RateLimitInfo {
  retryAfterSeconds: number;
  limit: string;
}

// ---------------------------------------------------------------------------
// Inner page component (uses useSearchParams)
// ---------------------------------------------------------------------------
function GeneratePageContent() {
  const searchParams = useSearchParams();
  const prefill = searchParams.get("topic") ?? "";

  const {
    status,
    parseResult,
    streamingQuestions,
    generationProgress,
    workbook,
    setStatus,
    addStreamingQuestion,
    setParseResult,
    setWorkbook,
    setProgress,
    setError: setStoreError,
    reset,
  } = useEditorStore();

  const [workbookId, setWorkbookId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [clarification, setClarification] = useState<{
    question: string;
    preview: APIClarification["parsedPreview"];
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isGenerating = status === "parsing" || status === "generating";
  const isComplete = status === "complete";
  const hasError = status === "error";

  // Cleanup rate-limit timer
  useEffect(() => {
    return () => {
      if (rateLimitTimerRef.current) {
        clearInterval(rateLimitTimerRef.current);
      }
    };
  }, []);

  const cancelInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  /** Parse Retry-After header or use default */
  const parseRetryAfter = (response: Response): number => {
    const header = response.headers.get("Retry-After");
    if (header) {
      const parsed = Number(header);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 60; // default 60 seconds
  };

  /** Handle Enhance My Stuff — same SSE flow, different endpoint */
  const handleEnhance = useCallback(
    async (input: string, material: string, options: string[]) => {
      cancelInFlight();
      reset();
      setWorkbookId(null);
      setStatusMessage("Enhancing materials...");
      setClarification(null);
      setApiError(null);
      setRateLimit(null);
      setStatus("parsing");

      const controller = new AbortController();
      abortRef.current = controller;

      let response: Response;
      try {
        response = await fetch("/api/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, material, enhancementOptions: options }),
          signal: controller.signal,
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStoreError("Network error. Please check your connection and try again.");
        notify.error("Network error.");
        return;
      }

      if (response.status === 429) {
        setRateLimit({ retryAfterSeconds: 60, limit: "Rate limited. Please wait." });
        setStatus("error");
        return;
      }

      const contentType = response.headers.get("Content-Type") || "";

      if (!response.ok || !contentType.includes("text/event-stream")) {
        try {
          const body = await response.json();
          if ("needsClarification" in body && body.needsClarification) {
            setClarification({ question: body.clarificationQuestion, preview: body.parsedPreview });
            return;
          }
        } catch {/* non-JSON */}
        setStoreError(`Server error (${response.status}). Please try again.`);
        return;
      }

      if (!response.body) { setStoreError("Streaming not supported."); return; }
      setStatus("generating");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() || "";
          for (const frame of frames) {
            const dataLine = frame.startsWith("data: ") ? frame.slice(6) : null;
            if (!dataLine) continue;
            try {
              const event: PipelineSSEEvent = JSON.parse(dataLine);
              if (event.type === "generating") {
                setProgress({ current: 0, total: 0 });
              } else if (event.type === "question") {
                addStreamingQuestion(event.data);
              } else if (event.type === "complete") {
                setWorkbook(event.workbook);
                setWorkbookId(event.workbookId);
              } else if (event.type === "error") {
                setStoreError(event.message);
              }
            } catch { /* skip malformed frame */ }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStoreError("Connection lost during enhancement.");
      } finally {
        try { reader.releaseLock(); } catch {/* ok */}
      }
    },
    [cancelInFlight, reset, addStreamingQuestion, setWorkbook, setProgress, setStoreError, setStatus]
  );

  const handleSubmit = useCallback(
    async (input: string) => {
      cancelInFlight();
      reset();
      setWorkbookId(null);
      setStatusMessage("");
      setClarification(null);
      setApiError(null);
      setRateLimit(null);

      setStatus("parsing");

      const controller = new AbortController();
      abortRef.current = controller;

      let response: Response;
      try {
        response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
          signal: controller.signal,
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = "Network error. Please check your connection and try again.";
        setStoreError(msg);
        notify.error(msg);
        return;
      }

      // ---- Rate limit handling (429) ----
      if (response.status === 429) {
        const retryAfterSeconds = parseRetryAfter(response);
        setRateLimit({
          retryAfterSeconds,
          limit: "Generations are rate-limited to prevent abuse. Please wait before trying again.",
        });

        // Countdown timer
        if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current);
        let remaining = retryAfterSeconds;
        rateLimitTimerRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current);
            setRateLimit((prev) =>
              prev ? { ...prev, retryAfterSeconds: 0 } : null
            );
          } else {
            setRateLimit((prev) =>
              prev ? { ...prev, retryAfterSeconds: remaining } : null
            );
          }
        }, 1000);

        setStatus("error");
        setStoreError("Rate limit exceeded. Please wait before generating again.");
        notify.error("Too many requests. Please slow down.");
        return;
      }

      // ---- Parse response ----
      const contentType = response.headers.get("Content-Type") || "";

      if (!response.ok || !contentType.includes("text/event-stream")) {
        let body: APIJsonError | APIClarification;
        try {
          body = await response.json();
        } catch {
          const statusMsg = `Server returned status ${response.status}. Please try again.`;
          setStoreError(statusMsg);
          notify.error(statusMsg);
          return;
        }

        if ("needsClarification" in body && body.needsClarification) {
          setClarification({
            question: body.clarificationQuestion,
            preview: body.parsedPreview,
          });
          const preview = body.parsedPreview;
          setParseResult({
            subject: (preview.subject as ParseResult["subject"]) || "other",
            topic: preview.topic,
            gradeLevel: preview.gradeLevel,
            questionCount: preview.questionCount,
            questionTypes: [],
            difficulty: "grade_level",
            confidence: "low",
            needsClarification: true,
            clarificationQuestion: body.clarificationQuestion,
          });
          setStatus("idle");
          return;
        }

        if ("error" in body) {
          setApiError(body.error);
          setStoreError(body.error);
          notify.error(body.error);
          return;
        }

        const unexpectedMsg = "Unexpected response from server. Please try again.";
        setStoreError(unexpectedMsg);
        notify.error(unexpectedMsg);
        return;
      }

      // ---- Read SSE stream ----
      if (!response.body) {
        const msg = "Streaming not supported by your browser.";
        setStoreError(msg);
        notify.error(msg);
        return;
      }

      setStatus("generating");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() || "";

          for (const frame of frames) {
            if (!frame.trim()) continue;

            const dataLines = frame
              .split("\n")
              .filter((line) => line.startsWith("data: "))
              .map((line) => line.slice(6));

            if (dataLines.length === 0) continue;
            const dataStr = dataLines.join("");

            let event: PipelineSSEEvent;
            try {
              event = JSON.parse(dataStr) as PipelineSSEEvent;
            } catch {
              continue;
            }

            switch (event.type) {
              case "generating": {
                setStatusMessage(event.message);
                setProgress({ current: 0, total: generationProgress?.total ?? 20 });
                break;
              }
              case "question": {
                addStreamingQuestion(event.data);
                const currentCount = useEditorStore.getState().streamingQuestions.length;
                setProgress({ current: currentCount, total: generationProgress?.total ?? 20 });
                break;
              }
              case "rubric": {
                break;
              }
              case "complete": {
                setWorkbookId(event.workbookId);
                setWorkbook(event.workbook);
                notify.success("Workbook generated!");
                break;
              }
              case "error": {
                setStoreError(event.message);
                notify.error(event.message || "Generation failed. Please try again.");
                return;
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = "Connection lost during generation. Please try again.";
        setStoreError(msg);
        notify.error(msg);
      } finally {
        reader.releaseLock();
        abortRef.current = null;
      }
    },
    [
      cancelInFlight, reset, setStatus, setParseResult,
      addStreamingQuestion, setProgress, setWorkbook, setStoreError, generationProgress,
    ]
  );

  const confidenceCounts = workbook
    ? {
        high: workbook.questions.filter((q) => q.confidence === "high").length,
        medium: workbook.questions.filter((q) => q.confidence === "medium").length,
        low: workbook.questions.filter((q) => q.confidence === "low").length,
      }
    : null;

  // Format seconds into human-readable time
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "0s";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min === 0) return `${sec}s`;
    return `${min}m ${sec}s`;
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Generate New Workbook
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Describe what you need — the AI handles subject, grade level, and
          question design automatically.
        </p>
      </div>

      {/* Input form */}
      {!isComplete && (
        <div className="mb-8">
          <InputForm
            onSubmit={handleSubmit}
            onEnhance={handleEnhance}
            isGenerating={isGenerating}
            defaultValue={prefill}
          />
        </div>
      )}

      {/* Rate limit card */}
      {rateLimit && (
        <div className="mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-lg text-amber-800 dark:text-amber-200">
                  Too Many Requests
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {rateLimit.limit}
              </p>
              <div className="flex items-center gap-3">
                {rateLimit.retryAfterSeconds > 0 ? (
                  <>
                    <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-1.5 dark:bg-amber-900/40">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium tabular-nums text-amber-800 dark:text-amber-200">
                        Retry in {formatTime(rateLimit.retryAfterSeconds)}
                      </span>
                    </div>
                    <RotateCw className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 dark:border-amber-700"
                    onClick={() => {
                      setRateLimit(null);
                      setStoreError(null);
                      reset();
                    }}
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    Try Again Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clarification prompt */}
      {clarification && (
        <div className="mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-lg text-amber-800 dark:text-amber-200">
                  Could you clarify?
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {clarification.question}
              </p>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Preview: {clarification.preview.topic} ({clarification.preview.subject},{" "}
                {clarification.preview.gradeLevel},{" "}
                {clarification.preview.questionCount} questions)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API error display */}
      {apiError && !hasError && (
        <div className="mb-6">
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Store error display */}
      {hasError && (
        <div className="mb-6">
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {useEditorStore.getState().error ?? "An unexpected error occurred."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status message during generation */}
      {statusMessage && status === "generating" && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {statusMessage}
        </div>
      )}

      {/* Parse result */}
      {parseResult && !isComplete && (
        <div className="mb-6">
          <ParseResultDisplay result={parseResult} />
        </div>
      )}

      {/* Streaming questions */}
      {(status === "generating" || (isComplete && workbook)) && (
        <div className="mb-8">
          <StreamingCards
            questions={streamingQuestions}
            isStreaming={status === "generating"}
            totalExpected={generationProgress?.total ?? 0}
          />
        </div>
      )}

      {/* Completion state */}
      {isComplete && workbook && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Success card */}
          <Card className="overflow-hidden border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-start gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                  Workbook Ready!
                </h3>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                  {workbook.title} &mdash; {workbook.questions.length} questions generated
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-emerald-200 dark:border-emerald-700">
                    <Clock className="mr-1 h-3 w-3" />
                    {workbook.estimatedTime}
                  </Badge>
                  <Badge variant="outline" className="border-emerald-200 dark:border-emerald-700">
                    Grade {workbook.gradeLevel}
                  </Badge>
                  {confidenceCounts && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground ml-1">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        {confidenceCounts.high} high
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                        {confidenceCounts.medium} medium
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                        {confidenceCounts.low} low
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {workbookId ? (
              <Button
                render={<Link href={`/dashboard/workbook/${workbookId}`} />}
                size="lg"
                className="w-full sm:w-auto"
              >
                <FileText className="mr-2 h-4 w-4" />
                View Workbook
              </Button>
            ) : (
              <Button size="lg" disabled className="w-full sm:w-auto">
                <FileText className="mr-2 h-4 w-4" />
                View Workbook
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => downloadStudentPDF(workbookId!)}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Student Copy
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                if (workbookId) downloadTeacherPDF(workbookId);
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Print Teacher Copy
            </Button>
          </div>

          {/* Generate another */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                setWorkbookId(null);
                setStatusMessage("");
                setClarification(null);
                setApiError(null);
                setRateLimit(null);
              }}
              className="text-sm"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Generate Another Workbook
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Outer page component (Suspense boundary for useSearchParams)
// ---------------------------------------------------------------------------
export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <GeneratePageContent />
    </Suspense>
  );
}
