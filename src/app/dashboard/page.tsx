"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkbookCard } from "@/components/dashboard/workbook-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { UsageWidget } from "@/components/dashboard/usage-widget";
import { notify } from "@/lib/toast";
import type { Subject, WorkbookSummary } from "@/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "data"; workbooks: WorkbookSummary[] };

/** Skeleton card shown while data loads */
function SkeletonCard() {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function fetchWorkbooks() {
      try {
        const response = await fetch("/api/workbooks?limit=50");

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message =
            body?.error?.message ?? `Server returned status ${response.status}.`;
          if (!cancelled) {
            setLoadState({ kind: "error", message });
          }
          return;
        }

        const body = await response.json();
        const workbooks: WorkbookSummary[] = body.data ?? [];

        if (!cancelled) {
          if (workbooks.length === 0) {
            setLoadState({ kind: "empty" });
          } else {
            setLoadState({ kind: "data", workbooks });
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to fetch workbooks.";
          setLoadState({ kind: "error", message });
        }
      }
    }

    fetchWorkbooks();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Placeholder delete handler — wired when delete UI is added to workbook cards */
  const handleDelete = async (workbookId: string) => {
    try {
      const response = await fetch(`/api/workbooks/${workbookId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Delete failed (status ${response.status})`);
      }
      notify.success("Workbook deleted");
      // Refresh the workbook list
      setLoadState({ kind: "loading" });
      window.location.reload();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete workbook.";
      notify.error(message);
    }
  };

  const workbooks = loadState.kind === "data" ? loadState.workbooks : [];
  const hasWorkbooks = loadState.kind === "data" && workbooks.length > 0;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loadState.kind === "loading" && <p className="text-sm text-muted-foreground">Loading your workbooks...</p>}
          {loadState.kind === "error" && <p className="text-sm text-red-600 dark:text-red-400">Could not load workbooks</p>}
          {hasWorkbooks && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{workbooks.length}</span> workbook{workbooks.length !== 1 ? "s" : ""} generated</p>}
          {loadState.kind === "empty" && <p className="text-sm text-muted-foreground">Generate your first workbook</p>}
        </div>
        <UsageWidget />
      </div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          {loadState.kind === "loading" && (
            <p className="text-sm text-muted-foreground">Loading your workbooks...</p>
          )}
          {loadState.kind === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">Could not load workbooks</p>
          )}
          {hasWorkbooks && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{workbooks.length}</span>{" "}
              workbook{workbooks.length !== 1 ? "s" : ""} generated
            </p>
          )}
          {loadState.kind === "empty" && (
            <p className="text-sm text-muted-foreground">Generate your first workbook</p>
          )}
        </div>
        <Button render={<Link href="/dashboard/generate" />} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Generate New
        </Button>
      </div>

      {/* Content area */}
      {loadState.kind === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {loadState.kind === "error" && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {loadState.message}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setLoadState({ kind: "loading" });
              // Re-trigger fetch by remounting the effect
              window.location.reload();
            }}
          >
            Try Again
          </Button>
        </div>
      )}

      {loadState.kind === "empty" && <EmptyState />}

      {hasWorkbooks && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {workbooks.map((wb) => (
            <WorkbookCard
              key={wb.id}
              id={wb.id}
              title={wb.title}
              subject={wb.subject as Subject}
              gradeLevel={wb.gradeLevel}
              questionCount={wb.questionCount}
              estimatedTime={wb.estimatedTime ?? "~15 min"}
              createdAt={wb.createdAt}
              status={wb.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
