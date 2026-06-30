import axiosInstance from './client';
import type { ApiResponse } from '@/types/api';

export interface LlmProviderInfo {
  label: string;
  description: string;
}

export interface LlmProviderResponse {
  current: string;
  providers: Record<string, LlmProviderInfo>;
}

export interface LlmSwitchResponse {
  success: boolean;
  current: string;
  message: string;
}

export interface LlmStatusResponse {
  current: string;
  label: string;
  description: string;
  reachable: boolean;
  detail: string;
}

export const llmApi = {
  getProvider: async (): Promise<ApiResponse<LlmProviderResponse>> => {
    return axiosInstance.get('/llm/provider');
  },

  switchProvider: async (provider: string): Promise<ApiResponse<LlmSwitchResponse>> => {
    return axiosInstance.post('/llm/provider', { provider });
  },

  getStatus: async (): Promise<ApiResponse<LlmStatusResponse>> => {
    return axiosInstance.get('/llm/status');
  },
};
