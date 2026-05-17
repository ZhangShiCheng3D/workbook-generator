/**
 * 3-Tier Model Router — Multi-Provider with OpenRouter Catalog
 *
 * DESIGN.html 8.3: Route questions by complexity to balance cost and quality.
 *
 * Supports three providers via auto-detection (see provider.ts):
 *   deepseek   — DeepSeek direct API (Chat V3 / Reasoner R1)
 *   openrouter — OpenRouter unified API (300+ models, OpenAI-compatible)
 *   anthropic  — Anthropic direct API (Claude Haiku / Sonnet / Opus)
 *
 * OpenRouter model IDs use the format `provider/model-name`:
 *   Tier 1: google/gemini-2.5-flash
 *   Tier 2: openai/gpt-4o / anthropic/claude-sonnet-4-20250514
 *   Tier 3: openai/gpt-4.1 / anthropic/claude-opus-4-20250514
 */

import type { QuestionType, Difficulty } from '@/types';
import { getActiveProvider, type Provider } from './provider';

// ---------------------------------------------------------------------------
// Model Catalog — maps (provider, tier) → (model_id, model_alias)
// ---------------------------------------------------------------------------

interface ModelEntry {
  /** The model ID passed to the AI SDK */
  id: string;
  /** Human-readable alias shown in logs */
  alias: string;
}

interface TierCatalog {
  cheap: ModelEntry;
  standard: ModelEntry;
  premium: ModelEntry;
}

const CATALOG: Record<Provider, TierCatalog> = {
  deepseek: {
    // DeepSeek direct API only offers two models: chat (V3) and reasoner (R1).
    // Both cheap and standard tiers use deepseek-chat — the cost difference
    // between tiers comes from routing logic (not model), since V3 is already
    // very affordable ($0.27/M input). For full 3-tier separation, use OpenRouter
    // which proxies DeepSeek models alongside 300+ others.
    cheap:    { id: 'deepseek-chat',      alias: 'DeepSeek Chat V3' },
    standard: { id: 'deepseek-chat',      alias: 'DeepSeek Chat V3' },
    premium:  { id: 'deepseek-reasoner',  alias: 'DeepSeek Reasoner R1' },
  },
  openrouter: {
    cheap:    { id: 'google/gemini-2.5-flash',                        alias: 'Gemini 2.5 Flash' },
    standard: { id: 'anthropic/claude-sonnet-4-20250514',             alias: 'Claude Sonnet 4' },
    premium:  { id: 'openai/gpt-4.1',                                 alias: 'GPT-4.1' },
  },
  anthropic: {
    cheap:    { id: 'claude-haiku-4-5-20251001',   alias: 'Claude Haiku 4.5' },
    standard: { id: 'claude-sonnet-4-6-20251001',  alias: 'Claude Sonnet 4.6' },
    premium:  { id: 'claude-opus-4-7-20251001',    alias: 'Claude Opus 4.7' },
  },
};

// ---------------------------------------------------------------------------
// Pricing — per-provider, per-model USD per 1M tokens
// ---------------------------------------------------------------------------

interface Pricing { input: number; output: number }

const PRICING: Record<Provider, Record<string, Pricing>> = {
  deepseek: {
    'deepseek-chat':     { input: 0.27, output: 1.10 },
    'deepseek-reasoner': { input: 0.55, output: 2.19 },
  },
  openrouter: {
    'google/gemini-2.5-flash':            { input: 0.15, output: 0.60 },
    'anthropic/claude-sonnet-4-20250514': { input: 3.00, output: 15.0 },
    'openai/gpt-4.1':                     { input: 2.00, output: 8.00 },
    'openai/gpt-4o':                      { input: 2.50, output: 10.0 },
    'openai/gpt-4o-mini':                 { input: 0.15, output: 0.60 },
    'anthropic/claude-haiku-4-5':         { input: 0.80, output: 4.00 },
    'anthropic/claude-opus-4-20250514':   { input: 15.0, output: 75.0 },
    'meta-llama/llama-4-maverick':        { input: 0.20, output: 0.60 },
    'mistralai/mistral-large':            { input: 2.00, output: 6.00 },
    'xai/grok-3-beta':                    { input: 3.00, output: 15.0 },
  },
  anthropic: {
    'claude-haiku-4-5-20251001':  { input: 0.80, output: 4.00 },
    'claude-sonnet-4-6-20251001': { input: 3.00, output: 15.0 },
    'claude-opus-4-7-20251001':   { input: 15.0, output: 75.0 },
  },
};

// ---------------------------------------------------------------------------
// Exported model IDs (convenience)
// ---------------------------------------------------------------------------

function activeCatalog(): TierCatalog {
  return CATALOG[getActiveProvider()];
}

export const MODEL_IDS = {
  cheap:    activeCatalog().cheap.id,
  standard: activeCatalog().standard.id,
  premium:  activeCatalog().premium.id,
};

export const MODELS = {
  cheap:    `${getActiveProvider()}/${MODEL_IDS.cheap}`,
  standard: `${getActiveProvider()}/${MODEL_IDS.standard}`,
  premium:  `${getActiveProvider()}/${MODEL_IDS.premium}`,
} as const;

// ---------------------------------------------------------------------------
// Cost multipliers (relative to cheapest = 1.0, for budget estimation)
// ---------------------------------------------------------------------------

function computeMultipliers(): Record<string, number> {
  const provider = getActiveProvider();
  const cat = CATALOG[provider];
  const pricing = PRICING[provider];
  const cheapPrice = pricing[cat.cheap.id]?.input ?? 1;
  return {
    [cat.cheap.id]:    1.0,
    [cat.standard.id]: (pricing[cat.standard.id]?.input ?? 1) / cheapPrice,
    [cat.premium.id]:  (pricing[cat.premium.id]?.input ?? 1) / cheapPrice,
  };
}

// ---------------------------------------------------------------------------
// Tier classification
// ---------------------------------------------------------------------------

export type ModelTier = 1 | 2 | 3;

export interface RoutingResult {
  model: string;
  modelId: string;
  tier: ModelTier;
  costMultiplier: number;
}

const TIER_1_TYPES: Set<QuestionType> = new Set([
  'multiple_choice', 'true_false', 'fill_blank',
]);

const TIER_2_TYPES: Set<QuestionType> = new Set([
  'short_answer', 'matching',
]);

const TIER_3_TYPES: Set<QuestionType> = new Set(['essay']);

function tierToModel(tier: ModelTier): { model: string; modelId: string } {
  const cat = activeCatalog();
  const provider = getActiveProvider();
  switch (tier) {
    case 1: return { model: `${provider}/${cat.cheap.id}`,    modelId: cat.cheap.id };
    case 2: return { model: `${provider}/${cat.standard.id}`, modelId: cat.standard.id };
    case 3: return { model: `${provider}/${cat.premium.id}`,  modelId: cat.premium.id };
  }
}

export function routeModel(questionType: QuestionType, difficulty: Difficulty): RoutingResult {
  let tier: ModelTier;

  if (TIER_1_TYPES.has(questionType)) tier = 1;
  else if (TIER_2_TYPES.has(questionType)) tier = 2;
  else if (TIER_3_TYPES.has(questionType)) tier = 3;
  else tier = 2;

  if (difficulty === 'advanced' && tier < 3) tier = (tier + 1) as ModelTier;
  if (difficulty === 'basic' && tier > 1) tier = (tier - 1) as ModelTier;

  const { model, modelId } = tierToModel(tier);
  const multipliers = computeMultipliers();
  return { model, modelId, tier, costMultiplier: multipliers[modelId] ?? 1 };
}

export function getModelForWorkbook(
  questionTypes: QuestionType[],
  difficulty: Difficulty
): RoutingResult {
  const hasTier3 = questionTypes.some((t) => TIER_3_TYPES.has(t));
  const allTier1 = questionTypes.every((t) => TIER_1_TYPES.has(t));

  if (hasTier3) {
    const { model, modelId } = tierToModel(3);
    const multipliers = computeMultipliers();
    return { model, modelId, tier: 3, costMultiplier: multipliers[modelId] ?? 1 };
  }
  if (allTier1 && difficulty === 'basic') {
    const { model, modelId } = tierToModel(1);
    const multipliers = computeMultipliers();
    return { model, modelId, tier: 1, costMultiplier: multipliers[modelId] ?? 1 };
  }

  const { model, modelId } = tierToModel(2);
  const multipliers = computeMultipliers();
  return { model, modelId, tier: 2, costMultiplier: multipliers[modelId] ?? 1 };
}

export function getModelForRubric(): RoutingResult {
  const { model, modelId } = tierToModel(3);
  const multipliers = computeMultipliers();
  return { model, modelId, tier: 3, costMultiplier: multipliers[modelId] ?? 1 };
}

export function getModelForParsing(): RoutingResult {
  const { model, modelId } = tierToModel(1);
  const multipliers = computeMultipliers();
  return { model, modelId, tier: 1, costMultiplier: multipliers[modelId] ?? 1 };
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

export function estimateCost(
  questionCount: number,
  questionTypes: QuestionType[],
  difficulty: Difficulty,
  avgInputTokens: number = 6000,
  avgOutputTokens: number = 2000
): { estimatedCost: number; tier: ModelTier; model: string } {
  const routing = getModelForWorkbook(questionTypes, difficulty);
  const provider = getActiveProvider();
  const price = PRICING[provider][routing.modelId] ?? { input: 1.0, output: 5.0 };

  const inputCost = (avgInputTokens / 1_000_000) * price.input;
  const outputCost = (avgOutputTokens / 1_000_000) * price.output;

  return {
    estimatedCost: Math.round((inputCost + outputCost) * 10000) / 10000,
    tier: routing.tier,
    model: routing.model,
  };
}

export function isOverBudget(estimatedCost: number, threshold: number = 0.15): boolean {
  return estimatedCost > threshold;
}

/**
 * Compute actual cost from token usage and model pricing.
 * Uses per-provider pricing table.
 */
export function computeActualCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const provider = getActiveProvider();

  // model string is like "deepseek/deepseek-chat" or "openrouter/openai/gpt-4o"
  // Extract the actual model ID from the routing result
  const modelId = model.includes('/') ? model.split('/').slice(1).join('/') : model;

  const price = PRICING[provider]?.[modelId] ?? { input: 1.0, output: 5.0 };
  const inputCost = (promptTokens / 1_000_000) * price.input;
  const outputCost = (completionTokens / 1_000_000) * price.output;

  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
