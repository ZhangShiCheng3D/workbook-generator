/**
 * Workbook Service Layer
 *
 * Extracted CRUD operations for workbooks, questions, and rubrics.
 * Separates data access from API route handlers for testability and reuse.
 *
 * DESIGN.html §7: Architecture — service layer between API routes and Drizzle ORM
 */

import { db } from '@/lib/db';
import { workbooks, questions, rubrics, generationLogs } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { v4 } from 'uuid';
import type {
  WorkbookSummary,
  QuestionWithMeta,
  RubricWithMeta,
  WorkbookDetailResponse,
  Subject,
} from '@/types';

// ---------------------------------------------------------------------------
// Workbook CRUD
// ---------------------------------------------------------------------------

export interface ListWorkbooksParams {
  userId: string;
  limit?: number;
  offset?: number;
  status?: string;
}

export async function listWorkbooks(params: ListWorkbooksParams) {
  const { userId, limit = 20, offset = 0, status } = params;
  const conditions = [eq(workbooks.userId, userId)];

  if (status && ['draft', 'generating', 'complete', 'error'].includes(status)) {
    conditions.push(eq(workbooks.status, status as typeof workbooks.$inferSelect.status));
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

  const items: WorkbookSummary[] = rows.map((row) => ({
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

  return { items, total, hasMore: offset + limit < total };
}

export async function getWorkbookDetail(
  workbookId: string,
  userId: string
): Promise<WorkbookDetailResponse | null> {
  const wbRows = await db
    .select()
    .from(workbooks)
    .where(and(eq(workbooks.id, workbookId), eq(workbooks.userId, userId)))
    .limit(1);

  if (wbRows.length === 0) return null;
  const wb = wbRows[0];

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

  const mappedQuestions: QuestionWithMeta[] = qRows.map((q) => ({
    id: q.id,
    workbookId: q.workbookId,
    type: q.type as QuestionWithMeta['type'],
    difficulty: q.difficulty as QuestionWithMeta['difficulty'],
    points: q.points,
    questionText: q.questionText,
    options: parseJson(q.options) ?? undefined,
    correctAnswer: q.answer,
    solution: q.solution ?? '',
    standardCode: q.standardCode ?? undefined,
    confidence: q.confidence as QuestionWithMeta['confidence'],
    questionNumber: q.sortOrder,
    createdAt: q.createdAt,
  }));

  let mappedRubric: RubricWithMeta | null = null;
  if (rRows.length > 0) {
    const r = rRows[0];
    mappedRubric = {
      id: r.id,
      workbookId: r.workbookId,
      criteria: r.criteria,
      maxScore: r.maxScore,
      scoreLevels: parseJson<{ score: number; description: string }[]>(r.scoreLevels) ?? [],
      createdAt: r.createdAt,
    };
  }

  return {
    id: wb.id,
    title: wb.title,
    subject: wb.subject,
    topic: wb.topic,
    gradeLevel: wb.gradeLevel,
    description: wb.description,
    estimatedTime: wb.estimatedTime,
    questionCount: wb.questionCount,
    status: wb.status,
    isEnhanced: wb.isEnhanced ?? false,
    createdAt: wb.createdAt,
    updatedAt: wb.updatedAt,
    questions: mappedQuestions,
    rubric: mappedRubric,
  };
}

export async function deleteWorkbook(
  workbookId: string,
  userId: string
): Promise<boolean> {
  const existing = await db
    .select({ id: workbooks.id })
    .from(workbooks)
    .where(and(eq(workbooks.id, workbookId), eq(workbooks.userId, userId)))
    .limit(1);

  if (existing.length === 0) return false;

  await db.delete(questions).where(eq(questions.workbookId, workbookId));
  await db.delete(rubrics).where(eq(rubrics.workbookId, workbookId));
  await db.delete(generationLogs).where(eq(generationLogs.workbookId, workbookId));
  await db.delete(workbooks).where(eq(workbooks.id, workbookId));

  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
