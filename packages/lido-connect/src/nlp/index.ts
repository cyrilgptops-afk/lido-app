import { RasaNLPAdapter } from './rasa.adapter';
import type { NLPAdapter } from './adapter';
import type { NLPConfig } from '../config/nlp.config';

let nlpClientInstance: NLPAdapter | null = null;

/**
 * Get NLP client singleton
 * 
 * @param config - NLP configuration
 * @param logger - Optional logger instance
 * @returns NLP adapter instance
 */
export async function getNLPClient(config: NLPConfig, logger?: any): Promise<NLPAdapter> {
  if (nlpClientInstance) {
    return nlpClientInstance;
  }

  // Currently only Rasa is supported
  if (config.adapter === 'rasa') {
    nlpClientInstance = new RasaNLPAdapter(config, logger);
  } else {
    throw new Error(`Unsupported NLP adapter: ${config.adapter}`);
  }

  // Initialize the adapter
  const initResult = await nlpClientInstance.initialize();
  
  if (!initResult.success) {
    logger?.error({ error: initResult.error }, 'Failed to initialize NLP client');
    throw new Error(`NLP initialization failed: ${initResult.error?.message}`);
  }

  return nlpClientInstance;
}

/**
 * Reset NLP client (useful for testing)
 */
export function resetNLPClient(): void {
  nlpClientInstance = null;
}

// Re-export types and classes
export { RasaNLPAdapter } from './rasa.adapter';
export type { NLPAdapter } from './adapter';
export type { NLPAnalysis, NLPSuggestion, NLPIntent, NLPEntity, ConversationMessage, NLPResult } from '../types/nlp.types';
export { createNLPConfig } from '../config/nlp.config';
export type { NLPConfig } from '../config/nlp.config';
