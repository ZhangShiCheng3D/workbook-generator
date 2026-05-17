/**
 * API Response Standardization
 *
 * Every API route returns responses in a consistent envelope:
 *   Success: { success: true, data: T }
 *   Error:   { success: false, error: { code: string, message: string, details?: unknown } }
 *   Paginated: { success: true, data: T[], pagination: { total, limit, offset, hasMore } }
 *
 * DESIGN.html §10: API Design — consistent response format for all endpoints
 */

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Error Codes
// ---------------------------------------------------------------------------

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  PARSE_FAILED: 'PARSE_FAILED',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ---------------------------------------------------------------------------
// HTTP Status to Error Code Mapping
// ---------------------------------------------------------------------------

function errorCodeForStatus(status: number): ErrorCodeType {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 429:
      return ErrorCode.RATE_LIMIT_EXCEEDED;
    case 422:
      return ErrorCode.VALIDATION_ERROR;
    case 503:
      return ErrorCode.SERVICE_UNAVAILABLE;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a standardized success response.
 *
 * @example
 * ```ts
 * return apiSuccess({ workbook: { id: '123', title: 'Fractions' } });
 * ```
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  const body: ApiSuccessResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

/**
 * Build a standardized error response.
 *
 * @example
 * ```ts
 * return apiError('NOT_FOUND', 'Workbook not found', 404);
 * ```
 */
export function apiError(
  code: ErrorCodeType,
  message: string,
  status = 400,
  details?: unknown
): NextResponse {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

/**
 * Build a paginated success response.
 *
 * @example
 * ```ts
 * return apiPaginated(summaries, { total: 50, limit: 20, offset: 0, hasMore: true });
 * ```
 */
export function apiPaginated<T>(
  data: T[],
  pagination: PaginationMeta,
  status = 200
): NextResponse {
  const body: ApiPaginatedResponse<T> = { success: true, data, pagination };
  return NextResponse.json(body, { status });
}

/**
 * Build an error response from a caught error object.
 * Use as a fallback in catch blocks to avoid leaking internal details.
 *
 * In production, the error message is generic.
 * In development, the actual error message is included.
 */
export function apiCatchError(err: unknown, context: string): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';
  const message = isDev && err instanceof Error ? err.message : 'An unexpected error occurred.';

  return apiError(
    ErrorCode.INTERNAL_ERROR,
    message,
    500,
    isDev ? { context } : undefined
  );
}
