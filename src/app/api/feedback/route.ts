/**
 * POST /api/feedback  — Submit question feedback (thumbs up/down)
 * GET  /api/feedback?question_id=xxx  — Get feedback for a question
 *
 * Uses the question_feedback table for lightweight QA signals.
 * DESIGN.html §10: API Design — feedback collection for quality improvement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { db } from '@/lib/db';
import { questionFeedback } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 } from 'uuid';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeAndTruncate } from '@/lib/sanitize';
import { apiSuccess, apiError, ErrorCode } from '@/lib/api-response';
import { isSupabaseConfigured, APP_ORIGIN } from '@/lib/env';
import { applyCORS, applySecurityHeaders } from '@/lib/security';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/feedback');
const RATE_LIMIT = { windowMs: 60_000, max: 60 };
const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000000';

async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured && process.env.NODE_ENV === 'development') return DEV_USER_ID;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch (err) {
    logger.error('Auth error', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// ---------------------------------------------------------------------------
// OPTIONS
// ---------------------------------------------------------------------------

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  applyCORS(response, origin, APP_ORIGIN);
  applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
  return response;
}

// ---------------------------------------------------------------------------
// GET — Retrieve feedback for a question
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rlResult = rateLimit(request, RATE_LIMIT);
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('question_id');

  if (!questionId) {
    return apiError(ErrorCode.BAD_REQUEST, '"question_id" query parameter is required.', 400);
  }

  try {
    const rows = await db
      .select()
      .from(questionFeedback)
      .where(eq(questionFeedback.questionId, questionId))
      .orderBy(desc(questionFeedback.createdAt))
      .limit(50);

    const response = apiSuccess({ feedback: rows, total: rows.length });
    applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
    return response;
  } catch (err) {
    logger.error('Failed to fetch feedback', { error: err instanceof Error ? err.message : String(err), questionId });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch feedback.', 500);
  }
}

// ---------------------------------------------------------------------------
// POST — Submit feedback (rating + optional reason)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rlResult = rateLimit(request, RATE_LIMIT);
  if (!rlResult.success) {
    return apiError(ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many requests.', 429);
  }

  const userId = await getUserId();
  if (!userId) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
  }

  let body: { questionId?: string; rating?: number; reason?: string; comment?: string };
  try {
    body = await request.json();
  } catch {
    return apiError(ErrorCode.BAD_REQUEST, 'Invalid JSON body.', 400);
  }

  const questionId = body.questionId ?? '';
  const rating = typeof body.rating === 'number' ? body.rating : null;

  if (!questionId) {
    return apiError(ErrorCode.VALIDATION_ERROR, '"questionId" is required.', 400);
  }
  if (rating !== 1 && rating !== -1) {
    return apiError(ErrorCode.VALIDATION_ERROR, '"rating" must be 1 (thumbs up) or -1 (thumbs down).', 400);
  }

  try {
    await db.insert(questionFeedback).values({
      id: v4(),
      questionId: sanitizeAndTruncate(questionId, 100),
      userId,
      rating,
      reason: body.reason ? sanitizeAndTruncate(body.reason, 200) : null,
      comment: body.comment ? sanitizeAndTruncate(body.comment, 1000) : null,
      createdAt: new Date().toISOString(),
    });

    logger.info('Feedback submitted', { questionId, userId, rating });

    const response = apiSuccess({ submitted: true }, 201);
    applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
    return response;
  } catch (err) {
    logger.error('Failed to submit feedback', { error: err instanceof Error ? err.message : String(err), questionId });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to submit feedback.', 500);
  }
}
