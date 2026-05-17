/**
 * POST /api/enhance
 *
 * Enhance My Stuff — accepts uploaded materials and AI-enhances them into
 * a complete workbook (Student + Teacher Copy).
 *
 * Request body:
 *   {
 *     input: string (teacher's description of what to do),
 *     material: string (base64 encoded file content),
 *     enhancementOptions?: string[] (e.g. "add_rubric", "add_more_questions", "ell_friendly")
 *   }
 *
 * Response: SSE stream (same format as /api/generate)
 *
 * DESIGN.html §3.2: Enhance My Stuff flow
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { parseInput, reparseWithClarification } from '@/lib/ai/parser';
import { generateWorkbook } from '@/lib/ai/pipeline';
import type { PipelineEvent } from '@/lib/ai/pipeline';
import { rateLimit } from '@/lib/rate-limit';
import {
  sanitizeInput,
  sanitizeAndTruncate,
  detectPromptInjection,
} from '@/lib/sanitize';
import { apiError, ErrorCode } from '@/lib/api-response';
import { createLogger } from '@/lib/logger';
import { isSupabaseConfigured, APP_ORIGIN } from '@/lib/env';
import { applyCORS, applySecurityHeaders } from '@/lib/security';

const logger = createLogger('api/enhance');
const RATE_LIMIT = { windowMs: 120_000, max: 5 }; // Stricter: 5 per 2 min (AI + file processing cost)

function sseEncode(event: PipelineEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function sseError(message: string, code?: string): string {
  return sseEncode({ type: 'error', message, code });
}

// ---------------------------------------------------------------------------
// OPTIONS
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
      'Too many enhancement requests. Please try again later.',
      429,
      { retryAfter }
    );
    response.headers.set('Retry-After', String(retryAfter));
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
    } catch { /* user exists */ }
    user = { id: devUserId };
  } else {
    return apiError(ErrorCode.SERVICE_UNAVAILABLE, 'Authentication not configured.', 503);
  }

  // ---- Parse body ----
  let body: { input?: string; material?: string; enhancementOptions?: string[] };
  try {
    body = await request.json();
  } catch {
    return apiError(ErrorCode.BAD_REQUEST, 'Invalid JSON body.', 400);
  }

  const rawInput = body.input ?? '';
  const cleanedInput = sanitizeInput(rawInput);
  if (cleanedInput.length === 0) {
    return apiError(ErrorCode.VALIDATION_ERROR, '"input" is required to describe what to enhance.', 400);
  }
  if (cleanedInput.length > 2000) {
    return apiError(ErrorCode.VALIDATION_ERROR, '"input" must be 2000 characters or fewer.', 400);
  }

  // Prompt injection check
  if (detectPromptInjection(cleanedInput)) {
    logger.warn('Prompt injection detected in enhance', { userId: user.id });
    return apiError(ErrorCode.VALIDATION_ERROR, 'Input contains disallowed content.', 400);
  }

  // Material: up to 500KB base64 (approx 375KB raw file)
  const material = body.material
    ? sanitizeAndTruncate(body.material, 500_000)
    : undefined;

  if (!material) {
    return apiError(ErrorCode.VALIDATION_ERROR, '"material" is required (base64 encoded file content).', 400);
  }

  // Enhancement options
  const validOptions = [
    'add_rubric',
    'add_answer_key',
    'add_more_questions',
    'ell_friendly',
    'iep_support',
    'advanced_enrichment',
  ];
  const enhancementOptions = (body.enhancementOptions ?? [])
    .filter((opt) => validOptions.includes(opt));

  // Build enhanced input for the parser
  // Prepend the material context so the parser can understand it
  const enhancementGuide = enhancementOptions.length > 0
    ? '\n\nEnhancement options requested: ' + enhancementOptions.map((o) => o.replace(/_/g, ' ')).join(', ') + '.'
    : '';

  const enhancedInput = `Enhance an existing set of learning materials.\nTeacher's request: ${cleanedInput}${enhancementGuide}\n\nThe uploaded material content is provided below. Generate a complete practice pack based on this material.`;

  // ---- Parse input (with enhancement context) ----
  let parseResult;
  try {
    parseResult = await parseInput(enhancedInput);
  } catch (err) {
    logger.error('Enhance: AI input parsing failed', {
      error: err instanceof Error ? err.message : String(err),
      userId: user.id,
    });
    return apiError(ErrorCode.PARSE_FAILED, 'Failed to parse input. Please try again.', 500);
  }

  if (parseResult.needsClarification || parseResult.confidence === 'low') {
    return Response.json(
      {
        success: true,
        data: {
          needsClarification: true,
          clarificationQuestion:
            parseResult.clarificationQuestion ??
            'Could you describe what kind of enhancement you need for this material?',
        },
      },
      { status: 200 }
    );
  }

  // ---- Stream generation with the material as enhance context ----
  logger.info('Starting material enhancement', {
    userId: user.id,
    subject: parseResult.subject,
    topic: parseResult.topic,
    gradeLevel: parseResult.gradeLevel,
    enhancementOptions,
  });

  const generator = generateWorkbook(parseResult, user.id, material);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const initEvent: PipelineEvent = {
          type: 'generating',
          message: `Enhancing: ${parseResult.topic} (${parseResult.subject}, ${parseResult.questionCount} questions)`,
        };
        controller.enqueue(new TextEncoder().encode(sseEncode(initEvent)));

        for await (const event of generator) {
          controller.enqueue(new TextEncoder().encode(sseEncode(event)));

          if (event.type === 'error' || event.type === 'complete') {
            controller.close();
            return;
          }
        }

        controller.enqueue(
          new TextEncoder().encode(sseError('Enhancement ended unexpectedly.', 'UNEXPECTED_END'))
        );
        controller.close();
      } catch (err) {
        logger.error('Enhance stream error', {
          error: err instanceof Error ? err.message : String(err),
          userId: user!.id,
        });
        try {
          controller.enqueue(new TextEncoder().encode(sseError('Enhancement failed.', 'STREAM_ERROR')));
        } catch { /* ignore */ }
        try { controller.close(); } catch { /* ignore */ }
      }
    },
    cancel() {
      logger.info('Client disconnected during enhancement', { userId: user!.id });
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

  const origin = request.headers.get('origin');
  applyCORS(response, origin, APP_ORIGIN);
  applySecurityHeaders(response, { appOrigin: APP_ORIGIN });

  return response;
}
