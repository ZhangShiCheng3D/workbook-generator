/**
 * Natural Language Input Parser
 *
 * Parses teacher natural language into a structured ParseResult.
 * Uses generateText (not generateObject) for DeepSeek compatibility —
 * DeepSeek does not support response_format JSON mode.
 *
 * DESIGN.html 3.4:
 *   High confidence  → needsClarification=false, generate directly
 *   Medium confidence → needsClarification=false, generate + note assumptions
 *   Low confidence    → needsClarification=true, ask 1 lightweight question
 */

import { generateText } from 'ai';
import { getModel } from './provider';
import { MODEL_IDS } from './model-router';
import type { ParseResult, Confidence, Difficulty, Subject, QuestionType } from '@/types';
import { createLogger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger('ai/parser');

// ---------------------------------------------------------------------------
// Parser system prompt — instructs the model to output ONLY a JSON object
// ---------------------------------------------------------------------------

const PARSER_SYSTEM_PROMPT = `You are a parser that extracts structured workbook parameters from K-12 teacher requests. Output ONLY a valid JSON object with these fields:

{
  "subject": "math" | "ela" | "science" | "social_studies" | "other",
  "topic": "string (precise topic name, e.g. 'Adding Fractions', 'Cell Organelles')",
  "gradeLevel": "string (K, 1, 2, ..., 12, 6-8, 9-12, or empty if unknown)",
  "questionCount": number (1-50, default 20),
  "questionTypes": ["multiple_choice" | "true_false" | "fill_blank" | "short_answer" | "essay" | "matching"],
  "difficulty": "basic" | "grade_level" | "advanced",
  "confidence": "high" | "medium" | "low",
  "needsClarification": boolean,
  "clarificationQuestion": "string (only if needsClarification=true, else empty)"
}

## Rules

subject: fractions/multiplication/slope/algebra/geometry → math. reading/writing/grammar/phonics/vocabulary → ela. photosynthesis/cells/rocks/weather/energy/plants → science. civil war/geography/government/colonies/history → social_studies. Unclear → other.

topic: Extract the specific topic precisely but concisely. "fractions adding and subtracting" → "Adding and Subtracting Fractions". Never empty if you can identify a topic.

gradeLevel: "4th grade"/"grade 4"/"G4" → "4". "kindergarten"/"K" → "K". "middle school" → "6-8". "high school" → "9-12". Unknown → "".

questionCount: bell ringer/warm up → 5. Exit ticket → 3. Quiz → 10-15. Worksheet → 15-25. Full workbook → 20-30. Default: 20. If teacher says a number, use it.

questionTypes: "MC"/"multiple choice" → multiple_choice. "T/F"/"true false" → true_false. "fill in"/"fill blank"/"cloze" → fill_blank. "short answer"/"SA" → short_answer. "essay"/"long answer" → essay. "matching" → matching. "reading"/"reading comprehension" → short_answer. "word problems" → multiple_choice. If not specified, use ["multiple_choice","short_answer","fill_blank","true_false"].

difficulty: "basic"/"easy"/"review"/"remedial" → basic. No mention or "on level"/"grade level" → grade_level. "advanced"/"challenge"/"enrichment"/"honors" → advanced.

confidence + needsClarification:
- HIGH: subject AND topic AND gradeLevel all clear → needsClarification=false
- MEDIUM: 2 of 3 clear → needsClarification=false
- LOW: 1 or 0 of 3 clear → needsClarification=true, include clarificationQuestion

clarificationQuestion: Friendly, one sentence. E.g. "What grade level is this for?"

Output ONLY the JSON. No markdown, no explanation, no code fences.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_TYPES: QuestionType[] = ['multiple_choice', 'short_answer', 'fill_blank', 'true_false'];

function parseJsonFromText(text: string): Record<string, unknown> | null {
  // Strategy 1: Raw JSON
  try { return JSON.parse(text); } catch { /* skip */ }

  // Strategy 2: ```json fence
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch { /* skip */ }
  }

  // Strategy 3: Find outermost { }
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) {
    try { return JSON.parse(brace[0]); } catch { /* skip */ }
  }

  return null;
}

function normalizeResult(raw: Record<string, unknown>): ParseResult {
  const subject = (['math', 'ela', 'science', 'social_studies', 'other'].includes(raw.subject as string)
    ? raw.subject : 'other') as Subject;

  const types = Array.isArray(raw.questionTypes) && raw.questionTypes.length > 0
    ? raw.questionTypes.filter((t: string) =>
        ['multiple_choice','true_false','fill_blank','short_answer','essay','matching'].includes(t)
      ) as QuestionType[]
    : ALL_TYPES;

  const qc = typeof raw.questionCount === 'number' ? raw.questionCount : 20;
  const questionCount = Math.max(1, Math.min(50, Math.round(qc)));

  const gradeLevel = typeof raw.gradeLevel === 'string' ? raw.gradeLevel : '';

  return {
    subject,
    topic: (typeof raw.topic === 'string' ? raw.topic : '') || '',
    gradeLevel,
    questionCount,
    questionTypes: types.length > 0 ? types : ALL_TYPES,
    difficulty: (['basic','grade_level','advanced'].includes(raw.difficulty as string)
      ? raw.difficulty : 'grade_level') as Difficulty,
    confidence: (['high','medium','low'].includes(raw.confidence as string)
      ? raw.confidence : 'low') as Confidence,
    needsClarification: !!raw.needsClarification,
    clarificationQuestion: typeof raw.clarificationQuestion === 'string'
      ? raw.clarificationQuestion : undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function parseInput(input: string): Promise<ParseResult> {
  const trimmed = input?.trim() ?? '';
  if (trimmed.length === 0) {
    return emptyResult('What topic and grade level would you like to create a workbook for?');
  }

  try {
    const { text } = await generateText({
      model: getModel(MODEL_IDS.cheap),
      system: PARSER_SYSTEM_PROMPT,
      prompt: trimmed,
      temperature: 0.1,
      maxOutputTokens: 500,
    });

    const parsed = parseJsonFromText(text);
    if (parsed) {
      return normalizeResult(parsed);
    }

    logger.warn('Could not parse JSON from AI response', { responsePreview: text.substring(0, 200) });
    return emptyResult('I had trouble understanding. Could you tell me the subject, topic, and grade level?');
  } catch (error) {
    logger.error('generateText failed', { error: error instanceof Error ? error.message : String(error) });
    return emptyResult('I had trouble understanding. Could you tell me the subject, topic, and grade level?');
  }
}

export async function reparseWithClarification(
  originalInput: string,
  clarificationAnswer: string
): Promise<ParseResult> {
  const combined = `Original request: "${originalInput}"\nTeacher clarified: "${clarificationAnswer}"`;
  return parseInput(combined);
}

function emptyResult(question: string): ParseResult {
  return {
    subject: 'other',
    topic: '',
    gradeLevel: '',
    questionCount: 20,
    questionTypes: ALL_TYPES,
    difficulty: 'grade_level',
    confidence: 'low',
    needsClarification: true,
    clarificationQuestion: question,
  };
}
