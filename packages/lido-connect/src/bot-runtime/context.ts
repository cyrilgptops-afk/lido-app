/**
 * Bot execution context passed to bot scripts
 */
export interface BotContext {
  userId: string;
  organizationId: string;
  conversationId: string;
  messageId: string;
  userMessage: string;
  intent: string;
  entities: Array<{ entity: string; value: string }>;
  metadata?: Record<string, any>;
}

/**
 * Bot response structure
 */
export interface BotResponse {
  message: string;
  suggestions?: string[];
  form?: FormDefinition;
  table?: TableDefinition;
  actions?: Array<{ type: string; label: string; value: any }>;
  metadata?: Record<string, any>;
}

/**
 * Form definition for dynamic forms
 */
export interface FormDefinition {
  title: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

/**
 * Table definition for data display
 */
export interface TableDefinition {
  title?: string;
  columns: TableColumn[];
  rows: Array<Record<string, any>>;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'badge' | 'action';
  format?: string;
  sortable?: boolean;
  width?: string;
}

/**
 * Bot script module interface
 */
export interface BotScriptModule {
  name: string;
  version: string;
  initialize?: (context: BotContext) => Promise<void> | void;
  /**
   * Optional keyword map for intent detection.
   * The runtime uses this to match user messages against intent keys.
   * Keys are intent names; values are arrays of trigger phrases/words.
   */
  keywords?: Record<string, string[]>;
  intents: Record<string, BotIntentHandler>;
}

export type BotIntentHandler = (
  context: BotContext,
  helpers: BotHelpers
) => Promise<BotResponse> | BotResponse;

/**
 * Helper classes available to bot scripts
 */
export interface BotHelpers {
  suggestions: any; // SmartSuggestion instance
  db: any; // DatabaseQuery instance
  form: any; // FormBuilder instance
  table: any; // TableRenderer instance
  utils: any; // BotUtils instance
}
