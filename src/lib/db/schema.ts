import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ===== Users (extends Supabase Auth) =====
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Supabase auth.uid()
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role', { enum: ['teacher', 'editor', 'org_admin'] }).default('teacher').notNull(),
  plan: text('plan', { enum: ['free', 'pro', 'school', 'district'] }).default('free').notNull(),
  gradeLevels: text('grade_levels'), // JSON array: ["3","4","5"]
  subjects: text('subjects'), // JSON array: ["math","ela"]
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ===== Workbooks =====
export const workbooks = sqliteTable(
  'workbooks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    subject: text('subject', { enum: ['math', 'ela', 'science', 'social_studies', 'other'] }).notNull(),
    topic: text('topic').notNull(),
    gradeLevel: text('grade_level').notNull(),
    description: text('description'),
    estimatedTime: text('estimated_time'),
    questionCount: integer('question_count').notNull(),
    status: text('status', { enum: ['draft', 'generating', 'complete', 'error'] }).default('draft').notNull(),
    visibility: text('visibility', { enum: ['private', 'school', 'public'] }).default('private').notNull(),
    standardCodes: text('standard_codes'), // JSON array
    isEnhanced: integer('is_enhanced', { mode: 'boolean' }).default(false),
    sourceMaterialName: text('source_material_name'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_workbooks_user_id').on(table.userId)]
);

// ===== Questions =====
export const questions = sqliteTable(
  'questions',
  {
    id: text('id').primaryKey(),
    workbookId: text('workbook_id').notNull().references(() => workbooks.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'essay', 'matching'] }).notNull(),
    difficulty: text('difficulty', { enum: ['basic', 'grade_level', 'advanced'] }).default('grade_level').notNull(),
    points: integer('points').default(1).notNull(),
    questionText: text('question_text').notNull(),
    options: text('options'), // JSON array for MC
    answer: text('answer').notNull(),
    solution: text('solution'),
    standardCode: text('standard_code'),
    confidence: text('confidence', { enum: ['high', 'medium', 'low'] }).default('high').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isAiGenerated: integer('is_ai_generated', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_questions_workbook_id').on(table.workbookId)]
);

// ===== Rubrics =====
export const rubrics = sqliteTable('rubrics', {
  id: text('id').primaryKey(),
  workbookId: text('workbook_id').notNull().references(() => workbooks.id, { onDelete: 'cascade' }),
  questionId: text('question_id').references(() => questions.id, { onDelete: 'set null' }),
  criteria: text('criteria').notNull(),
  maxScore: integer('max_score').notNull(),
  scoreLevels: text('score_levels').notNull(), // JSON: [{score, description}]
  createdAt: text('created_at').notNull(),
});

// ===== Generation Logs =====
export const generationLogs = sqliteTable(
  'generation_logs',
  {
    id: text('id').primaryKey(),
    workbookId: text('workbook_id').notNull().references(() => workbooks.id, { onDelete: 'cascade' }),
    model: text('model').notNull(),
    promptTokens: integer('prompt_tokens').notNull(),
    completionTokens: integer('completion_tokens').notNull(),
    cacheReadTokens: integer('cache_read_tokens').default(0),
    cacheWriteTokens: integer('cache_write_tokens').default(0),
    cost: real('cost').notNull(),
    durationMs: integer('duration_ms').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_generation_logs_workbook_id').on(table.workbookId)]
);

// ===== Semantic Cache =====
export const semanticCache = sqliteTable('semantic_cache', {
  id: text('id').primaryKey(),
  promptHash: text('prompt_hash').notNull().unique(),
  embedding: text('embedding'), // JSON array placeholder (pgvector in prod)
  responseJson: text('response_json').notNull(),
  subject: text('subject'),
  topic: text('topic'),
  gradeLevel: text('grade_level'),
  hitCount: integer('hit_count').default(1),
  createdAt: text('created_at').notNull(),
  lastHitAt: text('last_hit_at').notNull(),
});

// ===== Question Feedback =====
export const questionFeedback = sqliteTable('question_feedback', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating'), // 1 = thumbs up, -1 = thumbs down
  reason: text('reason'),
  comment: text('comment'),
  createdAt: text('created_at').notNull(),
});

// ===== Audit Logs (immutable, hash-chained) =====
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    action: text('action').notNull(), // e.g. 'workbook.create', 'generate.start', 'user.login'
    resourceType: text('resource_type'), // 'workbook', 'question', 'user', etc.
    resourceId: text('resource_id'),
    details: text('details'), // JSON blob with action-specific metadata
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    /** Hash of the previous audit log entry (immutable chain) */
    prevHash: text('prev_hash'),
    /** SHA-256 of this log entry's content */
    entryHash: text('entry_hash').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_audit_logs_user_id').on(table.userId), index('idx_audit_logs_created_at').on(table.createdAt)]
);

// ===== Curriculum Standards =====
export const curriculumStandards = sqliteTable(
  'curriculum_standards',
  {
    id: text('id').primaryKey(),
    /** Standard code, e.g. CCSS.MATH.CONTENT.4.NF.A.1 */
    code: text('code').notNull().unique(),
    /** Human-readable description */
    description: text('description').notNull(),
    /** Subject area */
    subject: text('subject', { enum: ['math', 'ela', 'science', 'social_studies'] }).notNull(),
    /** Grade level or range, e.g. "4", "3-5", "K" */
    gradeLevel: text('grade_level').notNull(),
    /** Category, e.g. "NF" (Numbers & Fractions), "OA" (Operations & Algebra) */
    category: text('category'),
    /** Subcategory */
    subcategory: text('subcategory'),
    /** Depth of Knowledge level(s) applicable */
    dokLevels: text('dok_levels'), // JSON array: [1, 2, 3]
    /** Learning progression order */
    sequenceOrder: integer('sequence_order').default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_standards_code').on(table.code),
    index('idx_standards_subject_grade').on(table.subject, table.gradeLevel),
  ]
);

// ===== Organizations (Schools/Districts) =====
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain'), // e.g. "myschool.edu" for auto-join
  plan: text('plan', { enum: ['free', 'pro', 'school', 'district'] }).default('school').notNull(),
  ssoProvider: text('sso_provider', { enum: ['google', 'microsoft', 'clever', 'classlink'] }),
  region: text('region', { enum: ['us', 'eu', 'apac'] }).default('us'),
  maxSeats: integer('max_seats').default(10),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ===== Templates (Reusable workbook templates) =====
export const templates = sqliteTable(
  'templates',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    subject: text('subject', { enum: ['math', 'ela', 'science', 'social_studies', 'other'] }).notNull(),
    gradeLevel: text('grade_level').notNull(),
    category: text('category'), // e.g. "bell_ringer", "exit_ticket", "quiz", "homework", "test_prep"
    questionTypes: text('question_types'), // JSON array
    difficulty: text('difficulty', { enum: ['basic', 'grade_level', 'advanced'] }).default('grade_level'),
    defaultQuestionCount: integer('default_question_count').default(20),
    /** Pre-baked system prompt override */
    promptConfig: text('prompt_config'), // JSON
    isPublic: integer('is_public', { mode: 'boolean' }).default(false),
    usageCount: integer('usage_count').default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_templates_org_id').on(table.orgId),
    index('idx_templates_subject_grade').on(table.subject, table.gradeLevel),
  ]
);
