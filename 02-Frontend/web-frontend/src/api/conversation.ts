/**
 * 对话会话 API（阶段 3：支持 Planning 逐步执行模式）
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
  plan?: PlanStep[];
}

// ===== Planning 相关类型 =====
export interface PlanStep {
  step: number;
  name: string;
  description: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface PlanResponse {
  type: 'plan';
  plan: PlanStep[];
  user_message: string;
  sessionId: string;
}

export interface StepResultResponse {
  type: 'step_result';
  step: number;
  step_name: string;
  tool: string;
  tool_args: Record<string, unknown>;
  result: string;
  trace: AgentTraceStep[];
  success: boolean;
  sessionId: string;
}

export interface SummaryResponse {
  type: 'summary';
  summary: string;
  sessionId: string;
}

export type AgentResponse = PlanResponse | StepResultResponse | SummaryResponse | SendMessageResponse;

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

  /** 发送消息（旧模式：一次性执行） */
  sendMessage: async (sessionId: string, message: string): Promise<ApiResponse<SendMessageResponse>> => {
    return axiosInstance.post('/conversation/send', { sessionId, message });
  },

  /** 阶段 3：生成执行计划 */
  generatePlan: async (sessionId: string, message: string): Promise<ApiResponse<PlanResponse>> => {
    return axiosInstance.post('/conversation/send', { sessionId, message, mode: 'plan' });
  },

  /** 阶段 3：执行单个步骤 */
  executeStep: async (
    sessionId: string,
    planStep: PlanStep,
  ): Promise<ApiResponse<StepResultResponse>> => {
    return axiosInstance.post('/conversation/send', { sessionId, mode: 'execute_step', planStep });
  },

  /** 阶段 3：重新执行当前步骤（用户反馈修改意见后） */
  retryStep: async (
    sessionId: string,
    message: string,
    planStep: PlanStep,
  ): Promise<ApiResponse<StepResultResponse>> => {
    return axiosInstance.post('/conversation/send', {
      sessionId, message, mode: 'execute_step', planStep,
    });
  },

  /** 阶段 3：生成总结 */
  generateSummary: async (
    sessionId: string,
    plan: PlanStep[],
  ): Promise<ApiResponse<SummaryResponse>> => {
    return axiosInstance.post('/conversation/send', { sessionId, mode: 'summary', plan });
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
