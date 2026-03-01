import type { NLPAnalysis, NLPSuggestion, ConversationMessage, NLPResult } from '../types/nlp.types';

/**
 * Abstract NLP Adapter Interface
 * 
 * Defines the contract for NLP providers (Rasa, Dialogflow, etc.)
 */
export interface NLPAdapter {
  /**
   * Initialize the NLP adapter
   */
  initialize(): Promise<NLPResult<void>>;

  /**
   * Parse a user message and extract intent + entities
   * 
   * @param text - User message text
   * @param conversationId - Optional conversation ID for context
   * @returns NLP analysis with intent, entities, and confidence
   */
  parseMessage(text: string, conversationId?: string): Promise<NLPResult<NLPAnalysis>>;

  /**
   * Generate smart suggestions based on conversation context
   * 
   * @param text - Current message text
   * @param history - Previous conversation messages
   * @param maxSuggestions - Maximum number of suggestions to return
   * @returns Array of suggested responses
   */
  generateSuggestions(
    text: string,
    history: ConversationMessage[],
    maxSuggestions?: number
  ): Promise<NLPResult<NLPSuggestion[]>>;

  /**
   * Train the NLP model (optional, provider-specific)
   * 
   * @param trainingData - Training data in provider format
   */
  trainModel?(trainingData: unknown): Promise<NLPResult<void>>;

  /**
   * Health check for NLP service
   */
  healthCheck(): Promise<NLPResult<{ status: string; version?: string }>>;

  /**
   * Get adapter name
   */
  getAdapterName(): string;
}
