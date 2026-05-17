/**
 * Semantic Cache Layer
 *
 * L1 cost defense: checks if a similar workbook was recently generated,
 * avoiding redundant AI calls. Uses topic + grade + subject matching
 * with configurable TTL (default 7 days).
 *
 * DESIGN.html §9.3: 5-layer cost defense
 */

import { db } from '@/lib/db';
import { semanticCache } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 } from 'uuid';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai/cache');

/** How long a cache entry is considered fresh (7 days). */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CacheEntry {
  id: string;
  promptHash: string;
  responseJson: unknown;
  subject: string | null;
  topic: string | null;
  gradeLevel: string | null;
  hitCount: number;
  createdAt: string;
}

/**
 * Compute a deterministic hash for a (topic, grade, subject) combination.
 * This is a simple key — in production, replace with pgvector cosine
 * similarity search on actual embeddings.
 */
function computeHash(topic: string, gradeLevel: string, subject: string): string {
  const key = `${subject}:${gradeLevel}:${topic}`.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const chr = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Look up a cached generation result.
 * Returns the parsed response JSON if a fresh cache entry exists, or null.
 */
export async function lookupCache(
  topic: string,
  gradeLevel: string,
  subject: string
): Promise<CacheEntry | null> {
  try {
    const hash = computeHash(topic, gradeLevel, subject);
    const rows = await db
      .select()
      .from(semanticCache)
      .where(
        and(
          eq(semanticCache.promptHash, hash),
          eq(semanticCache.subject, subject),
          eq(semanticCache.topic, topic),
          eq(semanticCache.gradeLevel, gradeLevel)
        )
      )
      .orderBy(desc(semanticCache.lastHitAt))
      .limit(1);

    if (rows.length === 0) return null;

    const entry = rows[0];
    const age = Date.now() - new Date(entry.createdAt).getTime();
    if (age > CACHE_TTL_MS) return null;

    // Update hit metadata
    const newHitCount = (entry.hitCount ?? 0) + 1;
    await db
      .update(semanticCache)
      .set({ hitCount: newHitCount, lastHitAt: new Date().toISOString() })
      .where(eq(semanticCache.id, entry.id));

    return {
      id: entry.id,
      promptHash: entry.promptHash,
      responseJson: JSON.parse(entry.responseJson),
      subject: entry.subject,
      topic: entry.topic,
      gradeLevel: entry.gradeLevel,
      hitCount: newHitCount,
      createdAt: entry.createdAt,
    };
  } catch (err) {
    logger.warn('Cache lookup failed, proceeding without cache', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Store a generation result in the semantic cache.
 */
export async function storeCache(
  topic: string,
  gradeLevel: string,
  subject: string,
  responseJson: unknown
): Promise<void> {
  try {
    const hash = computeHash(topic, gradeLevel, subject);
    const now = new Date().toISOString();

    await db.insert(semanticCache).values({
      id: v4(),
      promptHash: hash,
      embedding: null, // placeholder for pgvector migration
      responseJson: JSON.stringify(responseJson),
      subject,
      topic,
      gradeLevel,
      hitCount: 1,
      createdAt: now,
      lastHitAt: now,
    });
  } catch (err) {
    logger.warn('Cache store failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Non-blocking — generation succeeds even if cache write fails
  }
}
