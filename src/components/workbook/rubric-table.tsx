import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RubricOutput } from "@/types";

interface RubricTableProps {
  rubric: RubricOutput[];
}

export function RubricTable({ rubric }: RubricTableProps) {
  if (rubric.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Grading Rubric</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {rubric.map((criterion) => (
            <div key={criterion.criteria} className="mb-6 last:mb-0">
              <h4 className="mb-2 text-base font-semibold text-foreground">
                {criterion.criteria}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (max {criterion.maxScore} points)
                </span>
              </h4>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Score
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {criterion.scoreLevels.map((level) => (
                    <tr
                      key={level.score}
                      className="border-b transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {level.score}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {level.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
