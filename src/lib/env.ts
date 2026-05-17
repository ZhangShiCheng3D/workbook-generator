/**
 * Environment Variable Validation
 *
 * Uses Zod to validate environment variables at import time. Exports a typed
 * `env` object that is guaranteed to have all required values.
 *
 * Missing required variables throw an error at startup.
 * Missing optional variables log a warning.
 *
 * DESIGN.html §11: Environment configuration — validated at boot, not at runtime
 */

import { z } from 'zod';
import { log } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // ---- Required ----
  // No strictly required variables for MVP (app works in dev mode without Supabase)

  // ---- Supabase (optional in dev) ----
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // ---- AI Providers (at least one recommended) ----
  DEEPSEEK_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),

  // ---- App ----
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // ---- Optional: Stripe ----
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Parse process.env into a typed object. */
function parseEnv() {
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error;
    log.error('Environment validation failed', { errors: errors });
    throw new Error(
      `Invalid environment variables:\n${JSON.stringify(errors, null, 2)}`
    );
  }

  return result.data;
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

function warnMissingOptionals(parsed: ReturnType<typeof parseEnv>) {
  const warnings: string[] = [];

  if (
    !parsed.NEXT_PUBLIC_SUPABASE_URL ||
    parsed.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url'
  ) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL: Supabase not configured — running in dev mode with SQLite');
  }

  if (
    !parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-supabase-anon-key'
  ) {
    warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anonymous key not set');
  }

  const hasAiKey =
    !!parsed.DEEPSEEK_API_KEY ||
    !!parsed.OPENROUTER_API_KEY ||
    !!parsed.ANTHROPIC_API_KEY ||
    !!parsed.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!hasAiKey) {
    warnings.push('No AI provider API key configured (DEEPSEEK_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY)');
  }

  if (parsed.NODE_ENV === 'production' && !parsed.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY: Not set — payments will not work in production');
  }

  for (const warning of warnings) {
    log.warn(warning);
  }
}

// ---------------------------------------------------------------------------
// Exported `env` object
// ---------------------------------------------------------------------------

const validatedEnv = parseEnv();
warnMissingOptionals(validatedEnv);

export const env = validatedEnv;
export type Env = typeof env;

/**
 * Convenience helpers for checking the current environment.
 */
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/**
 * The app's canonical origin URL (no trailing slash).
 */
export const APP_ORIGIN = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

/**
 * Whether Supabase is properly configured (not the placeholder value).
 */
export const isSupabaseConfigured =
  !!env.NEXT_PUBLIC_SUPABASE_URL &&
  env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url' &&
  !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

/**
 * Whether at least one AI provider is configured.
 */
export const hasAIProvider =
  !!env.DEEPSEEK_API_KEY ||
  !!env.OPENROUTER_API_KEY ||
  !!env.ANTHROPIC_API_KEY ||
  !!env.GOOGLE_GENERATIVE_AI_API_KEY;
