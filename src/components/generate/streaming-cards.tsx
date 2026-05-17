"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "./confidence-badge";
import { cn } from "@/lib/utils";
import type { QuestionOutput } from "@/types";

interface StreamingCardsProps {
  questions: QuestionOutput[];
  isStreaming: boolean;
  totalExpected: number;
}

const questionTypeLabels: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  fill_blank: "Fill in the Blank",
  short_answer: "Short Answer",
  essay: "Essay",
  matching: "Matching",
};

export function StreamingCards({
  questions,
  isStreaming,
  totalExpected,
}: StreamingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest question card when streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      const cards = containerRef.current.querySelectorAll(".question-card");
      if (cards.length > 0) {
        const lastCard = cards[cards.length - 1];
        lastCard.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [questions.length, isStreaming]);

  if (questions.length === 0 && !isStreaming) {
    return null;
  }

  const currentCount = questions.length;
  const progressPercent = totalExpected > 0
    ? Math.round((currentCount / totalExpected) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {isStreaming ? "Generating Workbook..." : "Workbook Questions"}
        </h3>
        <span className="text-sm tabular-nums text-muted-foreground">
          {currentCount}
          {totalExpected > 0 && ` / ${totalExpected}`} questions
        </span>
      </div>

      {/* Progress bar */}
      {totalExpected > 0 && (
        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                isStreaming
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 animate-pulse"
                  : "bg-indigo-600"
              )}
              style={{ width: `${Math.max(progressPercent, 2)}%` }}
            />
          </div>
          {isStreaming && (
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              {progressPercent}% complete
            </p>
          )}
        </div>
      )}

      {/* Question cards */}
      <div ref={containerRef} className="grid gap-3">
        {questions.map((question, index) => (
          <Card
            key={index}
            className={cn(
              "question-card transition-all duration-300",
              "animate-in fade-in-0 slide-in-from-bottom-2"
            )}
            style={{
              animationDelay: isStreaming && index === questions.length - 1
                ? "0ms"
                : `${index * 50}ms`,
              animationFillMode: "backwards",
            }}
          >
            <CardContent className="p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {index + 1}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {questionTypeLabels[question.type] ?? question.type}
                </Badge>
                <ConfidenceBadge confidence={question.confidence} size="sm" />
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {question.questionText}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Skeleton placeholders for expected remaining questions */}
        {isStreaming &&
          totalExpected > questions.length &&
          Array.from({
            length: Math.min(totalExpected - questions.length, 5),
          }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="opacity-40">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-400" />
          Generating question {currentCount + 1}
          {totalExpected > 0 && ` of ${totalExpected}`}...
        </div>
      )}

      {/* Completed indicator */}
      {!isStreaming && questions.length > 0 && totalExpected > 0 && questions.length >= totalExpected && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          All {totalExpected} questions generated
        </div>
      )}
    </div>
  );
}
