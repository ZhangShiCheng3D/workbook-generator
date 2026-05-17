/**
 * In-Memory Rate Limiter
 *
 * Lightweight rate limiter using a Map keyed by IP address. No Redis needed
 * for MVP — works well enough for single-instance deployments. Auto-cleans
 * expired entries to prevent memory leaks.
 *
 * DESIGN.html §13: Rate limiting on AI generation endpoint (cost protection).
 */

import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms when the window closes
}

export interface RateLimitOptions {
  /** Time window in milliseconds. Default: 60_000 (60 seconds). */
  windowMs: number;
  /** Maximum requests allowed within the window. Default: 30. */
  max: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Epoch seconds when the window resets. */
  reset: number;
}

// ---------------------------------------------------------------------------
// Shared store (module-level — survives across requests in same process)
// ---------------------------------------------------------------------------

const store = new Map<string, RateLimitEntry>();

/** Background cleanup interval (every 60 seconds). */
const CLEANUP_INTERVAL_MS = 60_000;

// Periodically remove expired entries to prevent memory leaks during
// long-running processes (e.g., dev server, non-serverless prod).
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't keep the process alive just for cleanup
  if (typeof setInterval === 'function') {
    const timer = setInterval(() => {}, CLEANUP_INTERVAL_MS);
    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIP(request: NextRequest): string {
  // Respect common proxy headers in order of trustworthiness.
  // In Vercel, x-forwarded-for is set automatically.
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the leftmost (original client) IP
    return forwarded.split(',')[0]!.trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  // Fallback: use a hash of User-Agent + accept-language as a weak identifier
  // for dev environments where IP headers may not be set.
  const ua = request.headers.get('user-agent') ?? 'unknown';
  const lang = request.headers.get('accept-language') ?? 'unknown';
  return `anon-${simpleHash(ua + lang)}`;
}

/** Fast, non-crypto hash for client fingerprinting. */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if the incoming request is within the rate limit.
 *
 * @returns RateLimitResult with success, remaining count, and reset timestamp.
 *
 * @example
 * ```ts
 * const { success, remaining, reset } = rateLimit(req, { windowMs: 60_000, max: 10 });
 * if (!success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */
export function rateLimit(
  request: NextRequest,
  options: Partial<RateLimitOptions> = {}
): RateLimitResult {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 30;

  const ip = getClientIP(request);
  const now = Date.now();

  const existing = store.get(ip);

  if (!existing || now > existing.resetAt) {
    // First request in window or window expired — start fresh
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(ip, entry);
    return {
      success: true,
      remaining: max - 1,
      reset: Math.ceil(entry.resetAt / 1000),
    };
  }

  // Within the current window
  existing.count += 1;

  if (existing.count > max) {
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil(existing.resetAt / 1000),
    };
  }

  return {
    success: true,
    remaining: max - existing.count,
    reset: Math.ceil(existing.resetAt / 1000),
  };
}

/**
 * Apply rate limiting and return a 429 Response if the limit is exceeded.
 * Convenience wrapper that returns null if the request is allowed, or a
 * 429 NextResponse if the limit has been hit.
 *
 * @example
 * ```ts
 * const blocked = rateLimitResponse(req, { windowMs: 60_000, max: 10 });
 * if (blocked) return blocked;
 * // ... handle request
 * ```
 */
export function rateLimitResponse(
  request: NextRequest,
  options: Partial<RateLimitOptions> = {}
): { response: Response; headers: Headers } | null {
  const result = rateLimit(request, options);

  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(options.max ?? 30));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(result.reset));

  if (!result.success) {
    const retryAfter = Math.max(1, result.reset - Math.ceil(Date.now() / 1000));
    headers.set('Retry-After', String(retryAfter));

    const response = Response.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: { retryAfter },
        },
      },
      { status: 429, headers }
    );
    return { response, headers };
  }

  return null;
}
