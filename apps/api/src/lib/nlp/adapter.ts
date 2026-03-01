/**
 * NLP Adapter Interface
 * 
 * Abstract interface for NLP providers (Rasa, custom models)
 * Follows the adapter pattern established for StorageAdapter
 */

export interface NLPSuggestion {
  text: string;
  confidence: number;
  intent?: string;
}

export interface NLPEntity {
  entity: string;
  value: string;
  confidence: number;
  start?: number;
  end?: number;
}

export interface NLPIntent {
  name: string;
  confidence: number;
}

export interface NLPAnalysis {
  intent: NLPIntent;
  entities: NLPEntity[];
  text: string;
}

export interface ConversationMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface NLPResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  latencyMs?: number;
}

/**
 * NLP Adapter Interface
 * 
 * All NLP providers must implement this interface
 */
export interface NLPAdapter {
  /**
   * Initialize the adapter (validate connection, check model health)
   */
  initialize(): Promise<NLPResult<void>>;

  /**
   * Parse user message for intent and entities
   */
  parseMessage(text: string, conversationId?: string): Promise<NLPResult<NLPAnalysis>>;

  /**
   * Generate response suggestions based on intent
   */
  generateSuggestions(
    text: string,
    conversationHistory: ConversationMessage[],
    maxSuggestions?: number
  ): Promise<NLPResult<NLPSuggestion[]>>;

  /**
   * Train the model with new conversation data (optional)
   */
  trainModel?(trainingData: any): Promise<NLPResult<void>>;

  /**
   * Health check for the NLP provider
   */
  healthCheck(): Promise<NLPResult<{ status: 'healthy' | 'degraded' | 'down' }>>;

  /**
   * Get adapter name/type
   */
  getAdapterName(): string;
}
