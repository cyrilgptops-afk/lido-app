import { apiClient } from './client';

// ─── Bot rich-response types (mirrors @lido/connect BotResponse) ─────────────

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  disabled?: boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: { pattern?: string; min?: number; max?: number; minLength?: number; maxLength?: number };
}

export interface FormDefinition {
  title: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'badge' | 'action';
  width?: string;
}

export interface TableDefinition {
  title?: string;
  columns: TableColumn[];
  rows: Array<Record<string, any>>;
}

export interface BotAction {
  type: string;
  label: string;
  value: string;
}

export interface BotMessageMetadata {
  suggestions?: string[];
  form?:        FormDefinition | null;
  table?:       TableDefinition | null;
  actions?:     BotAction[] | null;
  intent?:      string;
}
export interface BotMessagePayload {
  uuid: string;
  sender_type: 'bot';
  content: string;
  content_type: string;
  metadata: BotMessageMetadata | null;
  created_at: string;
}
// ─── Core message / conversation types ───────────────────────────────────────

export interface Message {
  id?: number | string;
  uuid: string;
  conversation_id?: number;
  sender_type: 'user' | 'bot' | 'agent';
  sender_id?: number;
  content: string;
  content_type?: string;
  nlp_intent?: string;
  nlp_confidence?: number;
  nlp_suggestions?: string[];
  metadata?: BotMessageMetadata | null;
  created_at: string;
}

export interface Conversation {
  id?: number;
  uuid: string;
  user_id?: number;
  organization_id?: number;
  type: 'chat' | 'call' | 'user_bot';
  status: 'active' | 'closed';
  created_at: string;
  updated_at?: string;
}

export interface ActiveBot {
  id: number;
  uuid: string;
  name: string;
  version: string;
  storage_key: string;
}

export interface SendMessagePayload {
  conversationUuid: string;
  content: string;
}

export interface CreateConversationPayload {
  type?: string;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const chatApi = {
  async getActiveBot(): Promise<ActiveBot | null> {
    const response = await apiClient.get<{ success: boolean; data: { bot: ActiveBot | null } }>(
      '/chat/active-bot'
    );
    return response.data?.data?.bot ?? null;
  },

  async createConversation(payload: CreateConversationPayload = {}) {
    const response = await apiClient.post<{ success: boolean; data: { conversation: Conversation } }>(
      '/chat/conversations',
      payload
    );
    return response.data.data.conversation;
  },

  async getMessages(conversationUuid: string, limit = 50, offset = 0): Promise<Message[]> {
    const response = await apiClient.get<{ success: boolean; data: { messages: Message[] } }>(
      `/chat/conversations/${conversationUuid}/messages`,
      { params: { limit, offset } }
    );
    return Array.isArray(response.data?.data?.messages) ? response.data.data.messages : [];
  },

  async sendMessage(payload: SendMessagePayload) {
    const response = await apiClient.post<{
      success: boolean;
      data: { messageId: string; conversationId: string; botMessage: BotMessagePayload | null };
    }>(
      '/chat/messages',
      { conversationId: payload.conversationUuid, content: payload.content }
    );
    return response.data;
  },

  async uploadAttachment(conversationId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId.toString());
    const response = await apiClient.post<{ success: boolean; data: { key: string; url: string } }>(
      '/chat/attachments',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};
