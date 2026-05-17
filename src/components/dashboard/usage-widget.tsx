/**
 * Usage Widget — Shows current month's quota on dashboard
 *
 * Free plan: progress bar showing 3/month limit
 * Pro/School/District: "Unlimited" indicator
 *
 * DESIGN.html §16: Usage tracking
 */

'use client';

import { useEffect, useState } from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notify } from '@/lib/toast';

interface UsageData {
  plan: string;
  usage: {
    thisMonth: number;
    total: number;
    limit: number | null;
    remaining: number | string;
    usagePercent: number;
    monthlyCost: number;
  };
}

export function UsageWidget() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setData(body.data);
      })
      .catch(() => { notify.error('Failed to load usage'); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Usage</CardTitle></CardHeader>
        <CardContent><div className="h-4 w-24 animate-pulse rounded bg-muted" /></CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { plan, usage } = data;
  const isUnlimited = usage.limit === null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          <BarChart3 className="mr-2 inline-block h-4 w-4 text-muted-foreground" />
          Usage
        </CardTitle>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">{usage.thisMonth}</span>
          <span className="text-xs text-muted-foreground">
            {isUnlimited ? 'Unlimited' : `of ${usage.limit} this month`}
          </span>
        </div>

        {!isUnlimited && (
          <div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={`h-2 rounded-full transition-all ${usage.usagePercent >= 90 ? 'bg-red-500' : usage.usagePercent >= 65 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(usage.usagePercent, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {usage.remaining} remaining
              {usage.usagePercent >= 90 && <AlertCircle className="ml-1 inline-block h-3 w-3 text-red-500" />}
            </p>
          </div>
        )}

        {isUnlimited && (
          <p className="text-xs text-muted-foreground">
            Total: {usage.total} workbooks · Cost: ${usage.monthlyCost.toFixed(2)} this month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
