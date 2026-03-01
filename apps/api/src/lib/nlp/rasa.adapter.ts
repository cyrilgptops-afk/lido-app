/**
 * Rasa NLP Adapter Implementation
 * 
 * Implements NLP adapter for Rasa Open Source NLP engine
 */

import { logger } from '../logger';
import { communicationConfig } from '../../config';
import {
  NLPAdapter,
  NLPSuggestion,
  NLPEntity,
  NLPIntent,
  NLPAnalysis,
  ConversationMessage,
  NLPResult,
} from './adapter';

interface RasaParseResponse {
  intent: {
    name: string;
    confidence: number;
  };
  entities: Array<{
    entity: string;
    value: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  text: string;
  intent_ranking?: Array<{
    name: string;
    confidence: number;
  }>;
}

interface RasaPredictResponse {
  scores: Array<{
    action: string;
    score: number;
  }>;
  tracker: {
    sender_id: string;
    slots: Record<string, any>;
    latest_message: {
      intent: { name: string; confidence: number };
      entities: any[];
    };
  };
}

export class RasaNLPAdapter implements NLPAdapter {
  private readonly config = communicationConfig.nlp;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor() {
    this.baseUrl = this.config.rasaUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
    if (this.config.rasaToken) {
      this.headers['Authorization'] = `Bearer ${this.config.rasaToken}`;
    }
  }

  async initialize(): Promise<NLPResult<void>> {
    try {
      const healthResult = await this.healthCheck();
      if (!healthResult.success || healthResult.data?.status === 'down') {
        return { success: false, error: 'Rasa server is not reachable' };
      }

      logger.info({ adapter: 'rasa', url: this.baseUrl }, 'Rasa NLP adapter initialized');
      return { success: true };
    } catch (error) {
      logger.error({ error, adapter: 'rasa' }, 'Rasa NLP adapter initialization failed');
      return { success: false, error: 'Failed to initialize Rasa adapter' };
    }
  }

  async parseMessage(text: string, conversationId?: string): Promise<NLPResult<NLPAnalysis>> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.baseUrl}/model/parse`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          text,
          message_id: conversationId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Rasa API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as RasaParseResponse;
      const latencyMs = Date.now() - startTime;

      const analysis: NLPAnalysis = {
        intent: {
          name: data.intent.name,
          confidence: data.intent.confidence,
        },
        entities: data.entities.map(e => ({
          entity: e.entity,
          value: e.value,
          confidence: e.confidence,
          start: e.start,
          end: e.end,
        })),
        text: data.text,
      };

      logger.info({
        adapter: 'rasa',
        intent: data.intent.name,
        confidence: data.intent.confidence,
        entitiesCount: data.entities.length,
        latencyMs,
      }, 'Message parsed');

      return { success: true, data: analysis, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error({ error, adapter: 'rasa', text, latencyMs }, 'Message parsing failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse message',
        latencyMs,
      };
    }
  }

  async generateSuggestions(
    text: string,
    conversationHistory: ConversationMessage[],
    maxSuggestions: number = 3
  ): Promise<NLPResult<NLPSuggestion[]>> {
    const startTime = Date.now();

    try {
      // First, parse the message to get intent
      const parseResult = await this.parseMessage(text);
      if (!parseResult.success || !parseResult.data) {
        return { success: false, error: 'Failed to parse message for suggestions' };
      }

      const { intent } = parseResult.data;

      // Use Rasa's prediction endpoint with conversation history
      const conversationId = `conv_${Date.now()}`;
      const events = conversationHistory.map((msg, idx) => ({
        event: msg.sender === 'user' ? 'user' : 'bot',
        text: msg.text,
        timestamp: Date.now() - (conversationHistory.length - idx) * 1000,
      }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/predict`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          events: [
            ...events,
            { event: 'user', text, timestamp: Date.now() },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Rasa prediction API error: ${response.status}`);
      }

      const data = await response.json() as RasaPredictResponse;
      const latencyMs = Date.now() - startTime;

      // Convert Rasa action predictions to suggestions
      const suggestions: NLPSuggestion[] = data.scores
        .filter(s => s.action.startsWith('utter_') && s.score >= this.config.confidenceThreshold)
        .slice(0, maxSuggestions)
        .map(s => ({
          text: this.convertActionToText(s.action),
          confidence: s.score,
          intent: intent.name,
        }));

      // Fallback: Generate generic suggestions based on intent if no actions found
      if (suggestions.length === 0) {
        suggestions.push(...this.generateFallbackSuggestions(intent.name, maxSuggestions));
      }

      logger.info({
        adapter: 'rasa',
        suggestionsCount: suggestions.length,
        intent: intent.name,
        latencyMs,
      }, 'Suggestions generated');

      return { success: true, data: suggestions, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error({ error, adapter: 'rasa', text, latencyMs }, 'Suggestion generation failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate suggestions',
        latencyMs,
      };
    }
  }

  async healthCheck(): Promise<NLPResult<{ status: 'healthy' | 'degraded' | 'down' }>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: this.headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, data: { status: 'healthy' } };
      } else {
        return { success: true, data: { status: 'degraded' } };
      }
    } catch (error) {
      logger.error({ error, adapter: 'rasa' }, 'Rasa health check failed');
      return { success: true, data: { status: 'down' } };
    }
  }

  getAdapterName(): string {
    return 'rasa';
  }

  /**
   * Convert Rasa action name to human-readable text
   */
  private convertActionToText(action: string): string {
    // Remove 'utter_' prefix and convert snake_case to sentence
    const text = action
      .replace(/^utter_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    return text;
  }

  /**
   * Generate fallback suggestions based on common intents
   */
  private generateFallbackSuggestions(intent: string, maxSuggestions: number): NLPSuggestion[] {
    const fallbackMap: Record<string, string[]> = {
      greet: ['Hello! How can I help you?', 'Hi there!', 'Welcome!'],
      goodbye: ['Goodbye!', 'See you later!', 'Have a great day!'],
      affirm: ['Yes', 'That\'s correct', 'Absolutely'],
      deny: ['No', 'Not quite', 'I don\'t think so'],
      thank: ['You\'re welcome!', 'Happy to help!', 'Anytime!'],
      help: ['How can I assist you?', 'What do you need help with?', 'I\'m here to help!'],
      default: ['Could you tell me more?', 'I understand', 'Let me help you with that'],
    };

    const suggestions = fallbackMap[intent] || fallbackMap.default;
    return suggestions.slice(0, maxSuggestions).map(text => ({
      text,
      confidence: 0.5,
      intent,
    }));
  }
}
