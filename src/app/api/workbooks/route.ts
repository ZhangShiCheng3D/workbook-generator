/**
 * GET  /api/workbooks  — List current user's workbooks
 * POST /api/workbooks  — Create workbook metadata manually
 *
 * All queries scoped by authenticated user ID.
 * Rate limit: 60 requests per 60 seconds per IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { db } from '@/lib/db';
import { workbooks } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { v4 } from 'uuid';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeInput, sanitizeAndTruncate } from '@/lib/sanitize';
import { apiSuccess, apiError, apiPaginated, ErrorCode } from '@/lib/api-response';
import { createLogger } from '@/lib/logger';
import { isSupabaseConfigured, APP_ORIGIN } from '@/lib/env';
import { applyCORS, applySecurityHeaders } from '@/lib/security';
import type { WorkbookSummary } from '@/types';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger('api/workbooks');

// ---------------------------------------------------------------------------
// Rate limit config
// ---------------------------------------------------------------------------

const RATE_LIMIT = { windowMs: 60_000, max: 60 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000000';

async function getUser(_request: NextRequest) {
  if (!isSupabaseConfigured && process.env.NODE_ENV === 'development') {
    return { id: DEV_USER_ID } as { id: string };
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch (err) {
    logger.error('Auth error', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

function applyResponseHeaders(response: NextResponse, rlResult?: ReturnType<typeof rateLimit>): void {
  if (rlResult) {
    response.headers.set('X-RateLimit-Remaining', String(rlResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rlResult.reset));
  }
  applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
}

// ---------------------------------------------------------------------------
// OPTIONS — CORS preflight
// ---------------------------------------------------------------------------

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  applyCORS(response, origin, APP_ORIGIN);
  applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
  return response;
}

// ---------------------------------------------------------------------------
// GET — List workbooks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ---- Rate limit ----
  const rlResult = rateLimit(request, RATE_LIMIT);
  if (!rlResult.success) {
    const retryAfter = Math.max(1, rlResult.reset - Math.ceil(Date.now() / 1000));
    const response = apiError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please try again later.',
      429,
      { retryAfter }
    );
    response.headers.set('Retry-After', String(retryAfter));
    applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
    return response;
  }

  // ---- Auth ----
  const user = await getUser(request);
  if (!user) {
    const response = apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
    applyResponseHeaders(response, rlResult);
    return response;
  }

  // ---- Validate query params ----
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 1), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);
  const statusFilter = searchParams.get('status');

  try {
    const conditions = [eq(workbooks.userId, user.id)];

    if (statusFilter && ['draft', 'generating', 'complete', 'error'].includes(statusFilter)) {
      conditions.push(eq(workbooks.status, statusFilter as typeof workbooks.$inferSelect.status));
    }

    const rows = await db
      .select()
      .from(workbooks)
      .where(and(...conditions))
      .orderBy(desc(workbooks.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(workbooks)
      .where(and(...conditions));

    const total = countResult[0]?.count ?? 0;

    const summaries: WorkbookSummary[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      subject: row.subject,
      topic: row.topic,
      gradeLevel: row.gradeLevel,
      questionCount: row.questionCount,
      status: row.status,
      description: row.description,
      estimatedTime: row.estimatedTime,
      isEnhanced: row.isEnhanced ?? false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    const response = apiPaginated(summaries, {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
    applyResponseHeaders(response, rlResult);
    return response;
  } catch (err) {
    logger.error('Failed to fetch workbooks', {
      error: err instanceof Error ? err.message : String(err),
      userId: user.id,
    });
    const response = apiError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch workbooks.', 500);
    applyResponseHeaders(response, rlResult);
    return response;
  }
}

// ---------------------------------------------------------------------------
// POST — Create workbook (manual/draft, not via AI generation)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---- Rate limit ----
  const rlResult = rateLimit(request, RATE_LIMIT);
  if (!rlResult.success) {
    const retryAfter = Math.max(1, rlResult.reset - Math.ceil(Date.now() / 1000));
    const response = apiError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please try again later.',
      429,
      { retryAfter }
    );
    response.headers.set('Retry-After', String(retryAfter));
    applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
    return response;
  }

  // ---- Auth ----
  const user = await getUser(request);
  if (!user) {
    const response = apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
    applyResponseHeaders(response, rlResult);
    return response;
  }

  // ---- Parse body ----
  let body: {
    title?: string;
    subject?: string;
    topic?: string;
    gradeLevel?: string;
    questionCount?: number;
  };
  try {
    body = await request.json();
  } catch {
    const response = apiError(ErrorCode.BAD_REQUEST, 'Invalid JSON body.', 400);
    applyResponseHeaders(response, rlResult);
    return response;
  }

  // ---- Sanitize ----
  const cleanedTopic = sanitizeInput(body.topic ?? '');
  if (cleanedTopic.length === 0) {
    const response = apiError(ErrorCode.VALIDATION_ERROR, '"topic" is required.', 400);
    applyResponseHeaders(response, rlResult);
    return response;
  }

  const title = body.title
    ? sanitizeAndTruncate(body.title, 200)
    : cleanedTopic;

  const subject = body.subject
    ? sanitizeAndTruncate(body.subject, 50)
    : 'other';

  const gradeLevel = body.gradeLevel
    ? sanitizeAndTruncate(body.gradeLevel, 20)
    : '';

  const questionCount = Math.min(
    Math.max(typeof body.questionCount === 'number' ? body.questionCount : 20, 1),
    100
  );

  const workbookId = v4();
  const now = new Date().toISOString();

  try {
    await db.insert(workbooks).values({
      id: workbookId,
      userId: user.id,
      title,
      subject: subject as typeof workbooks.$inferInsert.subject,
      topic: cleanedTopic,
      gradeLevel,
      description: null,
      estimatedTime: null,
      questionCount,
      status: 'draft',
      visibility: 'private',
      standardCodes: null,
      isEnhanced: false,
      sourceMaterialName: null,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db
      .select()
      .from(workbooks)
      .where(eq(workbooks.id, workbookId))
      .limit(1);

    if (created.length === 0) {
      const response = apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create workbook.', 500);
      applyResponseHeaders(response, rlResult);
      return response;
    }

    const row = created[0];
    const summary: WorkbookSummary = {
      id: row.id,
      title: row.title,
      subject: row.subject,
      topic: row.topic,
      gradeLevel: row.gradeLevel,
      questionCount: row.questionCount,
      status: row.status,
      description: row.description,
      estimatedTime: row.estimatedTime,
      isEnhanced: row.isEnhanced ?? false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    logger.info('Workbook created', { workbookId, userId: user.id, topic: cleanedTopic });

    const response = apiSuccess({ workbook: summary }, 201);
    applyResponseHeaders(response, rlResult);
    return response;
  } catch (err) {
    logger.error('Failed to create workbook', {
      error: err instanceof Error ? err.message : String(err),
      userId: user.id,
    });
    const response = apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create workbook.', 500);
    applyResponseHeaders(response, rlResult);
    return response;
  }
}
