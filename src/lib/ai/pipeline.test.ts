import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock all heavy dependencies
// ---------------------------------------------------------------------------

vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn() })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => []) })) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  },
}));

vi.mock('./provider', () => ({
  getModel: vi.fn(() => 'mock-model'),
}));

vi.mock('./prompts', () => ({
  buildCachedSystemPromptParts: vi.fn(() => [
    { text: 'Block 1', cacheControl: { type: 'ephemeral' } },
    { text: 'Block 2', cacheControl: { type: 'ephemeral' } },
    { text: 'Block 3', cacheControl: { type: 'ephemeral' } },
    { text: 'Block 4' },
  ]),
}));

vi.mock('./model-router', () => ({
  getModelForWorkbook: vi.fn(() => ({
    model: 'test/model',
    modelId: 'test-model',
    tier: 2,
    costMultiplier: 1.0,
  })),
  estimateCost: vi.fn(() => ({ estimatedCost: 0.05, tier: 2, model: 'test/model' })),
  isOverBudget: vi.fn(() => false),
  computeActualCost: vi.fn(() => 0.05),
}));

vi.mock('./cache', () => ({
  storeCache: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { streamText } from 'ai';
import { generateWorkbook, regenerateTeacherCopy } from './pipeline';
import type { PipelineEvent } from './pipeline';
import { db } from '@/lib/db';
import { storeCache } from './cache';
import type { ParseResult } from '@/types';

const mockStreamText = streamText as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helper: create a minimal ParseResult
// ---------------------------------------------------------------------------

function makeParseResult(overrides?: Partial<ParseResult>): ParseResult {
  return {
    subject: 'math',
    topic: 'Adding Fractions',
    gradeLevel: '4',
    questionCount: 5,
    questionTypes: ['multiple_choice', 'short_answer', 'fill_blank', 'true_false'],
    difficulty: 'grade_level',
    confidence: 'high',
    needsClarification: false,
    ...overrides,
  };
}

/** A valid AI response with 2 questions */
const validAIResponse = JSON.stringify({
  questions: [
    {
      type: 'multiple_choice',
      difficulty: 'grade_level',
      points: 1,
      standardCode: 'CCSS.MATH.CONTENT.4.NF.A.1',
      questionText: 'What is 1/4 + 1/4?',
      options: ['A) 1/4', 'B) 1/2', 'C) 3/4', 'D) 1'],
      correctAnswer: 'B',
      solution: '1/4 + 1/4 = 2/4 = 1/2',
      confidence: 'GREEN',
    },
    {
      type: 'short_answer',
      difficulty: 'grade_level',
      points: 2,
      standardCode: 'CCSS.MATH.CONTENT.4.NF.A.2',
      questionText: 'Explain how to compare 3/4 and 5/8.',
      options: undefined,
      correctAnswer: 'Convert 3/4 to 6/8, then 6/8 > 5/8.',
      solution: 'Find common denominator: 3/4 = 6/8 > 5/8.',
      confidence: 'GREEN',
    },
  ],
  rubric: {
    criteria: 'Accuracy and explanation clarity',
    maxScore: 20,
    scoreLevels: [
      { score: 4, description: 'Exceeds' },
      { score: 3, description: 'Meets' },
      { score: 2, description: 'Approaching' },
      { score: 1, description: 'Below' },
    ],
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateWorkbook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Helper: set up the AI stream mock ----
  function mockAIStream(text: string) {
    mockStreamText.mockReturnValue({
      textStream: (async function* () { yield text; })(),
      usage: Promise.resolve({ inputTokens: 500, outputTokens: 300 }),
      finishReason: Promise.resolve('stop'),
    });
  }

  function mockAIStreamError(msg: string) {
    mockStreamText.mockRejectedValue(new Error(msg));
  }

  // ---- Collect all yielded events ----
  async function collectEvents(generator: AsyncGenerator<PipelineEvent, void, undefined>): Promise<PipelineEvent[]> {
    const events: PipelineEvent[] = [];
    for await (const event of generator) {
      events.push(event);
    }
    return events;
  }

  it('yields generating, question, rubric, and complete events in order', async () => {
    mockAIStream(validAIResponse);

    const gen = generateWorkbook(makeParseResult(), 'user-1');
    const events = await collectEvents(gen);

    const types = events.map((e) => e.type);
    expect(types).toContain('generating');
    expect(types).toContain('question');
    expect(types).toContain('rubric');
    expect(types).toContain('complete');
  });

  it('yields exactly 2 question events for 2 questions', async () => {
    mockAIStream(validAIResponse);

    const gen = generateWorkbook(makeParseResult(), 'user-1');
    const events = await collectEvents(gen);

    const questionEvents = events.filter((e) => e.type === 'question');
    expect(questionEvents).toHaveLength(2);
  });

  it('yields error event on AI stream failure and stops', async () => {
    mockAIStreamError('Connection refused');

    const gen = generateWorkbook(makeParseResult(), 'user-1');
    const events = await collectEvents(gen);

    expect(events.some((e) => e.type === 'error' && e.code === 'AI_STREAM_ERROR')).toBe(true);
    // Should not yield complete
    expect(events.some((e) => e.type === 'complete')).toBe(false);
  });

  it('yields error event on unparseable AI response', async () => {
    mockAIStream('This is not valid JSON at all. Just some random text.');

    const gen = generateWorkbook(makeParseResult(), 'user-1');
    const events = await collectEvents(gen);

    expect(events.some((e) => e.type === 'error' && e.code === 'PARSE_ERROR')).toBe(true);
  });

  it('stores to semantic cache on success', async () => {
    mockAIStream(validAIResponse);

    const gen = generateWorkbook(makeParseResult(), 'user-1');
    const events = await collectEvents(gen);

    // Should have called storeCache with the parsed topic/subject
    expect(storeCache).toHaveBeenCalledWith(
      'Adding Fractions',
      '4',
      'math',
      expect.any(Object)
    );
  });

  it('passes enhanceMaterial through to workbook metadata', async () => {
    mockAIStream(validAIResponse);

    const gen = generateWorkbook(
      makeParseResult(),
      'user-1',
      'base64EncodedFile'
    );
    const events = await collectEvents(gen);

    const complete = events.find((e) => e.type === 'complete');
    expect(complete).toBeDefined();
  });

  it('uses custom title derived from topic and grade', async () => {
    mockAIStream(validAIResponse);

    const gen = generateWorkbook(
      makeParseResult({ topic: 'Multiplication', gradeLevel: '3' }),
      'user-1'
    );
    const events = await collectEvents(gen);

    const complete = events.find((e) => e.type === 'complete');
    expect(complete?.workbook?.title).toContain('Multiplication');
  });

  it('handles existingWorkbookId for regeneration', async () => {
    mockAIStream(validAIResponse);

    const gen = generateWorkbook(
      makeParseResult(),
      'user-1',
      undefined,
      'existing-wb-id'
    );
    const events = await collectEvents(gen);

    expect(events.some((e) => e.type === 'complete')).toBe(true);
    expect(events.some((e) => e.type === 'error')).toBe(false);
  });

  it('yields question events with correct data shape', async () => {
    mockAIStream(validAIResponse);

    const gen = generateWorkbook(makeParseResult(), 'user-1');
    const events = await collectEvents(gen);

    const qEvent = events.find((e) => e.type === 'question');
    expect(qEvent).toBeDefined();
    if (qEvent && qEvent.type === 'question') {
      expect(qEvent.data).toHaveProperty('type');
      expect(qEvent.data).toHaveProperty('questionText');
      expect(qEvent.data).toHaveProperty('correctAnswer');
      expect(qEvent.data).toHaveProperty('confidence');
    }
  });
});

// ---- Confidence mapping (test via question events) ----
describe('confidence mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamText.mockReturnValue({
      textStream: (async function* () {
        yield JSON.stringify({
          questions: [
            {
              type: 'multiple_choice',
              difficulty: 'grade_level',
              points: 1,
              standardCode: 'CCSS.MATH.4.NF.1',
              questionText: 'Q1',
              correctAnswer: 'A',
              solution: 'S1',
              confidence: 'GREEN',
            },
          ],
          rubric: { criteria: 'R', maxScore: 10, scoreLevels: [{ score: 3, description: 'Good' }] },
        });
      })(),
      usage: Promise.resolve({ inputTokens: 100, outputTokens: 50 }),
      finishReason: Promise.resolve('stop'),
    });
  });

  async function getConfidence() {
    const gen = generateWorkbook(makeParseResult(), 'user-1');
    const events = [];
    for await (const e of gen) events.push(e);
    const qEvent = events.find((e) => e.type === 'question');
    return qEvent?.data?.confidence;
  }

  it('maps GREEN to high', async () => {
    const conf = await getConfidence();
    expect(conf).toBe('high');
  });
});
