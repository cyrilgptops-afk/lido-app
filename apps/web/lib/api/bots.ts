import { apiClient } from './client';

export type BotType = 'chat' | 'application';

export interface ChatBotConfig {
  welcomeMessage?: string;
  placeholder?:    string;
  primaryColor?:   string;
  allowFileUpload?: boolean;
}

export interface ApplicationBotConfig {
  appUrl?:      string;
  /** 'dynamic' = JS-powered app bot rendered at /apps/[botId] */
  embedType?:   'iframe' | 'redirect' | 'panel' | 'dynamic';
  launchLabel?: string;
  permissions?: string[];
}

export interface BotScript {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  description?: string;
  type: BotType;
  display_name?: string | null;
  avatar_url?:   string | null;  // MinIO object key — resolve via /admin/storage/url
  config?:       ChatBotConfig | ApplicationBotConfig | null;
  version: string;
  is_active: boolean;
  deployed_version_id?: number;
  created_at: string;
  updated_at: string;
}

/** Active bot returned by GET /bot-scripts/active */
export interface ActiveBot {
  id: number;
  uuid: string;
  name: string;
  display_name?: string | null;
  avatar_url?:   string | null;
  type: BotType;
  config?:       ChatBotConfig | ApplicationBotConfig | null;
  version: string;
  storage_key?: string;
}

export interface BotVersion {
  id: number;
  uuid: string;
  bot_id: number;
  version: string;
  storage_key: string;
  file_size: number;
  checksum: string;
  changelog?: string;
  is_deployed: boolean;
  created_by: number;
  created_at: string;
}

export interface BotDeployment {
  id: number;
  uuid: string;
  bot_id: number;
  version_id: number;
  version: string;
  deployed_by: number;
  deployed_by_email: string;
  deployed_from_version?: number;
  deployment_status: 'success' | 'failed' | 'rolled_back';
  error_message?: string;
  deployed_at: string;
}

export interface CreateBotPayload {
  name: string;
  description?: string;
  type?: BotType;
  display_name?: string;
  avatar_url?: string;
  config?: ChatBotConfig | ApplicationBotConfig;
}

export interface UpdateBotPayload {
  name?: string;
  description?: string;
  type?: BotType;
  display_name?: string | null;
  avatar_url?: string | null;
  config?: ChatBotConfig | ApplicationBotConfig | null;
  is_active?: boolean;
}

export interface UploadVersionPayload {
  botId: number;
  version: string;
  changelog?: string;
  scriptFile: File;
}

export const botsApi = {
  // Create new bot
  async createBot(payload: CreateBotPayload) {
    const response = await apiClient.post<{ success: boolean; data: BotScript }>(
      '/bot-scripts',
      payload
    );
    return response.data;
  },

  // Get all bots (optional type filter)
  async getBots(type?: BotType) {
    const params = type ? { type } : {};
    const response = await apiClient.get<{ success: boolean; data: BotScript[] }>('/bot-scripts', { params });
    return response.data;
  },

  // Get active bots by type
  async getActiveBots(type: BotType = 'chat') {
    const response = await apiClient.get<{ success: boolean; data: ActiveBot[] }>('/bot-scripts/active', { params: { type } });
    return response.data;
  },

  // Update bot metadata
  async updateBot(botId: number, payload: UpdateBotPayload) {
    const response = await apiClient.patch<{ success: boolean; data: BotScript }>(
      `/bot-scripts/${botId}`, payload,
    );
    return response.data;
  },

  // Upload bot avatar → returns MinIO key
  async uploadAvatar(botId: number, file: File) {
    const form = new FormData();
    form.append('avatar', file);
    const response = await apiClient.post<{ success: boolean; data: { avatar_url: string } }>(
      `/bot-scripts/${botId}/avatar`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  // Resolve a MinIO key → presigned URL (uses admin storage endpoint)
  async getAvatarUrl(key: string): Promise<string | null> {
    try {
      const response = await apiClient.post<{ success: boolean; data: { url: string } }>(
        '/admin/storage/url', { bucket: 'lido-assets', key },
      );
      return response.data?.data?.url ?? null;
    } catch {
      return null;
    }
  },

  // Get bot by ID
  async getBot(id: number) {
    const response = await apiClient.get<{ success: boolean; data: BotScript }>(`/bot-scripts/${id}`);
    return response.data;
  },

  // Upload bot version
  async uploadVersion(payload: UploadVersionPayload) {
    const formData = new FormData();
    formData.append('script', payload.scriptFile);
    formData.append('version', payload.version);
    if (payload.changelog) {
      formData.append('changelog', payload.changelog);
    }

    const response = await apiClient.post<{
      success: boolean;
      data: { key: string; size: number; checksum: string };
    }>(`/bot-scripts/${payload.botId}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // List bot versions
  async listVersions(botId: number) {
    const response = await apiClient.get<{ success: boolean; data: BotVersion[] }>(
      `/bot-scripts/${botId}/versions`
    );
    return response.data;
  },

  // Download bot version
  async downloadVersion(botId: number, versionId: number) {
    const response = await apiClient.get(
      `/bot-scripts/${botId}/versions/${versionId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  // Deploy version
  async deployVersion(botId: number, versionId: number) {
    const response = await apiClient.post<{ success: boolean; data: { message: string } }>(
      `/bot-scripts/${botId}/versions/${versionId}/deploy`
    );
    return response.data;
  },

  // Get deployment history
  async getDeploymentHistory(botId: number, limit = 10) {
    const response = await apiClient.get<{ success: boolean; data: BotDeployment[] }>(
      `/bot-scripts/${botId}/deployments`,
      { params: { limit } }
    );
    return response.data;
  },

  // Delete version
  async deleteVersion(botId: number, versionId: number) {
    const response = await apiClient.delete<{ success: boolean; data: { message: string } }>(
      `/bot-scripts/${botId}/versions/${versionId}`
    );
    return response.data;
  },

  // Assign bot to conversation
  async assignBot(conversationId: number, botId: number) {
    const response = await apiClient.post<{ success: boolean; data: { message: string } }>(
      '/bot-scripts/assign',
      { conversationId, botId }
    );
    return response.data;
  },

  // Delete bot
  async deleteBot(botId: number) {
    const response = await apiClient.delete<{ success: boolean; data: { message: string } }>(
      `/bot-scripts/${botId}`
    );
    return response.data;
  },
};
