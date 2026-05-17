import Link from "next/link";
import { FileSearch, Home, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Global 404 Not Found page for the App Router.
 * Shown when a route does not match any defined page or layout.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {/* Illustration area */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
            <FileSearch className="h-10 w-10 text-indigo-500 dark:text-indigo-400" />
          </div>

          {/* 404 code */}
          <p className="font-mono text-sm font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            404
          </p>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>

          {/* Description */}
          <p className="max-w-sm text-sm text-muted-foreground">
            The page you are looking for does not exist or has been moved.
            Return home or generate a new workbook.
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="default"
              size="sm"
              render={<Link href="/" />}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/dashboard/generate" />}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Generate a Workbook
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
