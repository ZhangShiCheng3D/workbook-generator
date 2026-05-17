/**
 * Immutable Audit Logging
 *
 * Creates hash-chained audit log entries for security-relevant actions.
 * Each entry references the hash of the previous entry, creating an
 * immutable chain that can be verified end-to-end.
 *
 * DESIGN.html §11.2: Audit logging with hash-chain immutability
 */

import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { v4 } from 'uuid';
import { createHash } from 'crypto';
import { createLogger } from '@/lib/logger';

const logger = createLogger('audit');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Get the hash of the most recent audit log entry (for chain linking).
 */
async function getLastHash(): Promise<string | null> {
  try {
    const rows = await db
      .select({ entryHash: auditLogs.entryHash })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);
    return rows[0]?.entryHash ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Write an immutable audit log entry.
 *
 * Hash chain: each entry's `prevHash` points to `entryHash` of the previous
 * log. The current entry's `entryHash` is SHA-256(prevHash + content).
 * This creates a tamper-evident chain.
 *
 * Usage:
 * ```ts
 * await audit({
 *   userId: 'abc-123',
 *   action: 'workbook.delete',
 *   resourceType: 'workbook',
 *   resourceId: 'wb-456',
 *   details: { title: 'Fractions G4' },
 * });
 * ```
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const prevHash = await getLastHash();
    const contentJson = JSON.stringify({
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      details: entry.details ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
    const entryHash = sha256((prevHash ?? 'GENESIS') + contentJson);

    await db.insert(auditLogs).values({
      id: v4(),
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      prevHash,
      entryHash,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Audit log write failed', {
      error: err instanceof Error ? err.message : String(err),
      action: entry.action,
      userId: entry.userId,
    });
    // Never throw — audit failure must not block user operations
  }
}

/**
 * Verify the integrity of the audit log hash chain.
 * Returns the index of the first broken link, or -1 if all valid.
 */
export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAt: number; total: number }> {
  try {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(auditLogs.createdAt);

    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];

      if (curr.prevHash !== prev.entryHash) {
        logger.warn('Audit chain broken', { index: i, prevHash: prev.entryHash, currPrevHash: curr.prevHash });
        return { valid: false, brokenAt: i, total: rows.length };
      }

      const contentJson = JSON.stringify({
        userId: curr.userId,
        action: curr.action,
        resourceType: curr.resourceType,
        resourceId: curr.resourceId,
        details: curr.details ? JSON.parse(curr.details) : null,
        ipAddress: curr.ipAddress,
        userAgent: curr.userAgent,
      });
      const expectedHash = sha256((curr.prevHash ?? 'GENESIS') + contentJson);
      if (curr.entryHash !== expectedHash) {
        return { valid: false, brokenAt: i, total: rows.length };
      }
    }

    return { valid: true, brokenAt: -1, total: rows.length };
  } catch {
    return { valid: false, brokenAt: -1, total: 0 };
  }
}
