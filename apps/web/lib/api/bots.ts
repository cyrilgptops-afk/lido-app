import { apiClient } from './client';

export interface BotScript {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  description?: string;
  version: string;
  is_active: boolean;
  deployed_version_id?: number;
  created_at: string;
  updated_at: string;
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

  // Get all bots
  async getBots() {
    const response = await apiClient.get<{ success: boolean; data: BotScript[] }>('/bot-scripts');
    return response.data;
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
