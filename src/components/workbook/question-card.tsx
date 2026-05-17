"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIBadge } from "./ai-badge";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import type { QuestionOutput } from "@/types";

interface QuestionCardProps {
  question: QuestionOutput;
  questionNumber: number;
  showAnswers: boolean;
  children?: React.ReactNode;
}

const typeLabels: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  fill_blank: "Fill in the Blank",
  short_answer: "Short Answer",
  essay: "Essay",
  matching: "Matching",
};

const difficultyColors: Record<string, string> = {
  basic: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  grade_level: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  advanced: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

export function QuestionCard({
  question,
  questionNumber,
  showAnswers,
  children,
}: QuestionCardProps) {
  return (
    <Card className="question-card relative border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        {/* Question header */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {questionNumber}
          </span>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <AIBadge />
          <Badge variant="secondary" className="text-xs">
            {typeLabels[question.type] ?? question.type}
          </Badge>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <Badge
            variant="outline"
            className={cn("text-xs", difficultyColors[question.difficulty])}
          >
            {question.difficulty.replace(/_/g, " ")}
          </Badge>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <span className="text-xs font-medium text-muted-foreground">
            {question.points} pt{question.points !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Question text */}
        <div className="flex gap-3">
          <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
          <p className="text-sm leading-relaxed text-foreground">
            {question.questionText}
          </p>
        </div>

        {/* Student answer area */}
        {!showAnswers && (
          <div className="mt-5 space-y-2 rounded-xl bg-muted/40 p-5">
            {question.type === "multiple_choice" && question.options && (
              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <label
                      key={i}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-background"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-xs font-medium text-muted-foreground">
                        {letter}
                      </span>
                      <span>{opt.replace(/^[A-D]\) /, "")}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {question.type === "true_false" && (
              <div className="flex gap-8">
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm transition-colors hover:bg-background">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-muted-foreground/30 text-xs font-bold text-muted-foreground">
                    T
                  </span>
                  True
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm transition-colors hover:bg-background">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-muted-foreground/30 text-xs font-bold text-muted-foreground">
                    F
                  </span>
                  False
                </label>
              </div>
            )}

            {question.type === "fill_blank" && (
              <div>
                <input
                  type="text"
                  className="w-full border-b-2 border-muted-foreground/30 bg-transparent pb-2 text-sm outline-none transition-colors focus:border-indigo-500"
                  placeholder="Type your answer..."
                  readOnly
                />
              </div>
            )}

            {question.type === "short_answer" && (
              <div>
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none transition-colors focus:border-indigo-500"
                  placeholder="Write your answer..."
                  rows={3}
                  readOnly
                />
              </div>
            )}

            {question.type === "essay" && (
              <div>
                <textarea
                  className="min-h-[150px] w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none transition-colors focus:border-indigo-500"
                  placeholder="Write your essay..."
                  rows={6}
                  readOnly
                />
              </div>
            )}
          </div>
        )}

        {/* Teacher answer area */}
        {showAnswers && children && (
          <div className="mt-4">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
