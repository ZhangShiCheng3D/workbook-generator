/**
 * POST /api/generate
 *
 * SSE streaming endpoint for workbook generation.
 *
 * Request:  { input: string, enhanceMaterial?: string }
 * Response: text/event-stream with typed PipelineEvent objects
 *
 * Rate limit: 10 requests per 60 seconds per IP
 *
 * DESIGN.html §7: Architecture — AI generation pipeline via SSE
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { db } from '@/lib/db';
import { users, workbooks } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { parseInput } from '@/lib/ai/parser';
import { generateWorkbook } from '@/lib/ai/pipeline';
import type { PipelineEvent } from '@/lib/ai/pipeline';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeInput, sanitizeAndTruncate, detectPromptInjection } from '@/lib/sanitize';
import { apiError, ErrorCode } from '@/lib/api-response';
import { createLogger } from '@/lib/logger';
import { isSupabaseConfigured, APP_ORIGIN } from '@/lib/env';
import { applyCORS, applySecurityHeaders } from '@/lib/security';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger('api/generate');

// ---------------------------------------------------------------------------
// Rate limit config
// ---------------------------------------------------------------------------

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sseEncode(event: PipelineEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function sseError(message: string, code?: string): string {
  return sseEncode({ type: 'error', message, code });
}

// ---------------------------------------------------------------------------
// OPTIONS — CORS preflight
// ---------------------------------------------------------------------------

export async function OPTIONS(request: NextRequest): Promise<Response> {
  const origin = request.headers.get('origin');
  const response = new Response(null, { status: 204 });
  applyCORS(response, origin, APP_ORIGIN);
  return response;
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
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
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', String(rlResult.reset));
    return response;
  }

  // ---- Auth ----
  let user: { id: string } | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    } catch (err) {
      logger.error('Auth service unavailable', {
        error: err instanceof Error ? err.message : String(err),
      });
      return apiError(ErrorCode.SERVICE_UNAVAILABLE, 'Authentication service unavailable.', 503);
    }
    if (!user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
    }
  } else if (process.env.NODE_ENV === 'development') {
    // Dev mode: no Supabase configured, use anonymous dev user
    const devUserId = 'dev-user-00000000-0000-0000-0000-000000000000';
    const now = new Date().toISOString();
    try {
      await db.insert(users).values({
        id: devUserId,
        email: 'dev@practicepacks.local',
        name: 'Dev Teacher',
        role: 'teacher',
        plan: 'pro',
        gradeLevels: JSON.stringify(['3', '4', '5']),
        subjects: JSON.stringify(['math']),
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // User already exists — that's fine
    }
    user = { id: devUserId };
  } else {
    return apiError(ErrorCode.SERVICE_UNAVAILABLE, 'Authentication not configured.', 503);
  }

  // ---- Free tier limit check ----
  const FREE_TIER_LIMIT = 3;
  const userRecord = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const userPlan = userRecord[0]?.plan ?? 'free';

  if (userPlan === 'free') {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(workbooks)
      .where(
        and(
          eq(workbooks.userId, user.id),
          sql`${workbooks.createdAt} >= ${monthStart.toISOString()}`
        )
      );

    const thisMonthCount = countResult[0]?.count ?? 0;
    if (thisMonthCount >= FREE_TIER_LIMIT) {
      return apiError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        `Free plan limit reached: ${FREE_TIER_LIMIT} workbooks per month. Upgrade to Pro for unlimited.`,
        429,
        { plan: 'free', monthlyLimit: FREE_TIER_LIMIT, current: thisMonthCount }
      );
    }
  }

  // ---- Parse body ----
  let body: { input?: string; enhanceMaterial?: string };
  try {
    body = await request.json();
  } catch {
    return apiError(ErrorCode.BAD_REQUEST, 'Invalid JSON body.', 400);
  }

  // ---- Sanitize input ----
  const rawInput = body.input ?? '';
  const cleanedInput = sanitizeInput(rawInput);

  if (cleanedInput.length === 0) {
    return apiError(ErrorCode.VALIDATION_ERROR, '"input" is required.', 400);
  }
  if (cleanedInput.length > 2000) {
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      '"input" must be 2000 characters or fewer.',
      400
    );
  }

  const enhanceMaterial = body.enhanceMaterial
    ? sanitizeAndTruncate(body.enhanceMaterial, 1_000_000) // 1MB max for enhanced material
    : undefined;

  // ---- Prompt injection detection ----
  if (detectPromptInjection(cleanedInput)) {
    logger.warn('Prompt injection detected', { userId: user.id, inputPreview: cleanedInput.substring(0, 100) });
    return apiError(ErrorCode.VALIDATION_ERROR, 'Input contains disallowed content. Please rephrase your request.', 400);
  }

  // ---- Parse the teacher input ----
  let parseResult;
  try {
    parseResult = await parseInput(cleanedInput);
  } catch (err) {
    logger.error('AI input parsing failed', {
      error: err instanceof Error ? err.message : String(err),
      userId: user.id,
    });
    return apiError(ErrorCode.PARSE_FAILED, 'Failed to parse input. Please try again.', 500);
  }

  // Low confidence → ask for clarification instead of streaming
  if (parseResult.needsClarification || parseResult.confidence === 'low') {
    return Response.json(
      {
        success: true,
        data: {
          needsClarification: true,
          clarificationQuestion:
            parseResult.clarificationQuestion ??
            'Could you tell me the subject, topic, and grade level for the workbook?',
          parsedPreview: {
            subject: parseResult.subject,
            topic: parseResult.topic,
            gradeLevel: parseResult.gradeLevel || 'unknown',
            questionCount: parseResult.questionCount,
          },
        },
      },
      { status: 200 }
    );
  }

  // ---- Stream generation ----
  logger.info('Starting workbook generation', {
    userId: user.id,
    subject: parseResult.subject,
    topic: parseResult.topic,
    gradeLevel: parseResult.gradeLevel,
    questionCount: parseResult.questionCount,
  });

  const generator = generateWorkbook(parseResult, user.id, enhanceMaterial);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send an initial event with the parse info
        const gradeInfo = parseResult.gradeLevel
          ? `Grade ${parseResult.gradeLevel}`
          : 'grade not specified';
        const initEvent: PipelineEvent = {
          type: 'generating',
          message: `Parsed: ${parseResult.topic} (${parseResult.subject}, ${gradeInfo}, ${parseResult.questionCount} questions)`,
        };
        controller.enqueue(new TextEncoder().encode(sseEncode(initEvent)));

        for await (const event of generator) {
          controller.enqueue(new TextEncoder().encode(sseEncode(event)));

          if (event.type === 'error') {
            logger.warn('Generation stream error event', {
              userId: user!.id,
              errorMessage: event.message,
              code: event.code,
            });
            controller.close();
            return;
          }
          if (event.type === 'complete') {
            logger.info('Workbook generation complete', {
              userId: user!.id,
              workbookId: event.workbookId,
            });
            controller.close();
            return;
          }
        }

        // Generator exhausted without terminal event
        logger.warn('Generation ended unexpectedly', { userId: user!.id });
        controller.enqueue(
          new TextEncoder().encode(sseError('Generation ended unexpectedly.', 'UNEXPECTED_END'))
        );
        controller.close();
      } catch (err) {
        logger.error('Stream error', {
          error: err instanceof Error ? err.message : String(err),
          userId: user!.id,
        });
        try {
          controller.enqueue(new TextEncoder().encode(sseError('Generation failed. Please try again.', 'STREAM_ERROR')));
        } catch {
          /* ignore */
        }
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },

    cancel() {
      logger.info('Client disconnected during generation', { userId: user!.id });
    },
  });

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Remaining': String(rlResult.remaining),
      'X-RateLimit-Reset': String(rlResult.reset),
    },
  });

  // Apply CORS and security headers
  const origin = request.headers.get('origin');
  applyCORS(response, origin, APP_ORIGIN);
  applySecurityHeaders(response, { appOrigin: APP_ORIGIN });

  return response;
}
