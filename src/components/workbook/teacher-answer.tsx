"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfidenceDot } from "./confidence-dot";
import type { QuestionOutput } from "@/types";

interface TeacherAnswerProps {
  question: QuestionOutput;
  questionNumber: number;
}

export function TeacherAnswer({ question, questionNumber }: TeacherAnswerProps) {
  const [solutionOpen, setSolutionOpen] = useState(false);

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
      <div className="border-l-4 border-l-emerald-500 dark:border-l-emerald-400 p-4">
        {/* Answer section */}
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Correct Answer
          </h4>
          <p className="text-sm font-semibold text-foreground">
            {question.correctAnswer}
          </p>

          {/* Show all options with correct one highlighted */}
          {question.options && (
            <ul className="mt-2 space-y-0.5">
              {question.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const correctLetter = question.correctAnswer.split(")")[0]?.trim();
                const isCorrect = letter === correctLetter;
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${
                      isCorrect
                        ? "font-semibold text-emerald-700 bg-emerald-100/60 dark:text-emerald-300 dark:bg-emerald-900/30"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                        isCorrect
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {letter}
                    </span>
                    {opt.replace(/^[A-D]\) /, "")}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Solution - collapsible */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setSolutionOpen(!solutionOpen)}
            className="flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            {solutionOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Solution
          </button>
          {solutionOpen && (
            <div className="mt-2 rounded-md bg-muted/50 p-3">
              <p className="text-sm leading-relaxed text-foreground">
                {question.solution}
              </p>
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
          {question.standardCode && (
            <Badge variant="outline" className="text-xs border-emerald-200 dark:border-emerald-800">
              {question.standardCode}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs capitalize">
            {question.difficulty.replace(/_/g, " ")}
          </Badge>
          <ConfidenceDot confidence={question.confidence} />
          <span className="text-xs text-muted-foreground ml-auto">
            {question.points} point{question.points !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
