"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Confidence } from "@/types";

interface ConfidenceDotProps {
  confidence: Confidence;
  showLabel?: boolean;
}

const colorMap: Record<Confidence, string> = {
  high: "bg-emerald-500 dark:bg-emerald-400",
  medium: "bg-amber-500 dark:bg-amber-400",
  low: "bg-red-500 dark:bg-red-400",
};

const labelMap: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const tooltipMap: Record<Confidence, string> = {
  high: "High confidence — AI is very sure this answer and solution are correct. Review recommended but should be accurate.",
  medium: "Medium confidence — AI is reasonably confident. Teacher review recommended before printing.",
  low: "Low confidence — AI is uncertain. Teacher review strongly recommended. Consider editing or regenerating.",
};

export function ConfidenceDot({ confidence, showLabel = true }: ConfidenceDotProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help items-center gap-1">
            <span
              className={cn("inline-block h-2.5 w-2.5 rounded-full", colorMap[confidence])}
              aria-hidden="true"
            />
            {showLabel && (
              <span className="text-xs text-muted-foreground">{labelMap[confidence]}</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs">
          <p>{tooltipMap[confidence]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
