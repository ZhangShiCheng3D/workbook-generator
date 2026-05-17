/**
 * Curriculum Standards Query
 *
 * Queries the curriculum_standards table to build standards-aligned prompts.
 * Replaces the static embedded standards text in prompts.ts with dynamic,
 * database-driven standard selection.
 *
 * DESIGN.html §4: Standards alignment system
 */

import { db } from '@/lib/db';
import { curriculumStandards } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import type { Subject } from '@/types';

const logger = createLogger('ai/standards');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StandardRecord {
  code: string;
  description: string;
  subject: string;
  gradeLevel: string;
  category: string | null;
  dokLevels: number[];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get all standards for a given subject and grade level.
 * Returns standards sorted by sequence order (learning progression).
 */
export async function getStandards(subject: Subject, gradeLevel: string): Promise<StandardRecord[]> {
  // "other" subject has no standards in the database
  if (subject === 'other') return [];

  try {
    // Parse grade level to determine range
    const grade = parseInt(gradeLevel, 10);
    const gradeConditions: string[] = [];

    if (!isNaN(grade)) {
      gradeConditions.push(gradeLevel);
      // For specific grades, also include standards that span this grade
      gradeConditions.push(`${grade}-${grade + 1}`);
      if (grade > 1) gradeConditions.push(`${grade - 1}-${grade}`);
      // Include broader grade bands
      if (grade >= 3 && grade <= 5) gradeConditions.push('3-5');
      if (grade >= 6 && grade <= 8) gradeConditions.push('6-8');
      if (grade >= 9 && grade <= 12) gradeConditions.push('9-12');
    } else {
      gradeConditions.push(gradeLevel);
    }

    const rows = await db
      .select()
      .from(curriculumStandards)
      .where(
        and(
          eq(curriculumStandards.subject, subject as 'math' | 'ela' | 'science' | 'social_studies'),
          inArray(curriculumStandards.gradeLevel, gradeConditions)
        )
      )
      .orderBy(curriculumStandards.sequenceOrder);

    return rows.map((r) => ({
      code: r.code,
      description: r.description,
      subject: r.subject,
      gradeLevel: r.gradeLevel,
      category: r.category,
      dokLevels: r.dokLevels ? (() => { try { return JSON.parse(r.dokLevels); } catch { return []; } })() : [],
    }));
  } catch (err) {
    logger.warn('Failed to query standards', {
      error: err instanceof Error ? err.message : String(err),
      subject,
      gradeLevel,
    });
    return [];
  }
}

/**
 * Format standards into a prompt-ready text block.
 * Capped at ~2000 characters to stay within token budgets.
 */
export function formatStandardsForPrompt(standards: StandardRecord[], maxChars = 2000): string {
  if (standards.length === 0) return '';

  const lines: string[] = ['## Curriculum Standards Reference'];
  const byCategory: Record<string, StandardRecord[]> = {};

  for (const s of standards) {
    const cat = s.category ?? 'General';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  }

  let charCount = 0;
  for (const [category, items] of Object.entries(byCategory)) {
    const header = `\n### ${category}\n`;
    lines.push(header);
    charCount += header.length;

    for (const item of items) {
      const line = `${item.code}: ${item.description}\n`;
      if (charCount + line.length > maxChars) {
        lines.push(`... (${Object.values(byCategory).flat().length - lines.filter(l => l.includes(':')).length} more standards truncated)\n`);
        return lines.join('');
      }
      lines.push(line);
      charCount += line.length;
    }
  }

  return lines.join('');
}

/**
 * Get standards and format them for prompt injection.
 * Convenience function used by the prompt builder.
 */
export async function getPromptStandards(
  subject: Subject,
  gradeLevel: string,
  maxChars = 2000
): Promise<string> {
  const standards = await getStandards(subject, gradeLevel);
  if (standards.length === 0) {
    return '## Curriculum Standards\nAlign questions with age-appropriate, widely adopted curriculum standards.';
  }
  return formatStandardsForPrompt(standards, maxChars);
}
