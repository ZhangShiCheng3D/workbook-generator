/**
 * GET /api/standards/report
 *
 * Returns a standards coverage report for the authenticated user's workbooks.
 * Optional: query param ?subject=math to filter by subject.
 *
 * DESIGN.html §4: Standards coverage report — prove curriculum alignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { db } from '@/lib/db';
import { workbooks, questions } from '@/lib/db/schema';
import { eq, and, not } from 'drizzle-orm';
import { apiSuccess, apiError, ErrorCode } from '@/lib/api-response';
import { isSupabaseConfigured, APP_ORIGIN } from '@/lib/env';
import { applySecurityHeaders } from '@/lib/security';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/standards/report');
const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000000';

async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured && process.env.NODE_ENV === 'development') return DEV_USER_ID;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch { return null; }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);

  const { searchParams } = new URL(request.url);
  const subjectFilter = searchParams.get('subject');

  try {
    const conditions = [eq(workbooks.userId, userId), eq(workbooks.status, 'complete')];
    if (subjectFilter) conditions.push(eq(workbooks.subject, subjectFilter as any));

    const wbRows = await db.select({ id: workbooks.id, title: workbooks.title, subject: workbooks.subject, gradeLevel: workbooks.gradeLevel })
      .from(workbooks).where(and(...conditions));

    // Collect all standard codes from questions
    const standardMap = new Map<string, { code: string; workbooks: string[]; count: number }>();
    for (const wb of wbRows) {
      const qRows = await db.select({ standardCode: questions.standardCode })
        .from(questions)
        .where(and(eq(questions.workbookId, wb.id), not(eq(questions.standardCode, ''))));

      for (const q of qRows) {
        if (!q.standardCode) continue;
        const existing = standardMap.get(q.standardCode);
        if (existing) {
          existing.count++;
          if (!existing.workbooks.includes(wb.title)) existing.workbooks.push(wb.title);
        } else {
          standardMap.set(q.standardCode, { code: q.standardCode, workbooks: [wb.title], count: 1 });
        }
      }
    }

    const coverage = Array.from(standardMap.values()).sort((a, b) => b.count - a.count);
    const response = apiSuccess({
      totalWorkbooks: wbRows.length,
      totalStandardsCovered: coverage.length,
      coverage,
    });
    applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
    return response;
  } catch (err) {
    logger.error('Standards report failed', { error: err instanceof Error ? err.message : String(err), userId });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to generate standards report.', 500);
  }
}
