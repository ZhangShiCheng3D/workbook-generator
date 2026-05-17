/**
 * Structured JSON Logger
 *
 * Produces JSON-formatted log entries with timestamp, level, message, and
 * optional context. In development, pretty-prints to the console for
 * readability.
 *
 * Replaces all ad-hoc console.error / console.warn calls in API routes.
 *
 * DESIGN.html §14: Observability — structured logging as foundation for
 * production monitoring (later: Langfuse, Axiom, or Datadog).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  /** Source file / route identifier for filtering. */
  source?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV === 'development';
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Minimum log level to output. Set via LOG_LEVEL env var. */
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? (isDev ? 'debug' : 'info');

// ---------------------------------------------------------------------------
// Core Logger
// ---------------------------------------------------------------------------

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[MIN_LEVEL];
}

function write(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  if (isDev) {
    // Pretty-print for development readability
    const color = levelColor(entry.level);
    const prefix = `${entry.timestamp} ${color}${entry.level.toUpperCase().padEnd(5)}\x1b[0m`;
    const source = entry.source ? ` \x1b[90m[${entry.source}]\x1b[0m` : '';
    const contextStr =
      entry.context && Object.keys(entry.context).length > 0
        ? ` ${JSON.stringify(entry.context)}`
        : '';

    const method =
      entry.level === 'error'
        ? console.error
        : entry.level === 'warn'
          ? console.warn
          : console.log;

    method(`${prefix}${source} ${entry.message}${contextStr}`);
  } else {
    // Production: machine-readable JSON to stdout
    const json = JSON.stringify(entry);
    if (entry.level === 'error') {
      process.stderr.write(json + '\n');
    } else {
      process.stdout.write(json + '\n');
    }
  }
}

function levelColor(level: LogLevel): string {
  switch (level) {
    case 'error':
      return '\x1b[31m'; // red
    case 'warn':
      return '\x1b[33m'; // yellow
    case 'info':
      return '\x1b[36m'; // cyan
    case 'debug':
      return '\x1b[90m'; // gray
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  source?: string
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    source,
  };
}

export const log = {
  debug(message: string, context?: Record<string, unknown>, source?: string): void {
    write(createLogEntry('debug', message, context, source));
  },

  info(message: string, context?: Record<string, unknown>, source?: string): void {
    write(createLogEntry('info', message, context, source));
  },

  warn(message: string, context?: Record<string, unknown>, source?: string): void {
    write(createLogEntry('warn', message, context, source));
  },

  error(message: string, context?: Record<string, unknown>, source?: string): void {
    write(createLogEntry('error', message, context, source));
  },
};

// ---------------------------------------------------------------------------
// Route-specific logger factory
// ---------------------------------------------------------------------------

/**
 * Create a logger pre-bound to a specific source (e.g., route filename).
 *
 * @example
 * ```ts
 * const logger = createLogger('api/generate');
 * logger.info('Generation started', { userId: '123' });
 * logger.error('Generation failed', { error: err.message });
 * ```
 */
export function createLogger(source: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      log.debug(message, context, source),
    info: (message: string, context?: Record<string, unknown>) =>
      log.info(message, context, source),
    warn: (message: string, context?: Record<string, unknown>) =>
      log.warn(message, context, source),
    error: (message: string, context?: Record<string, unknown>) =>
      log.error(message, context, source),
  };
}
