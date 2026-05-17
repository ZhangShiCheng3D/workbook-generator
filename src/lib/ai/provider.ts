/**
 * AI Provider Configuration — Multi-Provider with Auto-Detection
 *
 * Priority: DeepSeek (direct) > OpenRouter (unified, 300+ models) > Anthropic (direct)
 *
 * OpenRouter provides OpenAI-compatible access to all mainstream LLMs:
 * OpenAI, Anthropic, Google, DeepSeek, xAI, Meta, Mistral, Qwen, etc.
 * Set OPENROUTER_API_KEY to enable universal model access.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic';

export type Provider = 'deepseek' | 'openrouter' | 'anthropic';

// ---------------------------------------------------------------------------
// Provider instances (created once at module load)
// ---------------------------------------------------------------------------

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    'X-Title': 'Practice Packs',
  },
});

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

let _provider: Provider | null = null;

/** Determine which provider is active based on configured API keys. */
export function getActiveProvider(): Provider {
  if (_provider !== null) return _provider;

  if (process.env.DEEPSEEK_API_KEY) {
    _provider = 'deepseek';
  } else if (process.env.OPENROUTER_API_KEY) {
    _provider = 'openrouter';
  } else {
    _provider = 'anthropic';
  }

  return _provider;
}

/** Reset cached provider (for testing). */
export function resetProvider(): void {
  _provider = null;
}

// ---------------------------------------------------------------------------
// Model factory
// ---------------------------------------------------------------------------

/**
 * Return the Vercel AI SDK language model for the given model ID.
 *
 * For OpenRouter, model IDs use the format `provider/model-name`,
 * e.g. `openai/gpt-4o`, `anthropic/claude-sonnet-4-20250514`.
 *
 * For DeepSeek direct, model IDs are `deepseek-chat` or `deepseek-reasoner`.
 *
 * For Anthropic direct, model IDs are the Anthropic model string,
 * e.g. `claude-haiku-4-5-20251001`.
 */
export function getModel(modelId: string) {
  const provider = getActiveProvider();

  switch (provider) {
    case 'deepseek':
      return deepseek.chat(modelId);
    case 'openrouter':
      return openrouter.chat(modelId);
    case 'anthropic':
      return anthropicProvider(modelId);
  }
}
