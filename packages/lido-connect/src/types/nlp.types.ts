/**
 * NLP Intent
 */
export interface NLPIntent {
  name: string;
  confidence: number;
}

/**
 * NLP Entity
 */
export interface NLPEntity {
  entity: string;
  value: string;
  confidence?: number;
  start?: number;
  end?: number;
}

/**
 * NLP Analysis Result
 */
export interface NLPAnalysis {
  text: string;
  intent: NLPIntent;
  entities: NLPEntity[];
  confidence: number;
  timestamp: Date;
}

/**
 * NLP Suggestion
 */
export interface NLPSuggestion {
  text: string;
  intent?: string;
  confidence?: number;
}

/**
 * Conversation Message (for NLP context)
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'bot';
  content: string;
  timestamp: Date;
}

/**
 * Generic Result wrapper for NLP operations
 */
export interface NLPResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  latencyMs?: number;
}
