/**
 * Confidence Summary — Post-generation quality overview
 *
 * Shows aggregate confidence breakdown per workbook
 * (e.g. 18 high / 2 medium / 0 low) with colored indicators.
 *
 * DESIGN.html §3.3: Confidence markers on all outputs
 */

import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Confidence } from '@/types';

interface ConfidenceSummaryProps {
  counts: Record<Confidence, number>;
  className?: string;
}

export function ConfidenceSummary({ counts, className = '' }: ConfidenceSummaryProps) {
  const total = (counts.high || 0) + (counts.medium || 0) + (counts.low || 0);
  if (total === 0) return null;

  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      <div className="flex items-center gap-1.5" title="High confidence — ready to use">
        <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
        <span className="font-medium text-green-700 dark:text-green-400">{counts.high || 0}</span>
        <span className="text-muted-foreground">high</span>
      </div>
      <div className="flex items-center gap-1.5" title="Medium confidence — teacher should review">
        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
        <span className="font-medium text-amber-700 dark:text-amber-400">{counts.medium || 0}</span>
        <span className="text-muted-foreground">medium</span>
      </div>
      <div className="flex items-center gap-1.5" title="Low confidence — requires teacher attention">
        <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
        <span className="font-medium text-red-700 dark:text-red-400">{counts.low || 0}</span>
        <span className="text-muted-foreground">low</span>
      </div>
    </div>
  );
}
