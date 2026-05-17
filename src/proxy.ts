import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { applySecurityHeaders } from '@/lib/security';
import { APP_ORIGIN } from '@/lib/env';

/**
 * Next.js 16.2 Auth Proxy (formerly known as Middleware).
 *
 * Protects /dashboard/* routes, handles session refresh, applies security
 * headers and CORS headers to all responses.
 *
 * The `proxy` file convention replaces the deprecated `middleware` in Next.js 16.0+.
 *
 * See: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 */
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyProxyHeaders(response: NextResponse, requestOrigin: string | null): void {
  applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
  applyCORSHeaders(response, requestOrigin);
}

function applyCORSHeaders(response: NextResponse, requestOrigin: string | null): void {
  if (requestOrigin === APP_ORIGIN || process.env.NODE_ENV !== 'production') {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin || APP_ORIGIN || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
  }
}

export async function proxy(request: NextRequest) {
  // Start with a passthrough response that we may modify
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ---- Apply security and CORS headers ----
  applyProxyHeaders(response, request.headers.get('origin'));

  // Skip auth checks when Supabase is not configured (dev mode)
  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-url') {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Apply cookie names/values to the incoming request so future reads see them.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // Re-create the response and attach cookies so the browser gets updated values
        response = NextResponse.next({ request });
        applyProxyHeaders(response, request.headers.get('origin'));

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh the Supabase auth session.
  // This reads the cookies set by Supabase SSR and refreshes if near expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // --- Route protection ---

  // Auth callback must always pass through (handles OAuth code exchange)
  if (pathname.startsWith('/auth/callback')) {
    return response;
  }

  // Protected routes: /dashboard/*
  if (pathname.startsWith('/dashboard') && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is already authenticated, redirect away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

/**
 * Routes the proxy runs on.
 * Excludes static files, images, and API routes (which handle their own auth).
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
