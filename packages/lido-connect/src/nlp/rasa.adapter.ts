import type { NLPAdapter } from './adapter';
import type { NLPAnalysis, NLPSuggestion, ConversationMessage, NLPResult } from '../types/nlp.types';
import type { NLPConfig } from '../config/nlp.config';

/**
 * Rasa NLP Adapter Implementation
 */
export class RasaNLPAdapter implements NLPAdapter {
  private readonly config: NLPConfig;
  private logger?: any;

  constructor(config: NLPConfig, logger?: any) {
    this.config = config;
    this.logger = logger;
  }

  async initialize(): Promise<NLPResult<void>> {
    const startTime = Date.now();
    
    try {
      const healthResult = await this.healthCheck();
      
      if (!healthResult.success) {
        return {
          success: false,
          error: {
            code: 'RASA_INIT_FAILED',
            message: 'Rasa server health check failed',
          },
          latencyMs: Date.now() - startTime,
        };
      }

      this.logger?.info('Rasa NLP adapter initialized successfully');
      
      return {
        success: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger?.error({ error }, 'Failed to initialize Rasa adapter');
      return {
        success: false,
        error: {
          code: 'RASA_INIT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async parseMessage(text: string, conversationId?: string): Promise<NLPResult<NLPAnalysis>> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const url = `${this.config.rasaUrl}/model/parse`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.config.rasaToken) {
        headers['Authorization'] = `Bearer ${this.config.rasaToken}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, message_id: conversationId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Rasa API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      // Parse Rasa response
      const analysis: NLPAnalysis = {
        text,
        intent: {
          name: data.intent?.name || 'unknown',
          confidence: data.intent?.confidence || 0,
        },
        entities: (data.entities || []).map((entity: any) => ({
          entity: entity.entity,
          value: entity.value,
          confidence: entity.confidence_entity,
          start: entity.start,
          end: entity.end,
        })),
        confidence: data.intent?.confidence || 0,
        timestamp: new Date(),
      };

      return {
        success: true,
        data: analysis,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger?.error({ error, text }, 'Rasa parseMessage failed');
      
      return {
        success: false,
        error: {
          code: 'RASA_PARSE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to parse message',
        },
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async generateSuggestions(
    text: string,
    history: ConversationMessage[],
    maxSuggestions: number = 3
  ): Promise<NLPResult<NLPSuggestion[]>> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      // Use Rasa's conversation prediction endpoint
      const url = `${this.config.rasaUrl}/conversations/${history[0]?.timestamp.getTime() || 'default'}/predict`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.config.rasaToken) {
        headers['Authorization'] = `Bearer ${this.config.rasaToken}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          message_id: history[0]?.timestamp.getTime(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Fallback to static suggestions if Rasa predict fails
        this.logger?.warn('Rasa predict endpoint failed, using fallback suggestions');
        return this.generateFallbackSuggestions(text, maxSuggestions, Date.now() - startTime);
      }

      const data: any = await response.json();

      // Convert Rasa actions to suggestions
      const suggestions: NLPSuggestion[] = (data.scores || [])
        .slice(0, maxSuggestions)
        .map((score: any) => ({
          text: this.convertActionToText(score.action),
          intent: score.action,
          confidence: score.score,
        }));

      return {
        success: true,
        data: suggestions,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger?.warn({ error }, 'Rasa generateSuggestions failed, using fallback');
      return this.generateFallbackSuggestions(text, maxSuggestions, Date.now() - startTime);
    }
  }

  async healthCheck(): Promise<NLPResult<{ status: string; version?: string }>> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.rasaUrl}/status`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Rasa health check failed: ${response.status}`);
      }

      const data: any = await response.json();

      return {
        success: true,
        data: {
          status: 'healthy',
          version: data.version,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RASA_HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Health check failed',
        },
        latencyMs: Date.now() - startTime,
      };
    }
  }

  getAdapterName(): string {
    return 'rasa';
  }

  /**
   * Convert Rasa action to readable text
   */
  private convertActionToText(action: string): string {
    if (action.startsWith('utter_')) {
      return action
        .replace('utter_', '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return action;
  }

  /**
   * Generate fallback suggestions when Rasa predict fails
   */
  private generateFallbackSuggestions(
    text: string,
    maxSuggestions: number,
    latencyMs: number
  ): NLPResult<NLPSuggestion[]> {
    const commonSuggestions: NLPSuggestion[] = [
      { text: 'Tell me more', intent: 'request_info' },
      { text: 'I need help', intent: 'request_help' },
      { text: 'Talk to an agent', intent: 'request_agent' },
      { text: 'Go back', intent: 'navigate_back' },
      { text: 'Start over', intent: 'restart' },
    ];

    return {
      success: true,
      data: commonSuggestions.slice(0, maxSuggestions),
      latencyMs,
    };
  }
}
