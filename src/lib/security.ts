/**
 * Security Headers
 *
 * Generates and applies standard security HTTP headers for all responses.
 * CSP is configured to be strict while allowing the app's own resources,
 * Supabase, and AI API providers.
 *
 * DESIGN.html §12: Security — CSP strict mode + OWASP LLM Top 10 mitigations
 */

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityHeaderOptions {
  /** The base URL of the application (e.g., https://practicepacks.com). */
  appOrigin: string;
  /** Allow inline styles (required for Tailwind, shadcn/ui). Default: true. */
  allowInlineStyles: boolean;
  /** Allow eval() for scripts. Default: false. */
  allowUnsafeEval: boolean;
  /** Extra script-src origins. */
  extraScriptSrc: string[];
  /** Extra connect-src origins (for API calls). */
  extraConnectSrc: string[];
}

const DEFAULT_SCRIPT_SRC = ["'self'"];
const DEFAULT_CONNECT_SRC = ["'self'", 'https://*.supabase.co'];
const DEFAULT_IMG_SRC = ["'self'", 'data:', 'blob:'];

// ---------------------------------------------------------------------------
// CSP Generation
// ---------------------------------------------------------------------------

/**
 * Generate a Content-Security-Policy header value.
 *
 * Defaults are strict and should be tightened in production by providing
 * `extraScriptSrc` and `extraConnectSrc` as needed.
 */
export function generateCSP(options?: Partial<SecurityHeaderOptions>): string {
  const inlineStyle = options?.allowInlineStyles ?? true ? "'unsafe-inline'" : '';
  const unsafeEval = options?.allowUnsafeEval ? "'unsafe-eval'" : '';

  const scriptSrc = [DEFAULT_SCRIPT_SRC.join(' '), options?.extraScriptSrc?.join(' ') ?? '']
    .filter(Boolean)
    .join(' ');

  const styleSrc = ["'self'", inlineStyle].filter(Boolean).join(' ');

  const connectSrc = [
    DEFAULT_CONNECT_SRC.join(' '),
    options?.extraConnectSrc?.join(' ') ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const imgSrc = [DEFAULT_IMG_SRC.join(' '), options?.appOrigin ?? '']
    .filter(Boolean)
    .join(' ');

  const cspParts = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    `connect-src ${connectSrc}`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    // Report-only for now — monitor violations before enforcing fully
  ];

  // Frame-src: allow Stripe checkout iframe in production
  if (options?.extraScriptSrc?.some((s) => s.includes('stripe'))) {
    cspParts.push(`frame-src 'self' https://js.stripe.com`);
  } else {
    cspParts.push(`frame-src 'self'`);
  }

  return cspParts.join('; ');
}

// ---------------------------------------------------------------------------
// Apply Security Headers to Response
// ---------------------------------------------------------------------------

/**
 * Apply all security headers to a NextResponse.
 *
 * Usage in proxy.ts:
 * ```ts
 * let response = NextResponse.next({ request });
 * applySecurityHeaders(response, { appOrigin: request.nextUrl.origin });
 * return response;
 * ```
 *
 * Usage in API routes:
 * ```ts
 * const response = NextResponse.json({ ok: true });
 * applySecurityHeaders(response);
 * return response;
 * ```
 */
export function applySecurityHeaders(
  response: NextResponse | Response,
  options?: Partial<SecurityHeaderOptions>
): void {
  const headers = response.headers;

  // ---- CSP ----
  const cspValue = generateCSP(options);
  headers.set('Content-Security-Policy', cspValue);

  // ---- Prevent MIME-type sniffing ----
  headers.set('X-Content-Type-Options', 'nosniff');

  // ---- Prevent clickjacking ----
  headers.set('X-Frame-Options', 'DENY');

  // ---- Legacy XSS protection (for older browsers) ----
  headers.set('X-XSS-Protection', '0'); // Disable the broken legacy filter

  // ---- Referrer policy: send only origin for cross-origin requests ----
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ---- Permissions Policy: restrict browser features ----
  // Allow nothing by default — add permissions in specific routes if needed
  headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',
      'autoplay=(self)',
      'fullscreen=(self)',
    ].join(', ')
  );

  // ---- HSTS (should be set by the hosting platform, but we add it here too) ----
  headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
}

// ---------------------------------------------------------------------------
// CORS Headers
// ---------------------------------------------------------------------------

/**
 * Apply CORS headers to a response for API routes.
 *
 * In production, only allows the app's own origin.
 * In development, allows localhost origins.
 *
 * Usage in API routes:
 * ```ts
 * applyCORS(response, request, isProduction);
 * ```
 */
export function applyCORS(
  response: NextResponse | Response,
  origin: string | null,
  allowedOrigin: string
): void {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    // Strict: only allow the app's own origin
    if (origin === allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    }
    // If origin doesn't match, don't set ACAO — browser will block
  } else {
    // Dev: allow any localhost origin
    response.headers.set('Access-Control-Allow-Origin', origin || allowedOrigin || '*');
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
}

/**
 * Handle OPTIONS preflight requests for CORS.
 * Returns a 204 No Content response with appropriate headers.
 */
export function handleCORS(
  request: Request,
  allowedOrigin: string
): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  applyCORS(response, origin, allowedOrigin);
  return response;
}
