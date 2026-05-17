/**
 * GET /api/usage
 *
 * Returns the current user's usage statistics:
 *   - workbooks generated this month
 *   - plan limits
 *   - total generations
 *   - estimated cost this month
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { db } from '@/lib/db';
import { workbooks, generationLogs, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { apiSuccess, apiError, ErrorCode } from '@/lib/api-response';
import { isSupabaseConfigured, APP_ORIGIN } from '@/lib/env';
import { applySecurityHeaders, applyCORS } from '@/lib/security';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/usage');
const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000000';

async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured && process.env.NODE_ENV === 'development') return DEV_USER_ID;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch { return null; }
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  applyCORS(response, origin, APP_ORIGIN);
  applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartISO = monthStart.toISOString();

  try {
    // Plan info
    const userRow = await db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const plan = userRow[0]?.plan ?? 'free';
    const planLimits: Record<string, number | null> = {
      free: 3,
      pro: null, // unlimited
      school: null,
      district: null,
    };

    // This month's workbook count
    const countRow = await db
      .select({ count: sql<number>`count(*)` })
      .from(workbooks)
      .where(
        and(
          eq(workbooks.userId, userId),
          sql`${workbooks.createdAt} >= ${monthStartISO}`
        )
      );

    // Total workbooks
    const totalRow = await db
      .select({ count: sql<number>`count(*)` })
      .from(workbooks)
      .where(eq(workbooks.userId, userId));

    // This month's cost
    const costRow = await db
      .select({ totalCost: sql<number>`COALESCE(SUM(${generationLogs.cost}), 0)` })
      .from(generationLogs)
      .innerJoin(workbooks, eq(generationLogs.workbookId, workbooks.id))
      .where(
        and(
          eq(workbooks.userId, userId),
          sql`${generationLogs.createdAt} >= ${monthStartISO}`
        )
      );

    const thisMonth = countRow[0]?.count ?? 0;
    const total = totalRow[0]?.count ?? 0;
    const monthlyCost = Math.round((costRow[0]?.totalCost ?? 0) * 100) / 100;
    const limit = planLimits[plan];
    const remaining = limit === null ? 'Unlimited' : Math.max(0, limit - thisMonth);
    const usagePercent = limit === null ? 0 : Math.min(100, Math.round((thisMonth / limit) * 100));

    const response = apiSuccess({
      plan,
      usage: {
        thisMonth,
        total,
        limit,
        remaining,
        usagePercent,
        monthlyCost,
      },
    });

    applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
    return response;
  } catch (err) {
    logger.error('Usage fetch failed', { error: err instanceof Error ? err.message : String(err), userId });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch usage.', 500);
  }
}
