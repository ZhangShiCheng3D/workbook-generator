/**
 * Input Sanitization
 *
 * Strips HTML, trims excess whitespace, and enforces length limits on all
 * user-provided strings. Used in every API route before processing input.
 *
 * DESIGN.html §12: Input validation — prevent prompt injection and XSS
 */

// ---------------------------------------------------------------------------
// HTML Stripping
// ---------------------------------------------------------------------------

/** Tag-matching regex: matches any opening/closing/self-closing HTML-like tag. */
const HTML_TAG_RE = /<[^>]*>/g;

/** HTML entities to strip or decode. */
const ENTITY_RE = /&[#\w]+;/g;

/**
 * Strip HTML tags from a string. Also removes HTML entities that could be
 * used for XSS payloads, and collapses multiple whitespace characters.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(HTML_TAG_RE, '')      // Remove <tags>
    .replace(ENTITY_RE, '')         // Remove &entities;
    .replace(/[ \t]+/g, ' ')       // Collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')    // Collapse excessive newlines
    .trim();
}

// ---------------------------------------------------------------------------
// String Helpers
// ---------------------------------------------------------------------------

/**
 * Truncate a string to maxLength characters, appending no ellipsis.
 * Use for storage fields that have DB-level length constraints.
 */
export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return input.slice(0, maxLength);
}

/**
 * Sanitize and truncate in one step. Strip HTML, then limit length.
 */
export function sanitizeAndTruncate(input: string, maxLength: number): string {
  return truncate(sanitizeInput(input), maxLength);
}

// ---------------------------------------------------------------------------
// Prompt Injection Detection
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|before)\s+(instructions?|directives?|prompts?)/i,
  /disregard\s+(all\s+)?(previous|prior|above|before)\s+(instructions?|directives?|prompts?)/i,
  /you\s+are\s+(now|no\s+longer)\s+(an?\s+)?(AI|assistant|language\s+model|pirate|different\s+(AI|model|system)|chatbot)/i,
  /\b(system\s*:\s*|system\s+prompt\s*:|system\s+message\s*:)/i,
  /forget\s+(everything|all|your)\s+(you\s+(were|have\s+been)\s+told|instructions?|training)/i,
  /act\s+as\s+(if\s+you\s+are|a\s+different)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /output\s+(only\s+)?["']?\s*(the\s+answer\s+is|respond\s+with)/i,
  /do\s+not\s+(follow|obey)\s+(your\s+)?instructions/i,
];

/**
 * Check user input for common LLM prompt injection patterns.
 * Returns true if suspicious patterns are detected.
 */
export function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Escape HTML special characters for safe insertion into HTML templates.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Grade Level Validation
// ---------------------------------------------------------------------------

/**
 * Valid grade level formats:
 * - Numeric: "K", "1"-"12"
 * - Range: "3-5", "K-2"
 * - Category: "elementary", "middle", "high"
 *
 * Returns true if the grade string is valid.
 */
export function isValidGradeLevel(grade: string): boolean {
  const trimmed = grade.trim();
  if (!trimmed) return false;

  // Single grade
  if (/^K$/i.test(trimmed)) return true;
  if (/^([1-9]|1[0-2])$/.test(trimmed)) return true;

  // Grade range (e.g., "3-5", "K-2")
  if (/^K?[-–—]K?$/i.test(trimmed)) return false; // Just a dash
  if (/^(K|[1-9]|1[0-2])[-–—](K|[1-9]|1[0-2])$/i.test(trimmed)) return true;

  // Descriptive categories
  const categories = ['elementary', 'middle', 'high', 'primary', 'intermediate'];
  if (categories.includes(trimmed.toLowerCase())) return true;

  // Multi-grade list (e.g., "3,4,5")
  if (/^[Kk\d](,\s*[Kk\d])+$/.test(trimmed)) return true;

  return false;
}

/**
 * Normalize a grade level string to a standard format.
 * Returns the normalized string, or null if invalid.
 *
 * Examples:
 *   "3" -> "3"
 *   "kindergarten" -> null (not standard)
 *   "3-5" -> "3-5"
 *   "K" -> "K"
 *   "elementary" -> "elementary"
 */
export function normalizeGradeLevel(grade: string): string | null {
  const trimmed = grade.trim();
  if (!isValidGradeLevel(trimmed)) return null;

  // Normalize dash characters
  return trimmed
    .replace(/[–—]/g, '-') // em/en dash to hyphen
    .replace(/\s+/g, '') // Remove spaces in lists like "3, 4, 5"
    .toLowerCase()
    .replace(/^k$/, 'K'); // Capitalize K
}

// ---------------------------------------------------------------------------
// Email / Generic Validation
// ---------------------------------------------------------------------------

/** Minimal email format check. Does NOT attempt RFC 5322 compliance. */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // Simple check: contains @, has local part and domain
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Basic length validation for common fields.
 * Returns the sanitized value if valid, or null if it fails validation.
 */
export function validateString(
  value: unknown,
  minLength: number,
  maxLength: number
): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = sanitizeInput(value);
  if (cleaned.length < minLength || cleaned.length > maxLength) return null;
  return cleaned;
}
