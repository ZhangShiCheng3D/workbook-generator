/**
 * Main Generation Pipeline
 *
 * Orchestrates end-to-end workbook generation:
 *   1. Persist workbook record (status: generating)
 *   2. Build cached system prompt
 *   3. Stream AI generation via Vercel AI SDK streamText
 *   4. Parse response, persist questions + rubrics
 *   5. Update workbook status, log costs
 *
 * DESIGN.html 7-10: Architecture, AI Pipeline, API Design
 */

import { streamText } from 'ai';
import { getModel } from './provider';
import { v4 } from 'uuid';
import { db } from '@/lib/db';
import { workbooks, questions, rubrics, generationLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type {
  ParseResult,
  QuestionOutput,
  RubricOutput,
  WorkbookOutput,
} from '@/types';
import { buildCachedSystemPromptParts } from './prompts';
import type { SystemPromptPart } from './prompts';
import { getModelForWorkbook, estimateCost, isOverBudget, computeActualCost } from './model-router';
import type { RoutingResult } from './model-router';
import { createLogger } from '@/lib/logger';
import { storeCache } from './cache';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger('ai/pipeline');

// ---------------------------------------------------------------------------
// Pipeline event types (yielded to SSE consumer)
// ---------------------------------------------------------------------------

export type PipelineEvent =
  | { type: 'generating'; message: string }
  | { type: 'question'; data: QuestionOutput }
  | { type: 'rubric'; data: RubricOutput }
  | { type: 'complete'; workbookId: string; workbook: WorkbookOutput }
  | { type: 'error'; message: string; code?: string };

// ---------------------------------------------------------------------------
// AI response shapes (match the prompt's expected JSON structure)
// ---------------------------------------------------------------------------

interface AIQuestionResponse {
  type: string;
  difficulty: string;
  points: number;
  standardCode: string;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  solution: string;
  confidence: 'GREEN' | 'YELLOW' | 'RED';
}

interface AIRubricResponse {
  criteria: string;
  maxScore: number;
  scoreLevels: { score: number; description: string }[];
}

interface AIGenerationResponse {
  questions: AIQuestionResponse[];
  rubric: AIRubricResponse;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_GENERATION_TOKENS = 8192;

/**
 * Per-question-type token budgets.
 * Aligned with DESIGN.html §9.3.3: Token budget control per question complexity.
 * These are rough averages — the actual output also includes rubric JSON.
 */
const QUESTION_TYPE_TOKEN_BUDGETS: Record<string, number> = {
  multiple_choice: 400, // MC with 4 options, solutions
  true_false: 300, // Simple T/F with explanation
  fill_blank: 350, // Short answer + solution
  short_answer: 600, // Longer answer + solution
  matching: 500, // Matching sets
  essay: 1200, // Essay prompt + model answer
};

function calculateTargetTokens(questionCount: number, questionTypes: string[]): number {
  const avgTokens = questionTypes.reduce((sum, t) => sum + (QUESTION_TYPE_TOKEN_BUDGETS[t] || 500), 0);
  const avg = avgTokens / Math.max(1, questionTypes.length);
  const base = avg * questionCount;
  const rubricOverhead = 800; // Overhead for the rubric JSON
  const result = Math.min(base + rubricOverhead, MAX_GENERATION_TOKENS);
  return Math.max(result, 1024); // Minimum 1K tokens
}

function buildUserPrompt(parsed: ParseResult): string {
  const grade = parsed.gradeLevel ? `Grade ${parsed.gradeLevel}` : 'the appropriate grade level';
  const types = parsed.questionTypes.join(', ').replace(/_/g, ' ');
  return [
    `<user_request>`,
    `Generate a ${parsed.questionCount}-question ${parsed.difficulty} practice pack`,
    `on "${parsed.topic}" for ${grade} ${parsed.subject}.`,
    `Include these question types: ${types}.`,
    `</user_request>`,
  ].join(' ');
}

function deriveTitle(parsed: ParseResult): string {
  const grade = parsed.gradeLevel ? ` (Grade ${parsed.gradeLevel})` : '';
  return `${parsed.topic}${grade}`;
}

/**
 * Parse raw AI text into structured JSON.
 * Tries: raw JSON → ```json fences → regex extraction.
 */
function parseAIResponse(raw: string): AIGenerationResponse {
  // Strategy 1: raw JSON
  try {
    const parsed = JSON.parse(raw);
    if (parsed.questions && parsed.rubric) return parsed as AIGenerationResponse;
  } catch { /* fall through */ }

  // Strategy 2: ```json ... ``` fence
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      const parsed = JSON.parse(fence[1].trim());
      if (parsed.questions && parsed.rubric) return parsed as AIGenerationResponse;
    } catch { /* fall through */ }
  }

  // Strategy 3: find outermost { with "questions" and "rubric"
  const brace = raw.match(/\{\s*"questions"[\s\S]*"rubric"[\s\S]*\}/);
  if (brace) {
    try {
      const parsed = JSON.parse(brace[0]);
      if (parsed.questions && parsed.rubric) return parsed as AIGenerationResponse;
    } catch { /* fall through */ }
  }

  throw new Error(
    'Failed to parse AI response as JSON. The model did not return valid structured output.'
  );
}

function mapConfidence(label: string): 'high' | 'medium' | 'low' {
  switch (label.toUpperCase()) {
    case 'GREEN': return 'high';
    case 'YELLOW': return 'medium';
    case 'RED': return 'low';
    default: return 'medium';
  }
}

// ---------------------------------------------------------------------------
// Main generator (async generator)
// ---------------------------------------------------------------------------

/**
 * Generate a complete workbook from a parsed teacher request.
 *
 * Yields PipelineEvent objects that the API route serializes as SSE.
 * On error, yields { type: 'error', ... } and marks the workbook 'error'.
 */
export async function* generateWorkbook(
  parsed: ParseResult,
  userId: string,
  enhanceMaterial?: string,
  existingWorkbookId?: string
): AsyncGenerator<PipelineEvent, void, undefined> {
  const workbookId = existingWorkbookId ?? v4();
  const startTime = Date.now();
  const now = new Date().toISOString();
  let fullResponseText = '';

  // ---- Step 1: Insert or update workbook record ----
  try {
    if (existingWorkbookId) {
      // Regeneration: update existing workbook status and clear old content
      await db
        .update(workbooks)
        .set({ status: 'generating', updatedAt: now })
        .where(eq(workbooks.id, existingWorkbookId));

      await db.delete(questions).where(eq(questions.workbookId, existingWorkbookId));
      await db.delete(rubrics).where(eq(rubrics.workbookId, existingWorkbookId));
    } else {
      await db.insert(workbooks).values({
        id: workbookId,
        userId,
        title: deriveTitle(parsed),
        subject: parsed.subject,
        topic: parsed.topic,
        gradeLevel: parsed.gradeLevel || '',
        description: null,
        estimatedTime: null,
        questionCount: parsed.questionCount,
        status: 'generating',
        visibility: 'private',
        standardCodes: null,
        isEnhanced: !!enhanceMaterial,
        sourceMaterialName: enhanceMaterial ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (err) {
    yield { type: 'error', message: 'Failed to create workbook record.', code: 'DB_INSERT_ERROR' };
    logger.error('Workbook insert failed', { error: err instanceof Error ? err.message : String(err) });
    return;
  }

  // ---- Step 2: Build system prompt ----
  const systemParts = buildCachedSystemPromptParts({
    subject: parsed.subject,
    topic: parsed.topic,
    gradeLevel: parsed.gradeLevel,
    questionCount: parsed.questionCount,
    questionTypes: parsed.questionTypes,
    difficulty: parsed.difficulty,
  });

  // ---- Step 3: Route model ----
  const routing = getModelForWorkbook(parsed.questionTypes, parsed.difficulty);
  const { estimatedCost: estCost } = estimateCost(
    parsed.questionCount,
    parsed.questionTypes,
    parsed.difficulty
  );
  if (isOverBudget(estCost)) {
    logger.warn('Estimated cost exceeds threshold', { workbookId, estCost });
  }

  yield {
    type: 'generating',
    message: `Creating ${parsed.questionCount} questions for "${parsed.topic}"...`,
  };

  // ---- Step 4: Stream AI generation ----
  let usage: { promptTokens: number; completionTokens: number } | null = null;

  try {
    const result = streamText({
      model: getModel(routing.modelId),
      system: systemParts.map((part) => ({
        role: 'system' as const,
        content: part.text,
        providerOptions: part.cacheControl
          ? { anthropic: { cacheControl: part.cacheControl } }
          : undefined,
      })),
      prompt: buildUserPrompt(parsed),
      maxOutputTokens: calculateTargetTokens(parsed.questionCount, parsed.questionTypes),
      temperature: parsed.difficulty === 'advanced' ? 0.6 : 0.3,
    });

    for await (const chunk of result.textStream) {
      fullResponseText += chunk;
    }

    // After consuming the stream, usage may be available
    try {
      const u = await result.usage;
      usage = { promptTokens: u.inputTokens ?? 0, completionTokens: u.outputTokens ?? 0 };
    } catch {
      logger.warn('Could not retrieve token usage from streamText');
    }

    try {
      const fr = await result.finishReason;
      if (fr && fr !== 'stop') {
        logger.warn('Unexpected finish reason', { workbookId, finishReason: fr });
      }
    } catch { /* optional */ }
  } catch (err) {
    logger.error('streamText error', { error: err instanceof Error ? err.message : String(err), workbookId });
    await markWorkbookError(workbookId);
    yield { type: 'error', message: 'AI generation failed. Please try again.', code: 'AI_STREAM_ERROR' };
    return;
  }

  // ---- Step 5: Parse AI response ----
  let aiResponse: AIGenerationResponse;
  try {
    aiResponse = parseAIResponse(fullResponseText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to parse AI response';
    await markWorkbookError(workbookId);
    yield { type: 'error', message: msg, code: 'PARSE_ERROR' };
    return;
  }

  // ---- Step 5b: Cache the successful response ----
  storeCache(
    parsed.topic,
    parsed.gradeLevel || '',
    parsed.subject,
    aiResponse
  ).catch(() => { /* fire-and-forget: cache failure must not block generation */ });

  // ---- Step 6: Persist questions & stream to client ----
  const questionsList: QuestionOutput[] = [];

  for (let i = 0; i < aiResponse.questions.length; i++) {
    const q = aiResponse.questions[i];
    const questionId = v4();
    const questionNow = new Date().toISOString();

    const qo: QuestionOutput = {
      type: q.type as QuestionOutput['type'],
      difficulty: q.difficulty as QuestionOutput['difficulty'],
      points: q.points || 1,
      questionText: q.questionText,
      options: q.options ?? undefined,
      correctAnswer: q.correctAnswer,
      solution: q.solution,
      standardCode: q.standardCode || undefined,
      confidence: mapConfidence(q.confidence),
    };
    questionsList.push(qo);

    // Persist to DB (schema uses 'answer' column, NOT 'correctAnswer')
    try {
      await db.insert(questions).values({
        id: questionId,
        workbookId,
        type: qo.type,
        difficulty: qo.difficulty,
        points: qo.points,
        questionText: qo.questionText,
        options: qo.options ? JSON.stringify(qo.options) : null,
        answer: qo.correctAnswer,
        solution: qo.solution,
        standardCode: qo.standardCode ?? null,
        confidence: qo.confidence,
        sortOrder: i + 1,
        isAiGenerated: true,
        createdAt: questionNow,
      });
    } catch (err) {
      logger.error('Question insert failed', { error: err instanceof Error ? err.message : String(err), workbookId, questionIndex: i + 1 });
      // Continue with remaining questions
    }

    yield { type: 'question', data: qo };
  }

  // ---- Step 7: Persist rubric ----
  const rubricId = v4();
  const rubricNow = new Date().toISOString();
  const rubricOutput: RubricOutput = {
    criteria: aiResponse.rubric.criteria,
    maxScore: aiResponse.rubric.maxScore,
    scoreLevels: aiResponse.rubric.scoreLevels,
  };

  try {
    await db.insert(rubrics).values({
      id: rubricId,
      workbookId,
      questionId: null, // workbook-level rubric
      criteria: rubricOutput.criteria,
      maxScore: rubricOutput.maxScore,
      scoreLevels: JSON.stringify(rubricOutput.scoreLevels),
      createdAt: rubricNow,
    });
  } catch (err) {
    logger.error('Rubric insert failed', { error: err instanceof Error ? err.message : String(err), workbookId });
  }

  yield { type: 'rubric', data: rubricOutput };

  // ---- Step 8: Update workbook status ----
  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  // Derive estimated time from question count
  const totalMin = Math.ceil(parsed.questionCount * 1.5);
  const estimatedTime = `${totalMin} minutes`;

  try {
    await db
      .update(workbooks)
      .set({
        status: 'complete',
        description: `${parsed.subject} practice pack: ${parsed.topic}`,
        estimatedTime,
        updatedAt: completedAt,
      })
      .where(eq(workbooks.id, workbookId));
  } catch (err) {
    logger.error('Workbook status update failed', { error: err instanceof Error ? err.message : String(err), workbookId });
  }

  // ---- Step 9: Log generation ----
  const actualCost = usage
    ? computeActualCost(routing.model, usage.promptTokens, usage.completionTokens)
    : estCost;

  try {
    await db.insert(generationLogs).values({
      id: v4(),
      workbookId,
      model: routing.model,
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      cost: actualCost,
      durationMs,
      createdAt: completedAt,
    });
  } catch (err) {
    logger.error('Generation log insert failed', { error: err instanceof Error ? err.message : String(err), workbookId });
  }

  // ---- Step 10: Yield completion ----
  const workbookOutput: WorkbookOutput = {
    title: deriveTitle(parsed),
    subject: parsed.subject,
    topic: parsed.topic,
    gradeLevel: parsed.gradeLevel,
    description: `${parsed.subject} practice pack: ${parsed.topic}`,
    estimatedTime,
    questions: questionsList,
    rubric: [rubricOutput],
  };

  yield { type: 'complete', workbookId, workbook: workbookOutput };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function markWorkbookError(workbookId: string): Promise<void> {
  try {
    await db
      .update(workbooks)
      .set({ status: 'error', updatedAt: new Date().toISOString() })
      .where(eq(workbooks.id, workbookId));
  } catch {
    /* best-effort */
  }
}

/**
 * Re-generate the teacher copy (answer key) for an existing workbook.
 */
export async function* regenerateTeacherCopy(
  workbookId: string,
  userId: string
): AsyncGenerator<PipelineEvent, void, undefined> {
  const rows = await db
    .select()
    .from(workbooks)
    .where(eq(workbooks.id, workbookId))
    .limit(1);

  if (rows.length === 0 || rows[0].userId !== userId) {
    yield { type: 'error', message: 'Workbook not found.', code: 'NOT_FOUND' };
    return;
  }

  const wb = rows[0];
  const parsed: ParseResult = {
    subject: wb.subject as ParseResult['subject'],
    topic: wb.topic,
    gradeLevel: wb.gradeLevel,
    questionCount: wb.questionCount,
    questionTypes: ['multiple_choice', 'short_answer', 'fill_blank', 'true_false'],
    difficulty: 'grade_level',
    confidence: 'high',
    needsClarification: false,
  };

  yield* generateWorkbook(parsed, userId, undefined, workbookId);
}
