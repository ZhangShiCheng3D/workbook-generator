import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "./confidence-badge";
import type { ParseResult as ParseResultType, Subject } from "@/types";

const subjectLabels: Record<Subject, string> = {
  math: "Math",
  ela: "ELA",
  science: "Science",
  social_studies: "Social Studies",
  other: "Other",
};

interface ParseResultProps {
  result: ParseResultType;
}

export function ParseResultDisplay({ result }: ParseResultProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        AI Analysis
      </h3>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {subjectLabels[result.subject]}
        </Badge>

        <span className="text-sm text-muted-foreground">&middot;</span>

        <Badge variant="outline" className="text-xs">
          {result.gradeLevel}
        </Badge>

        <span className="text-sm text-muted-foreground">&middot;</span>

        <Badge variant="outline" className="text-xs">
          {result.questionCount} questions
        </Badge>

        {result.questionTypes.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground">&middot;</span>
            {result.questionTypes.map((type) => (
              <Badge key={type} variant="outline" className="text-xs capitalize">
                {type.replace(/_/g, " ")}
              </Badge>
            ))}
          </>
        )}

        <span className="text-sm text-muted-foreground">&middot;</span>
        <ConfidenceBadge confidence={result.confidence} size="sm" />
      </div>

      {result.needsClarification && result.clarificationQuestion && (
        <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span className="font-medium">Clarification needed:</span>{" "}
          {result.clarificationQuestion}
        </div>
      )}
    </div>
  );
}
