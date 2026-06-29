/**
 * 对话会话 API（阶段 2b-2：Agent 短期对话记忆）
 *
 * 这些接口走后端 Spring Boot（8080），由后端代理到 AI 服务。
 */
import axiosInstance from './client';
import type { ApiResponse } from '@/types/api';
import type { AgentTraceStep } from './agent';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  trace?: AgentTraceStep[];
}

export interface SendMessageResponse {
  sessionId: string;
  finalAnswer: string;
  trace: AgentTraceStep[];
}

export interface HistoryResponse {
  sessionId: string;
  messages: ConversationMessage[];
  total: number;
}

export const conversationApi = {
  /** 创建新对话会话 */
  createSession: async (): Promise<ApiResponse<{ sessionId: string }>> => {
    return axiosInstance.post('/conversation/create');
  },

  /** 发送消息到 Agent */
  sendMessage: async (sessionId: string, message: string): Promise<ApiResponse<SendMessageResponse>> => {
    return axiosInstance.post('/conversation/send', { sessionId, message });
  },

  /** 获取会话历史 */
  getHistory: async (sessionId: string): Promise<ApiResponse<HistoryResponse>> => {
    return axiosInstance.get(`/conversation/${sessionId}/history`);
  },

  /** 删除会话 */
  deleteSession: async (sessionId: string): Promise<ApiResponse<void>> => {
    return axiosInstance.delete(`/conversation/${sessionId}`);
  },
};