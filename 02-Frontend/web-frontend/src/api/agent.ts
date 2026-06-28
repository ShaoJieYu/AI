/**
 * Agent API 模块
 *
 * Agent 端点在 AI 服务（8001 端口），不走后端 Spring Boot 的 /api 代理，
 * 所以这里单独创建 axios 实例，直连 AI 服务。
 *
 * Agent 在调用 save_lesson_to_history 工具时需要把用户 JWT token
 * 透传给 AI 服务，再由 AI 服务转发给后端做鉴权。
 */
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const AI_SERVICE_URL = 'http://localhost:8001';

const agentClient = axios.create({
  baseURL: AI_SERVICE_URL,
  // Agent 链路含 3 次工具调用（search_textbook + generate_lesson + save_lesson_to_history），
  // 其中 generate_lesson 生成 3000+ 字带 LaTeX 公式的备课内容需 60-80 秒，
  // 加上 3-4 轮模型决策，总耗时可达 150 秒，timeout 放宽到 300 秒
  timeout: 300000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：注入 JWT token（Agent 调 save_lesson_to_history 时需要透传给后端鉴权）
agentClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AgentTraceStep {
  step: number;
  action: 'call_tool' | 'tool_result' | 'final_answer' | string;
  tool?: string;
  arguments?: Record<string, unknown>;
  result_preview?: string;
  answer_preview?: string;
  error?: string;
}

export interface AgentResponse {
  final_answer: string;
  trace: AgentTraceStep[];
}

export const agentApi = {
  /** 运行 Agent demo */
  runDemo: async (message: string): Promise<AgentResponse> => {
    const response = await agentClient.post('/api/agent/demo', { message });
    return response.data;
  },
};
