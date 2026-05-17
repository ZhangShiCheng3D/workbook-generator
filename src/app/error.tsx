"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js App Router global error boundary.
 * Catches errors in layouts, templates, and pages within the segment.
 *
 * Shows different messages for development vs production environments.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    console.error(
      "[GlobalError] Unhandled error caught by Next.js error boundary:",
      error.message,
      error.digest ? `(digest: ${error.digest})` : ""
    );
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              {/* Warning icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold text-foreground">
                {isDev ? "Application Error" : "Something went wrong"}
              </h2>

              {/* Message */}
              <p className="max-w-sm text-sm text-muted-foreground">
                {isDev
                  ? error.message || "An unexpected error occurred."
                  : "We encountered an unexpected error. Our team has been notified. Please try again."}
              </p>

              {/* Dev-only: digest for debugging */}
              {isDev && error.digest && (
                <p className="font-mono text-xs text-muted-foreground">
                  Digest: {error.digest}
                </p>
              )}

              {/* Dev-only: full error stack */}
              {isDev && error.stack && (
                <pre className="max-h-40 w-full overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-muted-foreground">
                  {error.stack}
                </pre>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => reset()}
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/" />}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
