"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, BookOpen, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const quickStartSuggestions = [
  {
    label: "Fractions for 4th Grade",
    href: "/dashboard/generate?topic=fractions%20adding%20subtracting%204th%20grade",
  },
  {
    label: "Multiplication Tables G3",
    href: "/dashboard/generate?topic=multiplication%20tables%20up%20to%2012%203rd%20grade",
  },
  {
    label: "Photosynthesis Quiz G7",
    href: "/dashboard/generate?topic=photosynthesis%20process%20steps%207th%20grade%20science",
  },
  {
    label: "Reading Comprehension G5",
    href: "/dashboard/generate?topic=reading%20comprehension%20short%20passages%205th%20grade",
  },
  {
    label: "Decimal Operations G5",
    href: "/dashboard/generate?topic=decimal%20operations%20add%20subtract%20multiply%205th%20grade",
  },
  {
    label: "Civil War Causes G8",
    href: "/dashboard/generate?topic=causes%20of%20the%20US%20Civil%20War%208th%20grade",
  },
];

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Illustration area */}
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        {/* Decorative rings */}
        <div className="absolute inset-0 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30" />
        <div className="absolute -inset-1 animate-pulse rounded-3xl bg-indigo-50 dark:bg-indigo-900/10" />
        {/* Icon stack */}
        <div className="relative flex flex-col items-center gap-0.5">
          <BookOpen className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          <FileText className="h-6 w-6 text-indigo-400 dark:text-indigo-300" />
        </div>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Create Your First Workbook
      </h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        Generate a complete printable practice pack in 90 seconds. Just describe
        what you need and the AI handles subject, grade level, and question
        design automatically.
      </p>

      <Button
        render={<Link href="/dashboard/generate" />}
        size="lg"
        className="mt-8 h-12 px-8"
      >
        <Lightbulb className="mr-2 h-5 w-5" />
        Generate Your First Workbook
      </Button>

      {/* Quick-start suggestions */}
      <div className="mt-10 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Try these ideas
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {quickStartSuggestions.map((suggestion) => (
            <Link
              key={suggestion.label}
              href={suggestion.href}
              className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              {suggestion.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
