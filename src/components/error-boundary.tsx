"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback UI. Overrides the default branded fallback. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary that catches render-phase errors in the component tree.
 * Shows a polished fallback with "Try Again" and "Go Home" actions.
 *
 * Logs the error and component stack to the console for debugging.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      "[ErrorBoundary] Caught render error:",
      error.message,
      "\nComponent stack:",
      errorInfo.componentStack ?? "(not available)"
    );
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV === "development";

      return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <Card className="w-full max-w-md border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              {/* Warning icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold text-foreground">
                Something went wrong
              </h2>

              {/* Error message */}
              <p className="max-w-sm text-sm text-muted-foreground">
                {isDev
                  ? this.state.error?.message ?? "An unexpected error occurred"
                  : "An unexpected error occurred. Please try again or return to the home page."}
              </p>

              {/* Dev-only: full error stack */}
              {isDev && this.state.error?.stack && (
                <pre className="max-h-32 w-full overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-muted-foreground">
                  {this.state.error.stack}
                </pre>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={this.handleReset}
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
      );
    }

    return this.props.children;
  }
}
