import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// PageLoading — full-page centered spinner with customizable message
// ---------------------------------------------------------------------------

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = "Loading..." }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardSkeleton — mimics a workbook card shape while data loads
// ---------------------------------------------------------------------------

export function CardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-3 p-6">
        {/* Title line */}
        <Skeleton className="h-4 w-3/4" />
        {/* Badge row */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        {/* Meta lines */}
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CardSkeletonGrid — renders a responsive grid of CardSkeletons
// ---------------------------------------------------------------------------

interface CardSkeletonGridProps {
  /** Number of skeleton cards to render. Default: 4 */
  count?: number;
}

export function CardSkeletonGrid({ count = 4 }: CardSkeletonGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionSkeleton — mimics a streaming question card during generation
// ---------------------------------------------------------------------------

export function QuestionSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-3 p-6">
        {/* Header row: question number + difficulty badge */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        {/* Question text lines */}
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        {/* Answer options */}
        <div className="mt-2 space-y-2">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// QuestionSkeletonList — renders multiple QuestionSkeletons for streaming
// ---------------------------------------------------------------------------

interface QuestionSkeletonListProps {
  /** Number of skeleton question cards to render. Default: 3 */
  count?: number;
}

export function QuestionSkeletonList({ count = 3 }: QuestionSkeletonListProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <QuestionSkeleton key={i} />
      ))}
    </div>
  );
}
