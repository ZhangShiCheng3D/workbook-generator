import { describe, it, expect } from 'vitest';
import {
  apiSuccess,
  apiError,
  apiPaginated,
  apiCatchError,
  ErrorCode,
} from './api-response';

describe('apiSuccess', () => {
  it('wraps data in success envelope', async () => {
    const res = apiSuccess({ id: '123', title: 'Test' });
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { id: '123', title: 'Test' } });
    expect(res.status).toBe(200);
  });

  it('supports custom status code', async () => {
    const res = apiSuccess({ created: true }, 201);
    expect(res.status).toBe(201);
  });
});

describe('apiError', () => {
  it('returns error envelope', async () => {
    const res = apiError(ErrorCode.NOT_FOUND, 'Workbook not found', 404);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Workbook not found' },
    });
    expect(res.status).toBe(404);
  });
});

describe('apiPaginated', () => {
  it('returns paginated envelope', async () => {
    const res = apiPaginated([{ id: '1' }, { id: '2' }], {
      total: 10,
      limit: 2,
      offset: 0,
      hasMore: true,
    });
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      data: [{ id: '1' }, { id: '2' }],
      pagination: { total: 10, limit: 2, offset: 0, hasMore: true },
    });
  });
});

describe('apiCatchError', () => {
  it('returns generic message in non-dev mode', async () => {
    const res = apiCatchError(new Error('DB connection lost'), 'test context');
    const body = await res.json();
    expect(body.error.message).toBe('An unexpected error occurred.');
    expect(res.status).toBe(500);
  });
});
