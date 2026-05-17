import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {
  routeModel,
  getModelForWorkbook,
  getModelForParsing,
  getModelForRubric,
  estimateCost,
  isOverBudget,
  computeActualCost,
} from './model-router';
import { resetProvider, getActiveProvider } from './provider';
import type { QuestionType } from '@/types';

// Save and restore environment
const originalEnv = { ...process.env };

afterEach(() => {
  // Restore env and reset provider cache between each test
  process.env = { ...originalEnv, NODE_ENV: 'test' };
  resetProvider();
});

describe('Provider detection', () => {
  it('uses deepseek when DEEPSEEK_API_KEY is set', () => {
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    resetProvider();
    expect(getActiveProvider()).toBe('deepseek');
  });

  it('uses openrouter when only OPENROUTER_API_KEY is set', () => {
    delete process.env.DEEPSEEK_API_KEY;
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    delete process.env.ANTHROPIC_API_KEY;
    resetProvider();
    expect(getActiveProvider()).toBe('openrouter');
  });

  it('uses anthropic when no other keys are set', () => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    resetProvider();
    expect(getActiveProvider()).toBe('anthropic');
  });
});

describe('routeModel', () => {
  beforeAll(() => {
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    resetProvider();
  });

  it('routes multiple_choice to tier 1', () => {
    const r = routeModel('multiple_choice', 'grade_level');
    expect(r.tier).toBe(1);
  });

  it('routes true_false to tier 1', () => {
    const r = routeModel('true_false', 'grade_level');
    expect(r.tier).toBe(1);
  });

  it('routes fill_blank to tier 1', () => {
    const r = routeModel('fill_blank', 'grade_level');
    expect(r.tier).toBe(1);
  });

  it('routes short_answer to tier 2', () => {
    const r = routeModel('short_answer', 'grade_level');
    expect(r.tier).toBe(2);
  });

  it('routes matching to tier 2', () => {
    const r = routeModel('matching', 'grade_level');
    expect(r.tier).toBe(2);
  });

  it('routes essay to tier 3', () => {
    const r = routeModel('essay', 'grade_level');
    expect(r.tier).toBe(3);
  });

  it('upgrades tier for advanced difficulty', () => {
    const r = routeModel('multiple_choice', 'advanced');
    expect(r.tier).toBe(2);
  });

  it('downgrades tier for basic difficulty', () => {
    const r = routeModel('short_answer', 'basic');
    expect(r.tier).toBe(1);
  });

  it('does not exceed tier 3 for advanced essay', () => {
    const r = routeModel('essay', 'advanced');
    expect(r.tier).toBe(3);
  });

  it('returns a valid model string with provider prefix', () => {
    const r = routeModel('multiple_choice', 'grade_level');
    expect(r.model).toBeTruthy();
    expect(r.model).toContain('/');
  });

  it('returns modelId without provider prefix', () => {
    const r = routeModel('multiple_choice', 'grade_level');
    expect(r.modelId).toBeTruthy();
    expect(r.modelId).not.toContain('/');
  });
});

describe('getModelForWorkbook', () => {
  beforeAll(() => {
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    resetProvider();
  });

  it('uses tier 3 when essay type is present', () => {
    const r = getModelForWorkbook(
      ['multiple_choice', 'essay'] as QuestionType[],
      'grade_level'
    );
    expect(r.tier).toBe(3);
  });

  it('uses tier 1 for all tier-1 types with basic difficulty', () => {
    const r = getModelForWorkbook(
      ['multiple_choice', 'true_false'] as QuestionType[],
      'basic'
    );
    expect(r.tier).toBe(1);
  });

  it('uses tier 2 for mixed types', () => {
    const r = getModelForWorkbook(
      ['multiple_choice', 'short_answer'] as QuestionType[],
      'grade_level'
    );
    expect(r.tier).toBe(2);
  });
});

describe('getModelForParsing', () => {
  beforeAll(() => {
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    resetProvider();
  });

  it('always uses tier 1 (cheapest model)', () => {
    const r = getModelForParsing();
    expect(r.tier).toBe(1);
  });
});

describe('getModelForRubric', () => {
  beforeAll(() => {
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    resetProvider();
  });

  it('always uses tier 3 (best model)', () => {
    const r = getModelForRubric();
    expect(r.tier).toBe(3);
  });
});

describe('estimateCost', () => {
  beforeAll(() => {
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    resetProvider();
  });

  it('returns a valid model string', () => {
    const r = estimateCost(10, ['multiple_choice'] as QuestionType[], 'grade_level');
    expect(typeof r.estimatedCost).toBe('number');
    expect(r.model).toBeTruthy();
  });

  it('returns a valid tier', () => {
    const r = estimateCost(20, ['essay'] as QuestionType[], 'advanced');
    expect([1, 2, 3]).toContain(r.tier);
  });
});

describe('isOverBudget', () => {
  it('returns false for low cost', () => {
    expect(isOverBudget(0.05)).toBe(false);
  });

  it('returns true for high cost', () => {
    expect(isOverBudget(0.50)).toBe(true);
  });

  it('respects custom threshold', () => {
    expect(isOverBudget(0.20, 0.10)).toBe(true);
    expect(isOverBudget(0.20, 0.30)).toBe(false);
  });
});

describe('computeActualCost', () => {
  beforeAll(() => {
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    resetProvider();
  });

  it('returns a positive cost for non-zero tokens', () => {
    const r = getModelForWorkbook(['multiple_choice'] as QuestionType[], 'basic');
    const cost = computeActualCost(r.model, 6000, 2000);
    expect(cost).toBeGreaterThan(0);
  });

  it('returns 0 for zero tokens', () => {
    const r = getModelForWorkbook(['multiple_choice'] as QuestionType[], 'basic');
    const cost = computeActualCost(r.model, 0, 0);
    expect(cost).toBe(0);
  });
});

describe('OpenRouter provider catalog', () => {
  beforeAll(() => {
    delete process.env.DEEPSEEK_API_KEY;
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    resetProvider();
  });

  it('uses OpenRouter model IDs (provider/model-name format)', () => {
    const r = routeModel('multiple_choice', 'grade_level');
    expect(r.model).toContain('openrouter/');
    expect(r.modelId).toContain('/');
  });

  it('returns valid model IDs for all tiers', () => {
    const t1 = getModelForWorkbook(['multiple_choice'] as QuestionType[], 'basic');
    const t2 = getModelForWorkbook(['short_answer', 'multiple_choice'] as QuestionType[], 'grade_level');
    const t3 = getModelForWorkbook(['essay'] as QuestionType[], 'advanced');
    expect(t1.modelId).toBeTruthy();
    expect(t2.modelId).toBeTruthy();
    expect(t3.modelId).toBeTruthy();
  });
});
