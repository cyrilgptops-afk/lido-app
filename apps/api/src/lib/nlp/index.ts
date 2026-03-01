/**
 * NLP Adapter Factory
 * 
 * Factory pattern for NLP adapters (singleton)
 * Follows the same pattern as StorageAdapter factory
 */

import { communicationConfig } from '../../config';
import { logger } from '../logger';
import { NLPAdapter } from './adapter';
import { RasaNLPAdapter } from './rasa.adapter';

let nlpClientInstance: NLPAdapter | null = null;

/**
 * Get the configured NLP adapter instance (singleton)
 */
export async function getNLPClient(): Promise<NLPAdapter> {
  if (nlpClientInstance) {
    return nlpClientInstance;
  }

  const adapterType = communicationConfig.nlp.adapter;

  switch (adapterType) {
    case 'rasa':
      nlpClientInstance = new RasaNLPAdapter();
      break;
    default:
      throw new Error(`Unsupported NLP adapter: ${adapterType}`);
  }

  const initResult = await nlpClientInstance.initialize();
  if (!initResult.success) {
    logger.error({ adapter: adapterType, error: initResult.error }, 'NLP adapter initialization failed');
    throw new Error(`Failed to initialize NLP adapter: ${initResult.error}`);
  }

  logger.info({ adapter: nlpClientInstance.getAdapterName() }, 'NLP client initialized');
  return nlpClientInstance;
}

// Re-export types for convenience
export type {
  NLPAdapter,
  NLPSuggestion,
  NLPEntity,
  NLPIntent,
  NLPAnalysis,
  ConversationMessage,
  NLPResult,
} from './adapter';
