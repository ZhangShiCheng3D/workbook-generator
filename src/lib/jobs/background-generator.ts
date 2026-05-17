/**
 * Background Job Generator
 *
 * Polling-based background job system for workbook generations that exceed
 * Vercel Function 60-second timeout. Status is stored in the workbook record.
 *
 * How it works:
 * 1. Client calls POST /api/generate/async to start generation
 * 2. Server creates workbook with status="queued" and returns workbookId
 * 3. Client polls GET /api/generate/async/[id]/status every 2s
 * 4. Background generation processes the queue and updates workbook when done
 *
 * Alternative (production): replace with Inngest or Trigger.dev for real
 * background job infrastructure.
 *
 * DESIGN.html §7: Background jobs for generation > 60s
 */

import { db } from '@/lib/db';
import { workbooks, questions, rubrics, generationLogs } from '@/lib/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { v4 } from 'uuid';
import { streamText } from 'ai';
import { getModel } from '@/lib/ai/provider';
import { buildCachedSystemPromptParts } from '@/lib/ai/prompts';
import { getModelForWorkbook, estimateCost, computeActualCost } from '@/lib/ai/model-router';
import { storeCache } from '@/lib/ai/cache';
import { createLogger } from '@/lib/logger';
import type { ParseResult, QuestionOutput, WorkbookOutput, RubricOutput } from '@/types';

const logger = createLogger('jobs/generator');

// ---- Internal state ----
let isProcessing = false;
const MAX_GENERATION_TOKENS = 8192;
const MAX_QUESTIONS = 50;

// ---------------------------------------------------------------------------
// Queue a generation
// ---------------------------------------------------------------------------

export async function queueGeneration(parsed: ParseResult, userId: string): Promise<string> {
  const workbookId = v4();
  const now = new Date().toISOString();

  await db.insert(workbooks).values({
    id: workbookId,
    userId,
    title: `${parsed.topic} (Grade ${parsed.gradeLevel})`,
    subject: parsed.subject,
    topic: parsed.topic,
    gradeLevel: parsed.gradeLevel || '',
    description: null,
    estimatedTime: null,
    questionCount: parsed.questionCount,
    status: 'generating',
    visibility: 'private',
    standardCodes: null,
    isEnhanced: false,
    sourceMaterialName: null,
    createdAt: now,
    updatedAt: now,
  });

  logger.info('Generation queued', { workbookId, userId, topic: parsed.topic });

  // Trigger background processing (best-effort, fire and forget)
  processQueue().catch(() => { /* best-effort */ });

  return workbookId;
}

// ---------------------------------------------------------------------------
// Get generation status
// ---------------------------------------------------------------------------

export async function getGenerationStatus(workbookId: string): Promise<{
  status: string;
  progress: number;
  workbook?: WorkbookOutput;
}> {
  const rows = await db
    .select()
    .from(workbooks)
    .where(eq(workbooks.id, workbookId))
    .limit(1);

  if (rows.length === 0) return { status: 'error', progress: 0 };

  const wb = rows[0];

  if (wb.status === 'complete') {
    // Fetch the full workbook
    const qRows = await db
      .select()
      .from(questions)
      .where(eq(questions.workbookId, workbookId))
      .orderBy(questions.sortOrder);

    const rRows = await db
      .select()
      .from(rubrics)
      .where(eq(rubrics.workbookId, workbookId))
      .limit(1);

    const wbQuestions: QuestionOutput[] = qRows.map((q) => ({
      type: q.type as QuestionOutput['type'],
      difficulty: q.difficulty as QuestionOutput['difficulty'],
      points: q.points,
      questionText: q.questionText,
      options: q.options ? JSON.parse(q.options) : undefined,
      correctAnswer: q.answer,
      solution: q.solution ?? '',
      standardCode: q.standardCode ?? undefined,
      confidence: q.confidence as QuestionOutput['confidence'],
    }));

    const wbRubrics: RubricOutput[] = rRows.map((r) => ({
      criteria: r.criteria,
      maxScore: r.maxScore,
      scoreLevels: r.scoreLevels ? JSON.parse(r.scoreLevels) : [],
    }));

    return {
      status: 'complete',
      progress: 100,
      workbook: {
        title: wb.title,
        subject: wb.subject,
        topic: wb.topic,
        gradeLevel: wb.gradeLevel,
        description: wb.description ?? '',
        estimatedTime: wb.estimatedTime ?? '',
        questions: wbQuestions,
        rubric: wbRubrics,
      },
    };
  }

  if (wb.status === 'error') return { status: 'error', progress: 0 };
  return { status: wb.status, progress: 40 }; // 40% = parsing done, generating
}

// ---------------------------------------------------------------------------
// Process queue (best-effort single-worker)
// ---------------------------------------------------------------------------

export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Find oldest queued workbook
    const rows = await db
      .select()
      .from(workbooks)
      .where(eq(workbooks.status, 'generating'))
      .orderBy(asc(workbooks.createdAt))
      .limit(1);

    if (rows.length === 0) return;
    const wb = rows[0];
    logger.info('Processing queued generation', { workbookId: wb.id });

    // Build system prompt
    const systemParts = buildCachedSystemPromptParts({
      subject: wb.subject,
      topic: wb.topic,
      gradeLevel: wb.gradeLevel,
      questionCount: wb.questionCount,
      questionTypes: ['multiple_choice', 'short_answer', 'fill_blank', 'true_false'],
      difficulty: 'grade_level',
    });

    const routing = getModelForWorkbook(
      ['multiple_choice', 'short_answer', 'fill_blank', 'true_false'],
      'grade_level'
    );

    const userPrompt = `Generate a ${wb.questionCount}-question practice pack on "${wb.topic}" for grade ${wb.gradeLevel} ${wb.subject}.`;

    // Stream AI generation
    const result = streamText({
      model: getModel(routing.modelId),
      system: systemParts.map((part) => ({
        role: 'system' as const,
        content: part.text,
        providerOptions: part.cacheControl ? { anthropic: { cacheControl: part.cacheControl } } : undefined,
      })),
      prompt: userPrompt,
      maxOutputTokens: MAX_GENERATION_TOKENS,
      temperature: 0.3,
    });

    let fullText = '';
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    // Parse and persist
    let parsed;
    try { parsed = JSON.parse(fullText); } catch {
      const fence = fullText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) { try { parsed = JSON.parse(fence[1].trim()); } catch {/* continue */} }
      if (!parsed) {
        const brace = fullText.match(/\{\s*"questions"[\s\S]*"rubric"[\s\S]*\}/);
        if (brace) { try { parsed = JSON.parse(brace[0]); } catch {/* continue */} }
      }
    }

    if (!parsed?.questions) {
      await db.update(workbooks).set({ status: 'error', updatedAt: new Date().toISOString() }).where(eq(workbooks.id, wb.id));
      return;
    }

    // Persist questions
    const now = new Date().toISOString();
    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i];
      await db.insert(questions).values({
        id: v4(), workbookId: wb.id, type: q.type || 'multiple_choice',
        difficulty: q.difficulty || 'grade_level', points: q.points || 1,
        questionText: q.questionText || '', options: q.options ? JSON.stringify(q.options) : null,
        answer: q.correctAnswer || q.answer || '', solution: q.solution || '',
        standardCode: q.standardCode || null,
        confidence: (q.confidence || 'GREEN').toLowerCase() === 'green' ? 'high' : (q.confidence || 'GREEN').toLowerCase() === 'yellow' ? 'medium' : 'low',
        sortOrder: i + 1, isAiGenerated: true, createdAt: now,
      });
    }

    // Persist rubric
    if (parsed.rubric) {
      await db.insert(rubrics).values({
        id: v4(), workbookId: wb.id, questionId: null,
        criteria: parsed.rubric.criteria || '', maxScore: parsed.rubric.maxScore || 20,
        scoreLevels: JSON.stringify(parsed.rubric.scoreLevels || []), createdAt: now,
      });
    }

    // Log cost
    let usage;
    try { usage = await result.usage; } catch { usage = null; }
    const actualCost = usage
      ? computeActualCost(routing.model, usage.inputTokens ?? 0, usage.outputTokens ?? 0)
      : 0.05;

    await db.insert(generationLogs).values({
      id: v4(), workbookId: wb.id, model: routing.model,
      promptTokens: usage?.inputTokens ?? 0, completionTokens: usage?.outputTokens ?? 0,
      cacheReadTokens: 0, cacheWriteTokens: 0, cost: actualCost,
      durationMs: 0, createdAt: now,
    });

    const totalMin = Math.ceil(parsed.questions.length * 1.5);
    await db.update(workbooks).set({
      status: 'complete',
      description: `${wb.subject} practice pack: ${wb.topic}`,
      estimatedTime: `${totalMin} minutes`,
      updatedAt: now,
    }).where(eq(workbooks.id, wb.id));

    // Cache
    storeCache(wb.topic, wb.gradeLevel, wb.subject, parsed).catch(() => {});

    logger.info('Background generation complete', { workbookId: wb.id });
  } catch (err) {
    logger.error('Background generation failed', { error: err instanceof Error ? err.message : String(err) });
  } finally {
    isProcessing = false;
  }
}
