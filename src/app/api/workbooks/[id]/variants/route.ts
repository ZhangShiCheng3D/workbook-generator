/**
 * POST /api/workbooks/[id]/variants?type=ell|iep|advanced
 *
 * Creates a differentiated variant of an existing workbook.
 * "Differentiation after generation, not before" — DESIGN.html §2.
 *
 * VARIANT TYPES:
 *   ell      — English Language Learner: simplified language, visual cues, key vocab
 *   iep      — IEP/504 Support: scaffolded steps, chunked into smaller parts
 *   advanced — Advanced enrichment: higher DOK, extension questions, open-ended
 *
 * Response: SSE stream with variant workbook (Student + Teacher Copy)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { db } from '@/lib/db';
import { workbooks, questions, rubrics } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { streamText } from 'ai';
import { getModel } from '@/lib/ai/provider';
import { MODEL_IDS } from '@/lib/ai/model-router';
import { v4 } from 'uuid';
import { generateWorkbook } from '@/lib/ai/pipeline';
import type { PipelineEvent } from '@/lib/ai/pipeline';
import { apiError, ErrorCode } from '@/lib/api-response';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/sanitize';
import { isSupabaseConfigured, APP_ORIGIN } from '@/lib/env';
import { applyCORS, applySecurityHeaders } from '@/lib/security';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/variants');
const RATE_LIMIT = { windowMs: 120_000, max: 5 };
const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000000';

async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured && process.env.NODE_ENV === 'development') return DEV_USER_ID;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: workbookId } = await params;
  const { searchParams } = new URL(request.url);
  const variantType = searchParams.get('type') || 'ell';

  // Validate variant type
  if (!['ell', 'iep', 'advanced'].includes(variantType)) {
    return apiError(ErrorCode.VALIDATION_ERROR, 'Variant type must be "ell", "iep", or "advanced".', 400);
  }

  // ---- Rate limit ----
  const rlResult = rateLimit(request, RATE_LIMIT);
  if (!rlResult.success) {
    return apiError(ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many variant requests.', 429);
  }

  // ---- Auth ----
  const userId = await getUserId();
  if (!userId) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
  }

  // ---- Fetch source workbook ----
  const wbRows = await db
    .select()
    .from(workbooks)
    .where(and(eq(workbooks.id, workbookId), eq(workbooks.userId, userId)))
    .limit(1);
  if (wbRows.length === 0) {
    return apiError(ErrorCode.NOT_FOUND, 'Workbook not found.', 404);
  }
  const wb = wbRows[0];

  const qRows = await db
    .select()
    .from(questions)
    .where(eq(questions.workbookId, workbookId))
    .orderBy(questions.sortOrder);

  // Source questions for context
  const sourceQuestions = qRows.map((q) => ({
    type: q.type,
    difficulty: q.difficulty,
    questionText: q.questionText,
    options: q.options ? (() => { try { return JSON.parse(q.options); } catch { return null; } })() : null,
    answer: q.answer,
    standardCode: q.standardCode,
  }));

  // ---- Build variant-specific prompt ----
  const variantPrompt = buildVariantPrompt(variantType, wb, sourceQuestions);

  // ---- Stream generation ----
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = streamText({
          model: getModel(MODEL_IDS.standard),
          system: variantPrompt.system,
          prompt: variantPrompt.user,
          maxOutputTokens: 6144,
          temperature: 0.4,
        });

        let fullText = '';
        for await (const chunk of result.textStream) {
          fullText += chunk;
        }

        // Parse the variant response
        let parsed;
        try {
          // Try JSON
          parsed = JSON.parse(fullText);
        } catch {
          // Try ```json fence
          const fence = fullText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (fence) { try { parsed = JSON.parse(fence[1].trim()); } catch {/* fall through */} }
          if (!parsed) {
            const brace = fullText.match(/\{\s*"title"[\s\S]*\}/);
            if (brace) { try { parsed = JSON.parse(brace[0]); } catch {/* fall through */} }
          }
        }

        if (!parsed?.questions) {
          controller.enqueue(new TextEncoder().encode(sseError('Failed to generate variant.', 'PARSE_ERROR')));
          controller.close();
          return;
        }

        // Emit questions
        for (let i = 0; i < parsed.questions.length; i++) {
          const q = parsed.questions[i];
          controller.enqueue(new TextEncoder().encode(sseEncode({
            type: 'question',
            data: {
              type: q.type || 'multiple_choice',
              difficulty: variantType === 'advanced' ? 'advanced' : 'grade_level',
              points: q.points || 1,
              questionText: q.questionText || '',
              options: q.options,
              correctAnswer: q.correctAnswer || q.answer || '',
              solution: q.solution || '',
              standardCode: q.standardCode || undefined,
              confidence: 'medium',
            },
          })));
        }

        // Emit rubric if present
        if (parsed.rubric) {
          controller.enqueue(new TextEncoder().encode(sseEncode({
            type: 'rubric',
            data: {
              criteria: parsed.rubric.criteria || 'Variant rubric',
              maxScore: parsed.rubric.maxScore || 20,
              scoreLevels: parsed.rubric.scoreLevels || [],
            },
          })));
        }

        // Emit completion
        const variantTitle = `${wb.title} — ${variantLabels[variantType]} Version`;
        controller.enqueue(new TextEncoder().encode(sseEncode({
          type: 'complete',
          workbookId: workbookId,
          workbook: {
            title: variantTitle,
            subject: wb.subject,
            topic: wb.topic,
            gradeLevel: wb.gradeLevel,
            description: `${variantLabels[variantType]} differentiated variant of "${wb.topic}"`,
            estimatedTime: wb.estimatedTime || `${parsed.questions.length * 1.5} minutes`,
            questions: parsed.questions.map((q: Record<string, unknown>, i: number) => ({
              type: q.type || 'multiple_choice',
              difficulty: variantType === 'advanced' ? 'advanced' : 'grade_level',
              points: q.points || 1,
              questionText: q.questionText || '',
              options: q.options,
              correctAnswer: q.correctAnswer || q.answer || '',
              solution: q.solution || '',
              standardCode: q.standardCode || undefined,
              confidence: 'medium',
            })),
            rubric: [{
              criteria: parsed.rubric?.criteria || 'Variant rubric',
              maxScore: parsed.rubric?.maxScore || 20,
              scoreLevels: parsed.rubric?.scoreLevels || [],
            }],
          },
        })));

        controller.close();
      } catch (err) {
        logger.error('Variant generation failed', {
          error: err instanceof Error ? err.message : String(err),
          workbookId,
          variantType,
        });
        try {
          controller.enqueue(new TextEncoder().encode(sseError('Variant generation failed.', 'GENERATION_ERROR')));
        } catch {/* ignore */}
        try { controller.close(); } catch {/* ignore */}
      }
    },
  });

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Variant-Type': variantType,
    },
  });

  const origin = request.headers.get('origin');
  applyCORS(response, origin, APP_ORIGIN);
  applySecurityHeaders(response, { appOrigin: APP_ORIGIN });

  return response;
}

// ---------------------------------------------------------------------------
// Variant prompt builders
// ---------------------------------------------------------------------------

const variantLabels: Record<string, string> = {
  ell: 'ELL-Friendly',
  iep: 'IEP Support',
  advanced: 'Advanced Enrichment',
};

function buildVariantPrompt(
  variantType: string,
  wb: typeof workbooks.$inferSelect,
  sourceQuestions: Record<string, unknown>[]
): { system: string; user: string } {
  const baseContext = sourceQuestions.map((q, i) =>
    `Q${i + 1}: [${q.type}] ${q.questionText}`
  ).join('\n');

  const configs: Record<string, { instruction: string; readingLevel: string; supports: string }> = {
    ell: {
      instruction: 'Rewrite each question using simpler English (lower Lexile level). Define key academic vocabulary in context. Add visual description cues. Keep the same learning objectives and standards but make the language accessible to English Language Learners.',
      readingLevel: 'Reduce reading level by 2-3 grade levels. Use short sentences (max 15 words).',
      supports: 'Add word banks where helpful. Include definitions of key terms in parentheses. Use concrete, familiar examples.',
    },
    iep: {
      instruction: 'Adapt each question for students with IEP/504 plans. Break multi-step problems into chunked sub-steps. Add scaffolding prompts. Reduce cognitive load per question while maintaining grade-level standards.',
      readingLevel: 'Maintain grade-level content but chunk into smaller steps. Reduce the number of answer choices for MC to 3.',
      supports: 'Add "Step 1, Step 2..." scaffolding. Include worked examples before each question type. Add visual organizers.',
    },
    advanced: {
      instruction: 'Create enrichment versions of each question at a higher Depth of Knowledge (DOK 3-4). Add extension questions that require synthesis, evaluation, or creative application. Include one open-ended challenge per 5 questions.',
      readingLevel: 'Maintain or slightly increase reading level. Use academic vocabulary appropriate for advanced learners.',
      supports: 'Add "Challenge Yourself" extension questions. Include real-world application scenarios. Encourage multiple solution strategies.',
    },
  };

  const config = configs[variantType];

  const system = `You are an expert in K-12 differentiated instruction. Your task is to create a ${configs[variantType].instruction}

## Differentiation Rules
- Reading Level: ${config.readingLevel}
- Supports: ${config.supports}
- Keep the same topic, subject, and grade level as the original
- Maintain alignment with the same curriculum standards
- Produce exactly the same number of questions as the original
- Every question must have a correct answer and solution

## Output Format
Respond with valid JSON:
{
  "questions": [
    {
      "type": "multiple_choice|true_false|fill_blank|short_answer",
      "difficulty": "grade_level|basic|advanced",
      "points": 1,
      "standardCode": "CCSS...",
      "questionText": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "...",
      "solution": "...",
      "confidence": "GREEN|YELLOW|RED"
    }
  ],
  "rubric": {
    "criteria": "Grading rubric for differentiated assessment",
    "maxScore": 20,
    "scoreLevels": [{"score": 4, "description": "..."}, ...]
  }
}`;

  const user = `Create a "${variantLabels[variantType]}" variant of this workbook:

Subject: ${wb.subject}
Topic: ${wb.topic}
Grade: ${wb.gradeLevel}
Question Count: ${wb.questionCount}

Original questions:
${baseContext}

Generate ${wb.questionCount} differentiated questions following the ${variantLabels[variantType]} requirements. Output valid JSON only.`;

  return { system, user };
}
