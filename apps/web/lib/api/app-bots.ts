import { apiClient } from './client';
import type { AppComponent } from '../../components/app-renderer/types';

export interface AppBotInfo {
  id           : number;
  uuid         : string;
  name         : string;
  display_name : string | null;
  avatar_url   : string | null;
  version      : string;
  storage_key  : string | null;
}

export interface AppBotExecuteResult {
  layout  : AppComponent[];
  message : string | null;
}

export const appBotsApi = {
  /** Fetch bot metadata (name, display_name, avatar_url, version). */
  getBot(botId: number): Promise<AppBotInfo> {
    return apiClient
      .get<{ success: true; data: AppBotInfo }>(`/app-bots/${botId}`)
      .then((r) => r.data.data);
  },

  /** Execute an intent and receive a fresh layout. */
  execute(
    botId  : number,
    intent  = 'init',
    params ?: Record<string, any>,
  ): Promise<AppBotExecuteResult> {
    return apiClient
      .post<{ success: true; data: AppBotExecuteResult }>(`/app-bots/${botId}/execute`, {
        intent,
        params,
      })
      .then((r) => r.data.data);
  },
};
