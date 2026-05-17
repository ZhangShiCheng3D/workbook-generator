import Link from "next/link";
import { FileText, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Subject } from "@/types";

const subjectBadge: Record<Subject, string> = {
  math: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ela: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  science: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  social_studies: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const subjectBorder: Record<Subject, string> = {
  math: "border-l-blue-500 dark:border-l-blue-400",
  ela: "border-l-emerald-500 dark:border-l-emerald-400",
  science: "border-l-amber-500 dark:border-l-amber-400",
  social_studies: "border-l-purple-500 dark:border-l-purple-400",
  other: "border-l-gray-500 dark:border-l-gray-400",
};

const subjectLabels: Record<Subject, string> = {
  math: "Math",
  ela: "ELA",
  science: "Science",
  social_studies: "Social Studies",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  generating: "Generating...",
  complete: "Complete",
  error: "Error",
};

const statusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  generating: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  complete: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  error: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

interface WorkbookCardProps {
  id: string;
  title: string;
  subject: Subject;
  gradeLevel: string;
  questionCount: number;
  estimatedTime: string;
  createdAt: string;
  status: string;
}

export function WorkbookCard({
  id,
  title,
  subject,
  gradeLevel,
  questionCount,
  estimatedTime,
  createdAt,
  status,
}: WorkbookCardProps) {
  const dateLabel = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/dashboard/workbook/${id}`}
      className="group block focus-visible:outline-none"
    >
      <Card
        className={`h-full border-l-4 ${subjectBorder[subject] ?? "border-l-gray-500"} transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-indigo-500`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base font-semibold">
              {title}
            </CardTitle>
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
          <CardDescription className="flex items-center gap-2 pt-1.5">
            <Badge
              className={`shrink-0 border-0 ${statusBadge[status] ?? statusBadge.draft}`}
            >
              {statusLabels[status] ?? status}
            </Badge>
            <Badge
              variant="outline"
              className={`shrink-0 ${subjectBadge[subject] ?? ""}`}
            >
              {subjectLabels[subject] ?? subject}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Grade {gradeLevel}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{questionCount} question{questionCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {estimatedTime}
            </span>
            <span>{dateLabel}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
