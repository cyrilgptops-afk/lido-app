import * as fs from 'fs';
import * as path from 'path';
import type { BotContext, BotResponse } from './context';

/**
 * BotLogger
 *
 * Writes one structured JSON line per event to a rolling daily log file:
 *
 *   <logsDir>/bot-YYYY-MM-DD.log
 *
 * Each line is a self-contained JSON object so the files can be tail'd,
 * grep'd, or ingested by any log aggregator (Loki, Datadog, etc.).
 *
 * The logger is intentionally sync-free on the hot path — it uses
 * fs.appendFile (async, non-blocking) and swallows write errors so a
 * disk issue never breaks the bot execution flow.
 *
 * Usage (from executor):
 *
 *   const botLogger = new BotLogger({ logsDir: '/var/log/lido/bots' });
 *   botLogger.logExecution({ botId, botName, context, intent, response, executionTimeMs, success });
 *   botLogger.logLoad({ botId, botName, version });
 *   botLogger.logError({ botId, context, intent, error, executionTimeMs });
 */

export interface BotLogEntry {
  /** ISO-8601 timestamp */
  ts: string;
  /** Event type */
  event: 'bot.load' | 'bot.execute' | 'bot.error' | 'bot.intent_fallback' | 'bot.db_error' | 'bot.script_log' | 'bot.fetch';
  botId: string;
  botName?: string;
  version?: string;
  userId?: string;
  organizationId?: string;
  conversationId?: string;
  messageId?: string;
  intent?: string;
  /** Whether the intent was resolved by NLP (true) or keyword detection (false) */
  nlpResolved?: boolean;
  /** NLP confidence score, if applicable */
  nlpConfidence?: number;
  executionTimeMs?: number;
  success?: boolean;
  /** Truncated user message (max 200 chars) */
  userMessage?: string;
  /** Whether a form/table/actions were returned */
  hasForm?: boolean;
  hasTable?: boolean;
  hasActions?: boolean;
  suggestionsCount?: number;
  error?: string;
  [key: string]: unknown;
}

export interface BotLoggerOptions {
  /**
   * Directory where log files are written.
   * Defaults to <cwd>/logs/bots
   */
  logsDir?: string;
  /**
   * Pino-compatible logger for operational meta-messages
   * (e.g. "log file opened"). Bot events are always written
   * to the file regardless of whether pinoLogger is provided.
   */
  pinoLogger?: any;
}

export class BotLogger {
  private readonly logsDir: string;
  private readonly pinoLogger?: any;

  /** Track which date string we last opened so we rotate at midnight */
  private currentDateStr: string = '';
  private currentLogPath: string = '';

  constructor(options: BotLoggerOptions = {}) {
    this.logsDir = options.logsDir ?? path.join(process.cwd(), 'logs', 'bots');
    this.pinoLogger = options.pinoLogger;
    this.ensureLogsDir();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Log a successful script load. */
  logLoad(params: { botId: string; botName: string; version: string }): void {
    this.write({
      event: 'bot.load',
      botId: params.botId,
      botName: params.botName,
      version: params.version,
      success: true,
    });
  }

  /** Log a bot execution (success or failure). */
  logExecution(params: {
    botId: string;
    botName?: string;
    context: BotContext;
    intent: string;
    nlpResolved?: boolean;
    nlpConfidence?: number;
    response: BotResponse | null;
    executionTimeMs: number;
    success: boolean;
    error?: string;
  }): void {
    const { botId, botName, context, intent, response, executionTimeMs, success, error, nlpResolved, nlpConfidence } = params;

    this.write({
      event: success ? 'bot.execute' : 'bot.error',
      botId,
      botName,
      userId:         context.userId,
      organizationId: context.organizationId,
      conversationId: context.conversationId,
      messageId:      context.messageId,
      intent,
      nlpResolved,
      nlpConfidence,
      userMessage:    context.userMessage?.slice(0, 200),
      executionTimeMs,
      success,
      hasForm:        response?.form    != null,
      hasTable:       response?.table   != null,
      hasActions:     Array.isArray(response?.actions) && response.actions.length > 0,
      suggestionsCount: Array.isArray(response?.suggestions) ? response.suggestions.length : 0,
      ...(error ? { error } : {}),
    });
  }

  /** Log a fallback-to-wildcard event. */
  logIntentFallback(params: { botId: string; context: BotContext; intent: string }): void {
    this.write({
      event:          'bot.intent_fallback',
      botId:          params.botId,
      userId:         params.context.userId,
      organizationId: params.context.organizationId,
      conversationId: params.context.conversationId,
      intent:         params.intent,
      userMessage:    params.context.userMessage?.slice(0, 200),
    });
  }

  /** Log a DB query error inside a bot handler. */
  logDbError(params: { botId: string; context: BotContext; operation: string; error: string }): void {
    this.write({
      event:          'bot.db_error',
      botId:          params.botId,
      userId:         params.context.userId,
      organizationId: params.context.organizationId,
      conversationId: params.context.conversationId,
      operation:      params.operation,
      error:          params.error,
    });
  }

  /**
   * Log a console/logger call made from inside a bot script.
   * level: 'info' | 'warn' | 'error' | 'debug'
   */
  logScript(params: { botId: string; level: string; message: string; meta?: Record<string, unknown> }): void {
    this.write({
      event:   'bot.script_log',
      botId:   params.botId,
      level:   params.level,
      message: params.message,
      ...(params.meta ?? {}),
    });
  }

  /**
   * Log an outbound fetch call made from inside a bot script.
   */
  logFetch(params: {
    botId:     string;
    method:    string;
    url:       string;
    status?:   number;
    latencyMs: number;
    success:   boolean;
    error?:    string;
  }): void {
    this.write({
      event:     'bot.fetch',
      botId:     params.botId,
      method:    params.method,
      url:       params.url,
      ...(params.status != null ? { status: params.status } : {}),
      latencyMs: params.latencyMs,
      success:   params.success,
      ...(params.error ? { error: params.error } : {}),
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private write(fields: Omit<BotLogEntry, 'ts'>): void {
    const entry = {
      ts: new Date().toISOString(),
      ...fields,
    } as BotLogEntry;

    const line = JSON.stringify(entry) + '\n';
    const filePath = this.resolveLogPath();

    // Non-blocking append — never throws into the caller
    fs.appendFile(filePath, line, 'utf8', (err) => {
      if (err) {
        this.pinoLogger?.warn({ err, filePath }, 'BotLogger: failed to write log entry');
      }
    });
  }

  /**
   * Returns today's log file path, creating the file (and rotating) as needed.
   */
  private resolveLogPath(): string {
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (dateStr !== this.currentDateStr) {
      this.currentDateStr = dateStr;
      this.currentLogPath = path.join(this.logsDir, `bot-${dateStr}.log`);
      this.pinoLogger?.info({ file: this.currentLogPath }, 'BotLogger: opened new log file');
    }
    return this.currentLogPath;
  }

  private ensureLogsDir(): void {
    try {
      fs.mkdirSync(this.logsDir, { recursive: true });
    } catch (err) {
      this.pinoLogger?.warn({ err, logsDir: this.logsDir }, 'BotLogger: could not create logs directory');
    }
  }

  /** Expose the current log file path (useful for admin endpoints). */
  get currentFile(): string {
    return this.resolveLogPath();
  }

  /** Return all log file paths in the logs directory, newest first. */
  listLogFiles(): string[] {
    try {
      return fs
        .readdirSync(this.logsDir)
        .filter((f) => f.startsWith('bot-') && f.endsWith('.log'))
        .sort()
        .reverse()
        .map((f) => path.join(this.logsDir, f));
    } catch {
      return [];
    }
  }
}

/** Singleton — created once per process, shared across all executor instances. */
let _instance: BotLogger | null = null;

export function getBotLogger(options?: BotLoggerOptions): BotLogger {
  if (!_instance) {
    _instance = new BotLogger(options);
  }
  return _instance;
}
