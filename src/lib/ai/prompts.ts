/**
 * Cached System Prompt Builder
 *
 * Builds the system prompt with cache breakpoints per DESIGN.html 8.2b:
 *   Block 1: Role + output format + safety rules (~800 tokens)
 *   Block 2: Curriculum standards for matched subject/grade (~1500 tokens)
 *   Block 3: Question templates + formatting rules (~500 tokens)
 *
 * Anthropic Prompt Caching caches blocks separated by cache breakpoints.
 * Cached reads cost ~90% less than uncached.
 */

import type { Subject, QuestionType, Difficulty } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemPromptParams {
  subject: Subject;
  topic: string;
  gradeLevel: string;
  questionCount: number;
  questionTypes: QuestionType[];
  difficulty: Difficulty;
  standards?: string;
  template?: 'student' | 'teacher';
}

// ---------------------------------------------------------------------------
// Block 1: Role + Output Format + Safety Rules (~800 tokens)
// ---------------------------------------------------------------------------

const ROLE_BLOCK = `<!-- CACHE BLOCK 1: Role, Output Format, Safety Rules -->
You are an expert K-12 curriculum designer and assessment creator. Your job is to generate high-quality, standards-aligned, printable practice questions for US teachers.

## Core Principles

1. **Accuracy First**: Every question must be factually correct. Every answer must be verifiable. If you cannot produce a correct answer with high confidence, do NOT generate that question.
2. **Age-Appropriate**: Language, context, and complexity must match the specified grade level. Use examples relevant to students at this age.
3. **Standards-Aligned**: Every question should map to a specific curriculum standard. Include the standard code.
4. **Printable-Ready**: Questions must work on paper. No interactive elements, no external links, no "click here."
5. **Diverse Thinking**: Mix recall, application, and higher-order thinking. Include at least one question requiring explanation or justification.

## Safety Rules

- NEVER include inappropriate, violent, or adult content
- NEVER include politically sensitive or culturally insensitive material
- NEVER include personally identifiable information in examples
- ALWAYS use inclusive language and diverse representation in examples
- NEVER suggest answers that could be harmful (e.g., dangerous science experiments)
- Do NOT generate content about religion, politics, or controversial social topics
- Student names in word problems should reflect diverse backgrounds

## Output Format

Respond with a JSON object containing two top-level keys:

\`\`\`json
{
  "questions": [
    {
      "type": "multiple_choice",
      "difficulty": "grade_level",
      "points": 1,
      "standardCode": "CCSS.MATH.CONTENT.4.NF.A.1",
      "questionText": "The full question text, formatted for print",
      "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"],
      "correctAnswer": "B",
      "solution": "Step-by-step solution showing how to arrive at the answer",
      "confidence": "GREEN"
    }
  ],
  "rubric": {
    "criteria": "Overall grading rubric text describing how to evaluate student work",
    "maxScore": 20,
    "scoreLevels": [
      { "score": 4, "description": "Exceeds: Demonstrates thorough understanding..." },
      { "score": 3, "description": "Meets: Demonstrates adequate understanding..." },
      { "score": 2, "description": "Approaching: Shows partial understanding..." },
      { "score": 1, "description": "Below: Shows minimal understanding..." }
    ]
  }
}
\`\`\`

### Question Types

- **multiple_choice**: 4 options (A-D), one correct answer, plausible distractors
- **true_false**: Clear declarative statement, no double negatives
- **fill_blank**: Single word or short phrase answer, blank marked with "__________"
- **short_answer**: Requires 1-3 sentence response, key points in solution
- **essay**: Paragraph-level response, prompt includes context + task + suggested structure
- **matching**: Two columns, 4-6 items, one extra in right column, answer key shows pairings

### Confidence Indicators
- [GREEN] = highly confident in answer correctness
- [YELLOW] = moderately confident, teacher should spot-check
- [RED] = needs teacher review before use

## Language
- All output in English (US spelling)
- Grade-appropriate vocabulary
- Teacher-facing notes in [brackets]
`;

// ---------------------------------------------------------------------------
// Block 2: Curriculum Standards (~1500 tokens)
// Selected by subject/grade
// ---------------------------------------------------------------------------

const CCSS_MATH_G3_5 = `<!-- CACHE BLOCK 2: CCSS Math G3-5 -->

## Common Core Math Standards (Grades 3-5)

### Grade 3
**OA**: 3.OA.A.1-4 (mult/div meanings), 3.OA.B.5-6 (properties), 3.OA.C.7 (fluent within 100), 3.OA.D.8-9 (two-step word problems, patterns)
**NBT**: 3.NBT.A.1-3 (rounding, add/sub within 1000, multiply by multiples of 10)
**NF**: 3.NF.A.1-3 (unit fractions, fractions on number line, equivalence/comparison)
**MD**: 3.MD.A.1-2 (time, volume, mass), 3.MD.C.5-7 (area), 3.MD.D.8 (perimeter)
**G**: 3.G.A.1-2 (shape categories, partition into equal areas)

### Grade 4  <<< MVP FOCUS >>>
**OA**: 4.OA.A.1-3 (multiplicative comparison, multistep word problems), 4.OA.B.4 (factor pairs, prime/composite), 4.OA.C.5 (patterns)
**NBT**: 4.NBT.A.1-3 (place value, rounding), 4.NBT.B.4-6 (fluent add/sub, multiply, divide)
**NF**: 4.NF.A.1-2 (equivalent fractions, comparing), 4.NF.B.3a-d (add/sub fractions, mixed numbers, word problems), 4.NF.B.4a-c (multiply fraction by whole number), 4.NF.C.5-7 (decimals)
**MD**: 4.MD.A.1-3 (measurement, word problems, area/perimeter), 4.MD.C.5-7 (angles)
**G**: 4.G.A.1-3 (lines/angles, classify shapes, symmetry)

### Grade 5
**OA**: 5.OA.A.1-2 (expressions with parentheses, write/interpret expressions), 5.OA.B.3 (patterns)
**NBT**: 5.NBT.A.1-4 (place value, decimals, rounding), 5.NBT.B.5-7 (multiply, divide, decimal operations)
**NF**: 5.NF.A.1-2 (add/sub unlike denominators, word problems), 5.NF.B.3-7 (fraction as division, multiply fractions, multiplication as scaling, divide unit fractions)
**MD**: 5.MD.A.1 (convert units), 5.MD.B.2 (line plots), 5.MD.C.3-5 (volume)
**G**: 5.G.A.1-2 (coordinate plane, graph points), 5.G.B.3-4 (classify 2D figures)
`;

const CCSS_ELA_G3_5 = `<!-- CACHE BLOCK 2: CCSS ELA G3-5 -->

## Common Core ELA Standards (Grades 3-5)

### Reading Literature
RL.3-5.1: Textual evidence / quoting accurately
RL.3-5.2: Theme, summary, main idea
RL.3-5.3: Characters, setting, events; compare/contrast
RL.3-5.4: Vocabulary, figurative language
RL.3-5.5: Text structure (stories, dramas, poems)
RL.3-5.6: Point of view

### Reading Informational Text
RI.3-5.1-9: Main idea, details, relationships, vocabulary, text features, point of view, integrate information

### Foundational Skills (G3-5)
RF.3-5.3-4: Phonics, word analysis, fluency

### Writing
W.3-5.1: Opinion pieces with reasons
W.3-5.2: Informative/explanatory texts
W.3-5.3: Narratives
W.3-5.4-5: Clear writing, planning/revising
W.3-5.7-8: Research, gather information

### Language
L.3-5.1-6: Grammar, conventions, vocabulary, figurative language
`;

const NGSS_G3_5 = `<!-- CACHE BLOCK 2: NGSS Science G3-5 -->

## Next Generation Science Standards (Grades 3-5)

### Grade 3
3-PS2: Forces and motion, magnets
3-LS1: Life cycles
3-LS2: Social groups and survival
3-LS3: Heredity and traits
3-LS4: Fossils, adaptation, survival
3-ESS2: Weather and climate
3-ESS3: Natural hazards

### Grade 4
4-PS3: Energy, speed, collisions, energy conversion
4-PS4: Waves, light, sound
4-LS1: Plant/animal structures and senses
4-ESS1: Rock formations, fossils, landscape change
4-ESS2: Weathering, erosion, Earth features
4-ESS3: Natural resources, natural hazards

### Grade 5
5-PS1: Matter and its interactions, particles, conservation of mass
5-PS2: Gravity
5-PS3: Energy in ecosystems (food webs)
5-LS1: Plant growth (air + water)
5-LS2: Matter cycles in ecosystems
5-ESS1: Stars, solar system, shadows, day/night
5-ESS2: Earth's systems (geosphere, biosphere, hydrosphere, atmosphere)
5-ESS3: Human impact, resource protection
`;

const C3_SOCIAL_STUDIES = `<!-- CACHE BLOCK 2: C3 Social Studies G3-5 -->

## C3 Framework for Social Studies (Grades 3-5)

### Civics
D2.Civ.1-10: Government, rules/laws, democratic principles, civic participation, rights and responsibilities

### Economics
D2.Eco.1-6: Costs/benefits, incentives, resources, trade, money, human capital

### Geography
D2.Geo.1-6: Maps, spatial patterns, human-environment interaction, culture, population

### History
D2.His.1-14: Chronology, comparing time periods, historical figures, perspectives, historical sources, cause and effect

### Inquiry
D1.1-5: Developing questions, planning inquiries
D3.1-4: Evaluating sources, using evidence
D4.1-7: Communicating conclusions, taking action
`;

// Default for grades outside G3-5 or subjects without detailed standards
const GENERIC_STANDARDS = `<!-- CACHE BLOCK 2: General Standards -->
Align all questions with US national curriculum expectations for this subject and grade level.
Focus on age-appropriate content, skills, and vocabulary. Ensure questions build toward
college and career readiness as defined by widely adopted state standards.
`;

// ---------------------------------------------------------------------------
// Block 3: Question Templates + Formatting (~500 tokens)
// ---------------------------------------------------------------------------

const TEMPLATE_BLOCK = `<!-- CACHE BLOCK 3: Templates & Formatting -->

## Question Type Templates

### multiple_choice
- 4 options (A-D), all plausible, roughly equal length
- One unambiguous correct answer
- No "all/none of the above" unless grade-appropriate (G5+)

### true_false
- Clear declarative statement, no double negatives
- Mix of true and false across the set
- Solution explains why false items are false

### fill_blank
- Single word or short phrase answer
- Blank marked with "__________"
- Accept reasonable variations noted in solution

### short_answer
- 1-3 sentence response expected
- Key points listed in solution for partial credit
- Question should require explanation, not just recall

### essay
- Paragraph-level response (150-200 words for G3-5)
- Prompt includes: context, specific task, suggested structure
- Solution provides model response outline

### matching
- Two columns, 4-6 items each
- One extra item in right column
- Answer key shows correct pairings

## Formatting Rules
- Question numbers: 1), 2), 3) or 1., 2., 3.
- Leave space for writing: note "[Space for response]" in short_answer/essay
- Use standard mathematical notation
- Fractions: consistent format (stacked or slash)
- Diagrams: describe clearly with measurements
- "[PAGE BREAK]" between major sections
`;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function selectStandards(subject: Subject, gradeLevel: string): string {
  const grade = parseInt(gradeLevel, 10);
  const isG3to5 = !isNaN(grade) && grade >= 3 && grade <= 5;

  switch (subject) {
    case 'math':
      return isG3to5 ? CCSS_MATH_G3_5 : GENERIC_STANDARDS;
    case 'ela':
      return isG3to5 ? CCSS_ELA_G3_5 : GENERIC_STANDARDS;
    case 'science':
      return isG3to5 ? NGSS_G3_5 : GENERIC_STANDARDS;
    case 'social_studies':
      return isG3to5 ? C3_SOCIAL_STUDIES : GENERIC_STANDARDS;
    default:
      return GENERIC_STANDARDS;
  }
}

/**
 * Build a complete cache-optimized system prompt.
 * Override `params.standards` to inject custom standards text.
 */
export function buildCachedSystemPrompt(params: SystemPromptParams): string {
  const {
    subject,
    topic,
    gradeLevel,
    questionCount,
    questionTypes,
    difficulty,
    standards,
    template = 'student',
  } = params;

  const standardsBlock = standards ?? selectStandards(subject, gradeLevel);

  const diffCalibration =
    difficulty === 'basic'
      ? '- Focus on foundational skills and recall. Use simpler vocabulary. Include more scaffolding.'
      : difficulty === 'advanced'
      ? '- Focus on higher-order thinking, multi-step problems, enrichment. Require deeper reasoning.'
      : '- Balance ~30% recall, ~40% application, ~30% higher-order thinking.';

  const instructionBlock = `
<!-- INSTRUCTION BLOCK (per-request, varies) -->

## Task

Generate a printable practice pack:

- **Subject**: ${subject}
- **Topic**: ${topic}
- **Grade Level**: ${gradeLevel || 'Not specified'}
- **Question Count**: ${questionCount}
- **Question Types**: ${questionTypes.join(', ')}
- **Difficulty**: ${difficulty}
- **Template**: ${template === 'student' ? 'Student Copy' : 'Teacher Copy with Answer Key + Rubric'}

## Difficulty Calibration
${diffCalibration}

## Question Distribution
Generate EXACTLY ${questionCount} questions distributed across: ${questionTypes.join(', ')}.

## Output Requirements
1. Output valid JSON (questions array + rubric object) matching the format above.
2. Every question MUST have correctAnswer and solution.
3. Include standardCode for every question.
4. Mark each question with a confidence indicator: GREEN / YELLOW / RED.
5. Generate a rubric with criteria text, maxScore, and scoreLevels.

Now generate the complete practice pack.
`;

  return [ROLE_BLOCK, standardsBlock, TEMPLATE_BLOCK, instructionBlock].join('\n\n');
}

// ---------------------------------------------------------------------------
// Cache-aware system prompt parts (for providers that support cache breakpoints)
// ---------------------------------------------------------------------------

export interface SystemPromptPart {
  text: string;
  /** Anthropic cache control. Ignored by non-Anthropic providers. */
  cacheControl?: { type: 'ephemeral' };
}

/**
 * Build the system prompt as structured parts with cache breakpoints.
 *
 * Blocks 1-3 are static and cacheable (marked with cache_control breakpoints).
 * Block 4 (instruction) is per-request and uncached.
 *
 * Use this with streamText's system array parameter for Anthropic prompt caching.
 */
export function buildCachedSystemPromptParts(params: SystemPromptParams): SystemPromptPart[] {
  const {
    subject,
    topic,
    gradeLevel,
    questionCount,
    questionTypes,
    difficulty,
    standards,
    template = 'student',
  } = params;

  const standardsBlock = standards ?? selectStandards(subject, gradeLevel);

  const diffCalibration =
    difficulty === 'basic'
      ? '- Focus on foundational skills and recall. Use simpler vocabulary. Include more scaffolding.'
      : difficulty === 'advanced'
      ? '- Focus on higher-order thinking, multi-step problems, enrichment. Require deeper reasoning.'
      : '- Balance ~30% recall, ~40% application, ~30% higher-order thinking.';

  const instruction = `
## Task

Generate a printable practice pack:

- **Subject**: ${subject}
- **Topic**: ${topic}
- **Grade Level**: ${gradeLevel || 'Not specified'}
- **Question Count**: ${questionCount}
- **Question Types**: ${questionTypes.join(', ')}
- **Difficulty**: ${difficulty}
- **Template**: ${template === 'student' ? 'Student Copy' : 'Teacher Copy with Answer Key + Rubric'}

## Difficulty Calibration
${diffCalibration}

## Question Distribution
Generate EXACTLY ${questionCount} questions distributed across: ${questionTypes.join(', ')}.

## Output Requirements
1. Output valid JSON (questions array + rubric object) matching the format above.
2. Every question MUST have correctAnswer and solution.
3. Include standardCode for every question.
4. Mark each question with a confidence indicator: GREEN / YELLOW / RED.
5. Generate a rubric with criteria text, maxScore, and scoreLevels.

Now generate the complete practice pack.
`;

  return [
    { text: ROLE_BLOCK, cacheControl: { type: 'ephemeral' } },
    { text: standardsBlock, cacheControl: { type: 'ephemeral' } },
    { text: TEMPLATE_BLOCK, cacheControl: { type: 'ephemeral' } },
    { text: instruction },
  ];
}

/**
 * Build a system prompt for the Teacher Copy / Answer Key variant.
 */
export function buildTeacherCopyPrompt(params: SystemPromptParams): string {
  return buildCachedSystemPrompt({ ...params, template: 'teacher' });
}

/**
 * Build a rubric-only generation prompt for regenerating rubrics.
 */
export function buildRubricPrompt(
  subject: Subject,
  topic: string,
  gradeLevel: string,
  totalPoints: number
): string {
  const standardsBlock = selectStandards(subject, gradeLevel);
  const instruction = `
<!-- INSTRUCTION BLOCK -->

Generate a grading rubric for:
- **Subject**: ${subject}
- **Topic**: ${topic}
- **Grade Level**: ${gradeLevel || 'Not specified'}
- **Total Points**: ${totalPoints}

Output a rubric JSON object with criteria text, maxScore, and scoreLevels.
The maxScore should equal ${totalPoints}.
`;

  return [ROLE_BLOCK, standardsBlock, TEMPLATE_BLOCK, instruction].join('\n\n');
}
