import * as vm from 'vm';
import type {
  BotContext,
  BotResponse,
  BotScriptModule,
  BotHelpers,
} from './context';
import { SmartSuggestion } from './SmartSuggestion';
import { DatabaseQuery } from './DatabaseQuery';
import { FormBuilder } from './FormBuilder';
import { TableRenderer } from './TableRenderer';
import { BotUtils } from './BotUtils';
import { getBotLogger } from './BotLogger';
import type { BotLoggerOptions } from './BotLogger';

/**
 * Bot Script Executor
 *
 * Executes bot scripts in a sandboxed VM environment with timeout.
 * Every load / execution / error is written to a rolling daily log file
 * at  <cwd>/logs/bots/bot-YYYY-MM-DD.log  (one JSON line per event).
 */
export class BotScriptExecutor {
  private logger?: any;
  private db: any;
  private scriptCache: Map<string, BotScriptModule> = new Map();
  private readonly EXECUTION_TIMEOUT = 5000; // 5 seconds
  private readonly ALLOWED_MODULES = ['crypto', 'util'];
  /** File-based structured logger — one JSON line per event */
  private readonly botLogger = getBotLogger();

  constructor(db: any, logger?: any, botLoggerOptions?: BotLoggerOptions) {
    this.db = db;
    this.logger = logger;
    // Re-init the singleton with the caller's options (logsDir, pinoLogger)
    // on first construction so the API gateway can control the log directory.
    if (botLoggerOptions || logger) {
      getBotLogger({ pinoLogger: logger, ...botLoggerOptions });
    }
  }

  /**
   * Load and compile a bot script
   */
  async loadScript(botId: string, scriptCode: string): Promise<void> {
    try {
      // Create sandbox context with whitelisted modules
      const sandbox: any = {
        module: { exports: {} },
        exports: {},
        require: this.createRequireFunction(),
        console: {
          log: (...args: any[]) => this.logger?.info({ botId }, ...args),
          error: (...args: any[]) => this.logger?.error({ botId }, ...args),
          warn: (...args: any[]) => this.logger?.warn({ botId }, ...args),
        },
      };

      // Compile script
      const script = new vm.Script(scriptCode, {
        filename: `bot-${botId}.js`,
      });

      // Run in sandbox
      vm.createContext(sandbox);
      script.runInContext(sandbox);

      // Get module exports
      const botModule = sandbox.module.exports as BotScriptModule;

      // Validate bot module structure
      if (!botModule.name || !botModule.version || !botModule.intents) {
        throw new Error('Invalid bot script: missing required properties (name, version, intents)');
      }

      // Cache the compiled module
      this.scriptCache.set(botId, botModule);

      this.logger?.info({ botId, name: botModule.name, version: botModule.version }, 'Bot script loaded successfully');
      this.botLogger.logLoad({ botId, botName: botModule.name, version: botModule.version });
    } catch (error) {
      this.logger?.error({ error, botId }, 'Failed to load bot script');
      throw error;
    }
  }

  /**
   * Execute a bot handler for a specific intent
   */
  async execute(
    botId: string,
    intent: string,
    context: BotContext
  ): Promise<BotResponse> {
    const startTime = Date.now();

    try {
      // Get cached bot module
      const botModule = this.scriptCache.get(botId);
      if (!botModule) {
        throw new Error(`Bot script not loaded: ${botId}`);
      }

      // Initialize bot if needed
      if (botModule.initialize) {
        await botModule.initialize(context);
      }

      // Get intent handler (with fallback to wildcard)
      let handler = botModule.intents[intent];
      if (!handler && botModule.intents['*']) {
        handler = botModule.intents['*'];
        this.logger?.info({ botId, intent }, 'Using wildcard handler for unknown intent');
        this.botLogger.logIntentFallback({ botId, context, intent });
      }

      if (!handler) {
        throw new Error(`No handler found for intent: ${intent}`);
      }

      // Create helper instances
      const helpers: BotHelpers = {
        suggestions: new SmartSuggestion(context),
        db: new DatabaseQuery(context, this.db, this.logger),
        form: new FormBuilder(context),
        table: new TableRenderer(context),
        utils: new BotUtils(context),
      };

      // Execute handler with timeout
      const response = await this.executeWithTimeout(
        () => handler(context, helpers),
        this.EXECUTION_TIMEOUT
      );

      const executionTime = Date.now() - startTime;

      // Log execution to DB
      await this.logExecution(botId, context, intent, response, executionTime, true);

      // Log execution to file
      this.botLogger.logExecution({
        botId,
        botName: botModule.name,
        context,
        intent,
        nlpResolved:    context.metadata?.nlpResolved,
        nlpConfidence:  context.metadata?.nlpConfidence,
        response,
        executionTimeMs: executionTime,
        success: true,
      });

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.error({ error, botId, intent }, 'Bot execution failed');

      // Log failed execution to DB
      await this.logExecution(botId, context, intent, null, executionTime, false, errMsg);

      // Log failed execution to file
      this.botLogger.logExecution({
        botId,
        context,
        intent,
        response: null,
        executionTimeMs: executionTime,
        success: false,
        error: errMsg,
      });

      // Return error response
      return {
        message: "I'm having trouble processing your request right now. Please try again or contact support.",
        suggestions: ['Talk to an agent', 'Try again', 'Go back'],
      };
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      Promise.resolve(fn()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Create require function with whitelisted modules
   */
  private createRequireFunction(): (moduleName: string) => any {
    return (moduleName: string) => {
      if (!this.ALLOWED_MODULES.includes(moduleName)) {
        throw new Error(`Module "${moduleName}" is not allowed in bot scripts`);
      }
      return require(moduleName);
    };
  }

  /**
   * Log bot execution to database
   */
  private async logExecution(
    botId: string,
    context: BotContext,
    intent: string,
    response: BotResponse | null,
    executionTimeMs: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      const sql = `
        INSERT INTO bot_execution_logs (
          bot_id, conversation_id, message_id, intent,
          handler_function, execution_time_ms, success,
          response_data, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      await this.db.queryRaw(sql, [
        botId,
        context.conversationId,
        context.messageId,
        intent,
        `intents.${intent}`,
        executionTimeMs,
        success,
        response ? JSON.stringify(response) : null,
        errorMessage || null,
      ]);
    } catch (error) {
      this.logger?.error({ error }, 'Failed to log bot execution');
    }
  }

  /**
   * Clear script cache (useful for reloading)
   */
  clearCache(botId?: string): void {
    if (botId) {
      this.scriptCache.delete(botId);
    } else {
      this.scriptCache.clear();
    }
  }
}
