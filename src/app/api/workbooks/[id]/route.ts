/**
 * GET    /api/workbooks/[id]  — Full workbook with questions + rubric
 * DELETE /api/workbooks/[id]  — Delete workbook and all associated data
 *
 * All operations scoped by authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { db } from '@/lib/db';
import { workbooks, questions, rubrics } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { QuestionOutput, RubricOutput, QuestionWithMeta, RubricWithMeta, WorkbookDetailResponse } from '@/types';
import { apiSuccess, apiError, ErrorCode } from '@/lib/api-response';
import { createLogger } from '@/lib/logger';
import { isSupabaseConfigured } from '@/lib/env';
import { applyCORS, applySecurityHeaders } from '@/lib/security';
import { APP_ORIGIN } from '@/lib/env';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger('api/workbooks/[id]');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000000';

async function getUser() {
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

function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// OPTIONS — CORS preflight
// ---------------------------------------------------------------------------

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  applyCORS(response, origin, APP_ORIGIN);
  return response;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getUser();

  if (!user) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
  }

  const { id: workbookId } = await params;

  if (!workbookId) {
    return apiError(ErrorCode.BAD_REQUEST, 'Workbook ID is required.', 400);
  }

  try {
    // Fetch workbook
    const wbRows = await db
      .select()
      .from(workbooks)
      .where(and(eq(workbooks.id, workbookId), eq(workbooks.userId, user.id)))
      .limit(1);

    if (wbRows.length === 0) {
      return apiError(ErrorCode.NOT_FOUND, 'Workbook not found.', 404);
    }

    const wb = wbRows[0];

    // Fetch questions ordered by sort_order
    const qRows = await db
      .select()
      .from(questions)
      .where(eq(questions.workbookId, workbookId))
      .orderBy(questions.sortOrder);

    // Fetch rubric
    const rRows = await db
      .select()
      .from(rubrics)
      .where(eq(rubrics.workbookId, workbookId))
      .limit(1);

    const mappedQuestions: QuestionWithMeta[] = qRows.map((q) => ({
      id: q.id,
      workbookId: q.workbookId,
      type: q.type as QuestionOutput['type'],
      difficulty: q.difficulty as QuestionOutput['difficulty'],
      points: q.points,
      questionText: q.questionText,
      options: parseJsonField<string[] | null>(q.options, null) ?? undefined,
      correctAnswer: q.answer,
      solution: q.solution ?? '',
      standardCode: q.standardCode ?? undefined,
      confidence: q.confidence as QuestionOutput['confidence'],
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
        scoreLevels: parseJsonField<{ score: number; description: string }[]>(r.scoreLevels, []),
        createdAt: r.createdAt,
      };
    }

    const responseData: WorkbookDetailResponse = {
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

    const response = apiSuccess(responseData);
    applyCORS(response, request.headers.get('origin'), APP_ORIGIN);
    applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
    return response;
  } catch (err) {
    logger.error('Failed to fetch workbook', {
      error: err instanceof Error ? err.message : String(err),
      workbookId,
      userId: user.id,
    });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch workbook.', 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getUser();

  if (!user) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
  }

  const { id: workbookId } = await params;

  if (!workbookId) {
    return apiError(ErrorCode.BAD_REQUEST, 'Workbook ID is required.', 400);
  }

  try {
    // Verify ownership
    const existing = await db
      .select({ id: workbooks.id })
      .from(workbooks)
      .where(and(eq(workbooks.id, workbookId), eq(workbooks.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      return apiError(ErrorCode.NOT_FOUND, 'Workbook not found.', 404);
    }

    // Cascade: questions + rubrics (FK with ON DELETE CASCADE handles this
    // in SQLite if enabled, but explicit deletes are safer and explicit)
    await db.delete(questions).where(eq(questions.workbookId, workbookId));
    await db.delete(rubrics).where(eq(rubrics.workbookId, workbookId));
    await db.delete(workbooks).where(eq(workbooks.id, workbookId));

    logger.info('Workbook deleted', { workbookId, userId: user.id });

    const response = apiSuccess({ deletedId: workbookId });
    applyCORS(response, request.headers.get('origin'), APP_ORIGIN);
    applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
    return response;
  } catch (err) {
    logger.error('Failed to delete workbook', {
      error: err instanceof Error ? err.message : String(err),
      workbookId,
      userId: user.id,
    });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to delete workbook.', 500);
  }
}
