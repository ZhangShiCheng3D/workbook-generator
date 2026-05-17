import { cn } from "@/lib/utils";
import type { Confidence } from "@/types";

interface ConfidenceBadgeProps {
  confidence: Confidence;
  size?: "sm" | "md";
}

const config: Record<Confidence, { label: string; className: string }> = {
  high: {
    label: "High Confidence",
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  medium: {
    label: "Medium Confidence",
    className:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  low: {
    label: "Low Confidence",
    className:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  },
};

export function ConfidenceBadge({ confidence, size = "md" }: ConfidenceBadgeProps) {
  const { label, className } = config[confidence];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        size === "sm" && "px-2 py-0 text-[10px]",
        className
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          confidence === "high" && "bg-emerald-600 dark:bg-emerald-400",
          confidence === "medium" && "bg-amber-600 dark:bg-amber-400",
          confidence === "low" && "bg-red-600 dark:bg-red-400"
        )}
      />
      {label}
    </span>
  );
}
