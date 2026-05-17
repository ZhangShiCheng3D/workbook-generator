"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  GraduationCap,
  Clock,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionCard } from "@/components/workbook/question-card";
import { TeacherAnswer } from "@/components/workbook/teacher-answer";
import { RubricTable } from "@/components/workbook/rubric-table";
import { WorkbookActions } from "@/components/workbook/workbook-actions";
import { ConfidenceDot } from "@/components/workbook/confidence-dot";
import { ConfidenceSummary } from "@/components/workbook/confidence-summary";
import {
  downloadStudentPDF,
  downloadTeacherPDF,
  printCurrentPage,
} from "@/lib/pdf/download";
import { notify } from "@/lib/toast";
import type { WorkbookOutput, Subject, Confidence, QuestionWithMeta, RubricWithMeta, WorkbookDetailResponse } from "@/types";

const subjectLabels: Record<Subject, string> = {
  math: "Math",
  ela: "ELA",
  science: "Science",
  social_studies: "Social Studies",
  other: "Other",
};

const subjectBadgeColors: Record<Subject, string> = {
  math: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  ela: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  science: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  social_studies: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkbookViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [workbook, setWorkbook] = useState<WorkbookOutput | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState("student");

  useEffect(() => {
    let cancelled = false;

    async function fetchWorkbook() {
      setLoadState("loading");

      try {
        const response = await fetch(`/api/workbooks/${id}`);

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message = body?.error?.message ?? `Server returned status ${response.status}.`;

          if (!cancelled) {
            setWorkbook(null);
            setLoadState("error");
            setErrorMessage(message);
          }
          return;
        }

        const data: WorkbookDetailResponse = await response.json();

        if (!cancelled) {
          const mapped: WorkbookOutput = {
            title: data.title,
            subject: data.subject as WorkbookOutput["subject"],
            topic: data.topic,
            gradeLevel: data.gradeLevel,
            description: data.description ?? "",
            estimatedTime: data.estimatedTime ?? `${data.questionCount * 1.5} minutes`,
            questions: data.questions.map((q) => ({
              type: q.type as WorkbookOutput["questions"][number]["type"],
              difficulty: q.difficulty as WorkbookOutput["questions"][number]["difficulty"],
              points: q.points,
              questionText: q.questionText,
              options: q.options,
              correctAnswer: q.correctAnswer,
              solution: q.solution,
              standardCode: q.standardCode,
              confidence: q.confidence as WorkbookOutput["questions"][number]["confidence"],
            })),
            rubric: data.rubric
              ? [
                  {
                    criteria: data.rubric.criteria,
                    maxScore: data.rubric.maxScore,
                    scoreLevels: data.rubric.scoreLevels,
                  },
                ]
              : [],
          };

          setWorkbook(mapped);
          setLoadState("ready");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = "Failed to fetch workbook. Please check your connection and try again.";
          setWorkbook(null);
          setLoadState("error");
          setErrorMessage(message);
        }
      }
    }

    fetchWorkbook();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ---- Loading state (skeleton) ----
  if (loadState === "loading") {
    return (
      <div className="animate-pulse">
        {/* Back link skeleton */}
        <div className="mb-4 h-5 w-24 rounded bg-muted" />

        {/* Header skeleton */}
        <div className="mb-6 space-y-3">
          <div className="h-8 w-2/3 rounded bg-muted" />
          <div className="flex gap-3">
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="h-6 w-16 rounded-full bg-muted" />
            <div className="h-6 w-24 rounded-full bg-muted" />
          </div>
          <div className="h-4 w-1/3 rounded bg-muted" />
        </div>

        {/* Actions skeleton */}
        <div className="mb-8 flex gap-3">
          <div className="h-10 w-36 rounded-lg bg-muted" />
          <div className="h-10 w-36 rounded-lg bg-muted" />
        </div>

        {/* Tabs skeleton */}
        <div className="mb-6 flex gap-2 border-b pb-2">
          <div className="h-9 w-28 rounded-md bg-muted" />
          <div className="h-9 w-28 rounded-md bg-muted" />
        </div>

        {/* Question cards skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-5 w-10 rounded bg-muted" />
                <div className="h-5 w-24 rounded bg-muted" />
                <div className="h-5 w-12 rounded bg-muted" />
              </div>
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="mt-3 space-y-2 pl-4">
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Not found ----
  if (!workbook) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Workbook not found</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The workbook you are looking for does not exist or has been deleted.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Back to My Workbooks
        </Link>
      </div>
    );
  }

  const confidenceCounts = workbook.questions.reduce(
    (acc, q) => {
      acc[q.confidence] = (acc[q.confidence] || 0) + 1;
      return acc;
    },
    {} as Record<Confidence, number>
  );

  const totalPoints = workbook.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div>
      {/* API error notice (non-blocking) */}
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mr-2 inline-block h-4 w-4" />
          API unavailable — showing demo data. ({errorMessage})
        </div>
      )}

      {/* Back link */}
      <Link
        href="/dashboard"
        className="no-print mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Workbooks
      </Link>

      {/* Workbook header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {workbook.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {workbook.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className={subjectBadgeColors[workbook.subject]}>
                {subjectLabels[workbook.subject]}
              </Badge>
              <Badge variant="outline">
                <GraduationCap className="mr-1 h-3 w-3" />
                Grade {workbook.gradeLevel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {workbook.questions.length} questions
              </span>
              <span className="text-sm text-muted-foreground">&middot;</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {workbook.estimatedTime}
              </span>
              <span className="text-sm text-muted-foreground">&middot;</span>
              <span className="text-sm text-muted-foreground">
                {totalPoints} total points
              </span>
            </div>
            {/* Confidence summary */}
            <div className="mt-3">
              <ConfidenceSummary counts={confidenceCounts} />
            </div>
          </div>

          {/* Action bar - sticky on scroll */}
          <div className="no-print workbook-actions shrink-0">
            <WorkbookActions
              workbookId={id}
              onDownloadStudent={() => {
                downloadStudentPDF(id);
                notify.success("Student Copy PDF opened for printing");
              }}
              onDownloadTeacher={() => {
                downloadTeacherPDF(id);
                notify.success("Teacher Copy PDF opened for printing");
              }}
              onPrint={() => {
                printCurrentPage();
                notify.info("Print dialog opened");
              }}
              onCreateVariant={(type) => {
                const variantLabel = { ell: 'ELL-Friendly', iep: 'IEP Support', advanced: 'Advanced Enrichment' }[type];
                notify.info(`Generating ${variantLabel} variant... Open the Generate page to see progress.`);
                window.open(`/dashboard/generate?variant_of=${id}&variant_type=${type}`, '_blank');
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b">
          <TabsList className="h-auto w-full justify-start gap-4 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="student"
              className="relative h-10 rounded-none border-b-2 border-transparent px-3 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:border-indigo-600 data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
            >
              <Eye className="mr-1.5 h-4 w-4" />
              Student Copy
            </TabsTrigger>
            <TabsTrigger
              value="teacher"
              className="relative h-10 rounded-none border-b-2 border-transparent px-3 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:border-indigo-600 data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
            >
              <EyeOff className="mr-1.5 h-4 w-4" />
              Teacher Copy
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="student" className="mt-6 space-y-5">
          {workbook.questions.map((q, i) => (
            <QuestionCard
              key={i}
              question={q}
              questionNumber={i + 1}
              showAnswers={false}
            />
          ))}
        </TabsContent>

        <TabsContent value="teacher" className="mt-6 space-y-5">
          {workbook.questions.map((q, i) => (
            <QuestionCard
              key={i}
              question={q}
              questionNumber={i + 1}
              showAnswers={true}
            >
              <TeacherAnswer question={q} questionNumber={i + 1} />
            </QuestionCard>
          ))}
          {workbook.rubric.length > 0 && (
            <div className="mt-8">
              <RubricTable rubric={workbook.rubric} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
