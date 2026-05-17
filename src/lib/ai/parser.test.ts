import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the 'ai' module before importing the parser
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('./provider', () => ({
  getModel: vi.fn(() => 'mock-model'),
}));

vi.mock('./model-router', () => ({
  MODEL_IDS: { cheap: 'mock-cheap', standard: 'mock-standard', premium: 'mock-premium' },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { parseInput, reparseWithClarification } from './parser';
import { generateText } from 'ai';

const mockGenerateText = generateText as ReturnType<typeof vi.fn>;

function mockAIResponse(json: Record<string, unknown>) {
  mockGenerateText.mockResolvedValue({ text: JSON.stringify(json) });
}

function mockAIText(text: string) {
  mockGenerateText.mockResolvedValue({ text });
}

function mockAIError(msg: string) {
  mockGenerateText.mockRejectedValue(new Error(msg));
}

describe('parseInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Empty / edge inputs ----

  it('returns emptyResult for empty string', async () => {
    const result = await parseInput('');
    expect(result.needsClarification).toBe(true);
    expect(result.confidence).toBe('low');
    expect(result.topic).toBe('');
  });

  it('returns emptyResult for whitespace-only input', async () => {
    const result = await parseInput('   \n  ');
    expect(result.needsClarification).toBe(true);
  });

  // ---- Successful parse (raw JSON) ----

  it('parses a complete math workbook request', async () => {
    mockAIResponse({
      subject: 'math',
      topic: 'Adding Fractions',
      gradeLevel: '4',
      questionCount: 20,
      questionTypes: ['multiple_choice', 'short_answer'],
      difficulty: 'grade_level',
      confidence: 'high',
      needsClarification: false,
      clarificationQuestion: '',
    });

    const result = await parseInput('20 adding fractions questions for 4th grade');
    expect(result.subject).toBe('math');
    expect(result.topic).toBe('Adding Fractions');
    expect(result.gradeLevel).toBe('4');
    expect(result.questionCount).toBe(20);
    expect(result.confidence).toBe('high');
    expect(result.needsClarification).toBe(false);
  });

  it('parses a science request with different types', async () => {
    mockAIResponse({
      subject: 'science',
      topic: 'Photosynthesis',
      gradeLevel: '7',
      questionCount: 15,
      questionTypes: ['multiple_choice', 'essay'],
      difficulty: 'grade_level',
      confidence: 'high',
      needsClarification: false,
    });

    const result = await parseInput('photosynthesis quiz 7th grade');
    expect(result.subject).toBe('science');
    expect(result.questionCount).toBe(15);
  });

  it('parses K grade level correctly', async () => {
    mockAIResponse({
      subject: 'ela',
      topic: 'Letter Recognition',
      gradeLevel: 'K',
      questionCount: 10,
      questionTypes: ['multiple_choice'],
      difficulty: 'basic',
      confidence: 'high',
      needsClarification: false,
    });

    const result = await parseInput('letter recognition for kindergarten');
    expect(result.gradeLevel).toBe('K');
    expect(result.difficulty).toBe('basic');
  });

  // ---- JSON in markdown fence ----

  it('extracts JSON from markdown code fence', async () => {
    mockAIText('```json\n{"subject":"math","topic":"Decimals","gradeLevel":"5","questionCount":25,"questionTypes":["fill_blank","short_answer"],"difficulty":"grade_level","confidence":"medium","needsClarification":false}\n```');

    const result = await parseInput('decimal worksheets grade 5');
    expect(result.subject).toBe('math');
    expect(result.topic).toBe('Decimals');
    expect(result.questionCount).toBe(25);
  });

  it('extracts JSON from fence without json tag', async () => {
    mockAIText('```\n{"subject":"ela","topic":"Reading Comprehension","gradeLevel":"6","questionCount":10,"questionTypes":["short_answer"],"difficulty":"grade_level","confidence":"medium","needsClarification":false}\n```');

    const result = await parseInput('reading comp 6th');
    expect(result.subject).toBe('ela');
  });

  // ---- JSON buried in text ----

  it('extracts JSON object from surrounding text', async () => {
    mockAIText('Here is the parsed result:\n{"subject":"social_studies","topic":"Civil War","gradeLevel":"8","questionCount":12,"questionTypes":["multiple_choice","essay"],"difficulty":"advanced","confidence":"high","needsClarification":false}\nHope this helps!');

    const result = await parseInput('civil war test 8th grade advanced');
    expect(result.subject).toBe('social_studies');
    expect(result.difficulty).toBe('advanced');
  });

  // ---- Normalization (boundary values) ----

  it('clamps questionCount to 1-50 range', async () => {
    mockAIResponse({
      subject: 'math',
      topic: 'Test',
      gradeLevel: '3',
      questionCount: 100,
      questionTypes: ['multiple_choice'],
      difficulty: 'grade_level',
      confidence: 'high',
      needsClarification: false,
    });

    const result = await parseInput('100 math questions');
    expect(result.questionCount).toBe(50);
  });

  it('defaults questionCount to 20 when not a number', async () => {
    mockAIResponse({
      subject: 'math',
      topic: 'Test',
      gradeLevel: '3',
      questionCount: 'lots',
      questionTypes: ['multiple_choice'],
      difficulty: 'grade_level',
      confidence: 'high',
      needsClarification: false,
    });

    const result = await parseInput('some math questions');
    expect(result.questionCount).toBe(20);
  });

  it('filters invalid question types', async () => {
    mockAIResponse({
      subject: 'math',
      topic: 'Test',
      gradeLevel: '3',
      questionCount: 10,
      questionTypes: ['multiple_choice', 'invalid_type', 'essay'],
      difficulty: 'grade_level',
      confidence: 'high',
      needsClarification: false,
    });

    const result = await parseInput('mixed question types');
    expect(result.questionTypes).toContain('multiple_choice');
    expect(result.questionTypes).toContain('essay');
    expect(result.questionTypes).not.toContain('invalid_type');
  });

  it('defaults to ALL_TYPES when questionTypes is empty array', async () => {
    mockAIResponse({
      subject: 'math',
      topic: 'Test',
      gradeLevel: '3',
      questionCount: 10,
      questionTypes: [],
      difficulty: 'grade_level',
      confidence: 'high',
      needsClarification: false,
    });

    const result = await parseInput('questions');
    expect(result.questionTypes.length).toBeGreaterThanOrEqual(4);
  });

  it('defaults invalid subject to other', async () => {
    mockAIResponse({
      subject: 'music',
      topic: 'Scales',
      gradeLevel: '5',
      questionCount: 10,
      questionTypes: ['multiple_choice'],
      difficulty: 'grade_level',
      confidence: 'high',
      needsClarification: false,
    });

    const result = await parseInput('music theory questions');
    expect(result.subject).toBe('other');
  });

  // ---- Low confidence / clarification ----

  it('returns needsClarification=true for low confidence', async () => {
    mockAIResponse({
      subject: '',
      topic: '',
      gradeLevel: '',
      questionCount: 20,
      questionTypes: ['multiple_choice'],
      difficulty: 'grade_level',
      confidence: 'low',
      needsClarification: true,
      clarificationQuestion: 'What subject and grade level is this for?',
    });

    const result = await parseInput('make me some worksheets');
    expect(result.needsClarification).toBe(true);
    expect(result.confidence).toBe('low');
    expect(result.clarificationQuestion).toBe('What subject and grade level is this for?');
  });

  // ---- AI failure fallback ----

  it('returns emptyResult when AI call fails', async () => {
    mockAIError('API key invalid');
    const result = await parseInput('fractions grade 4');
    expect(result.needsClarification).toBe(true);
    expect(result.confidence).toBe('low');
  });

  it('returns emptyResult when AI response cannot be parsed', async () => {
    mockAIText('Sorry, I cannot process this request. Please try again.');
    const result = await parseInput('weird input !@#$%');
    expect(result.needsClarification).toBe(true);
    expect(result.topic).toBe('');
  });
});

// ---- reparseWithClarification ----

describe('reparseWithClarification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('combines original input with clarification answer', async () => {
    mockAIResponse({
      subject: 'math',
      topic: 'Multiplication',
      gradeLevel: '3',
      questionCount: 15,
      questionTypes: ['multiple_choice', 'fill_blank'],
      difficulty: 'grade_level',
      confidence: 'high',
      needsClarification: false,
    });

    const result = await reparseWithClarification(
      'multiplication worksheets',
      '3rd grade, basic multiplication facts'
    );

    expect(result.subject).toBe('math');
    expect(result.gradeLevel).toBe('3');
  });
});
