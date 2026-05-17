import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Supabase Auth Callback Route Handler.
 *
 * Handles the OAuth / magic-link redirect from Supabase.
 * Exchanges the `code` query parameter for a session, stores it in cookies,
 * and redirects the user to the dashboard.
 *
 * GET /auth/callback?code=<auth_code>
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // If there's no code, redirect to login with an error
  if (!code) {
    const error = searchParams.get('error_description') ?? 'Authentication failed';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, origin)
    );
  }

  // Exchange the auth code for a session
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
    );
  }

  // Successful authentication — redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', origin));
}
