// ===== User =====
export type UserRole = 'teacher' | 'editor' | 'org_admin';
export type UserPlan = 'free' | 'pro' | 'school' | 'district';

// ===== Workbook =====
export type Subject = 'math' | 'ela' | 'science' | 'social_studies' | 'other';
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'essay' | 'matching';
export type Difficulty = 'basic' | 'grade_level' | 'advanced';
export type Confidence = 'high' | 'medium' | 'low';
export type WorkbookStatus = 'draft' | 'generating' | 'complete' | 'error';
export type WorkbookVisibility = 'private' | 'school' | 'public';
export type VariantType = 'ell' | 'iep' | 'advanced' | 'spanish';

// ===== Generation =====
export interface ParseResult {
  subject: Subject;
  topic: string;
  gradeLevel: string;
  questionCount: number;
  questionTypes: QuestionType[];
  difficulty: Difficulty;
  confidence: Confidence;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

export interface GenerationRequest {
  input: string;
  enhanceMaterial?: string; // base64 encoded file content
  variantType?: VariantType;
  maxQuestions?: number;
}

export interface QuestionOutput {
  type: QuestionType;
  difficulty: Difficulty;
  points: number;
  questionText: string;
  options?: string[]; // for MC
  correctAnswer: string;
  solution: string;
  standardCode?: string;
  confidence: Confidence;
}

export interface WorkbookOutput {
  title: string;
  subject: Subject;
  topic: string;
  gradeLevel: string;
  description: string;
  estimatedTime: string;
  questions: QuestionOutput[];
  rubric: RubricOutput[];
}

export interface RubricOutput {
  criteria: string;
  maxScore: number;
  scoreLevels: { score: number; description: string }[];
}

export interface GenerationLog {
  model: string;
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cost: number;
  durationMs: number;
}

// ===== API Response Types =====

/** Lightweight workbook summary returned by GET /api/workbooks */
export interface WorkbookSummary {
  id: string;
  title: string;
  subject: string;
  topic: string;
  gradeLevel: string;
  questionCount: number;
  status: string;
  description: string | null;
  estimatedTime: string | null;
  isEnhanced: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Question with DB metadata, returned by GET /api/workbooks/[id] */
export interface QuestionWithMeta extends QuestionOutput {
  id: string;
  workbookId: string;
  questionNumber: number;
  createdAt: string;
}

/** Rubric with DB metadata, returned by GET /api/workbooks/[id] */
export interface RubricWithMeta {
  id: string;
  workbookId: string;
  criteria: string;
  maxScore: number;
  scoreLevels: { score: number; description: string }[];
  createdAt: string;
}

/** Full workbook detail returned by GET /api/workbooks/[id] */
export interface WorkbookDetailResponse {
  id: string;
  title: string;
  subject: string;
  topic: string;
  gradeLevel: string;
  description: string | null;
  estimatedTime: string | null;
  questionCount: number;
  status: string;
  isEnhanced: boolean;
  createdAt: string;
  updatedAt: string;
  questions: QuestionWithMeta[];
  rubric: RubricWithMeta | null;
}
