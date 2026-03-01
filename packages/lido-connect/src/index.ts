// ─── NLP Layer ──────────────────────────────────────────────────────────────
export {
  getNLPClient,
  resetNLPClient,
  RasaNLPAdapter,
  createNLPConfig,
} from './nlp';

export type {
  NLPAdapter,
  NLPAnalysis,
  NLPSuggestion,
  NLPIntent,
  NLPEntity,
  ConversationMessage,
  NLPResult,
  NLPConfig,
} from './nlp';

// ─── Bot Runtime Layer ──────────────────────────────────────────────────────
export {
  BotScriptExecutor,
  SmartSuggestion,
  DatabaseQuery,
  FormBuilder,
  TableRenderer,
  BotUtils,
} from './bot-runtime';

export type {
  BotContext,
  BotResponse,
  BotScriptModule,
  BotIntentHandler,
  BotHelpers,
  FormDefinition,
  FormField,
  TableDefinition,
  TableColumn,
} from './bot-runtime';

// ─── Storage Layer ──────────────────────────────────────────────────────────
export { BotScriptStorageService } from './storage';
export type { StorageUploadResult } from './storage';

// ─── WebRTC Layer ───────────────────────────────────────────────────────────
// TODO: Export WebRTC service after migration from apps/api
// export { WebRTCService } from './webrtc/webrtc.service';

// ─── Agent Routing Layer ────────────────────────────────────────────────────
// TODO: Export agent router after migration from apps/api
// export { AgentRouterService } from './agent/agent-router.service';

// ─── Configuration ──────────────────────────────────────────────────────────
// TODO: Export communication config after WebRTC/Agent migration
// export { createCommunicationConfig } from './config/communication.config';
// export type { CommunicationConfig } from './config/communication.config';
