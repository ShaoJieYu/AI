/**
 * Multi-Agent API 模块（阶段 4：多智能体协作）
 *
 * 提供两个能力：
 * 1. connectSSE：连接后端 /multi-agent/run SSE 端点，实时接收 Agent 执行事件
 * 2. getState：查询工作流 State（断线恢复用，从 Redis 读取）
 *
 * SSE 事件流由后端 ResponseBodyEmitter 透传 AI 服务的 LangGraph 工作流输出。
 */
import axiosInstance from './client';
import type { ApiResponse } from '@/types/api';

// ===== ReAct 思考过程类型 =====
// 后端每个 step 是单类型事件（按 type 区分），不是三元组
export interface ReActTraceStep {
  step: number;
  type: 'thought' | 'action' | 'observation' | 'final_answer' | 'error';
  content?: string;        // thought / observation / final_answer / error 的内容
  name?: string;           // action 类型专有：工具名
  input?: Record<string, unknown>;  // action 类型专有：工具参数
}

// ===== Agent 执行记录（agent_trace 数组元素） =====
export interface AgentTraceEntry {
  agent: string;
  node: string;
  input_summary: string;
  output_summary: string;
  react_trace: ReActTraceStep[];
  duration_ms: number;
  timestamp: string;
  template_used: boolean;
  retry_attempt: number;
}

// ===== 各 Agent 产出类型 =====
export interface TeachingDesign {
  topic: string;
  subject: string;
  difficulty: string;
  duration: number;
  objectives: string[];
  key_points: string[];
  structure: Array<{ section: string; method: string; duration_min: number }>;
}

export interface ContentDraft {
  topic: string;
  subject: string;
  coreDefinition: string;
  teachingAnalysis: string;
  mistakeWarnings: string;
  scoreBoosting: string;
  exampleDerivation: string;
}

export interface QaDimension {
  score: number;
  issues: string[];
  feedback?: string;
}

export interface QaResult {
  overall_pass: boolean;
  forced_pass: boolean;
  issue_type: 'none' | 'content' | 'structure';
  dimensions: {
    accuracy: QaDimension;
    format: QaDimension;
    formula: QaDimension;
  };
  retry_suggestion?: string;
}

export type ExportResult = Record<string, unknown>;

// ===== SSE 事件类型 =====
export interface AgentStartEvent {
  type: 'agent_start';
  agent: string;
  input_summary: string;
  timestamp: string;
}

export interface AgentCompleteEvent {
  type: 'agent_complete';
  agent: string;
  output_summary: string;
  react_trace: ReActTraceStep[];
  retry_attempt: number;
  timestamp: string;
  teaching_design?: TeachingDesign;
  content_draft?: ContentDraft;
  qa_result?: QaResult;
  retry_count: number;
}

export interface QaRejectEvent {
  type: 'qa_reject';
  agent: 'qa';
  issue_type: 'content' | 'structure';
  issues: string[];
  retry_count: number;
  route_to: string;
  timestamp: string;
}

export interface LessonSavedEvent {
  type: 'lesson_saved';
  success: boolean;
  message: string;
  lesson_id: number | null;
  timestamp: string;
}

export interface WorkflowCompleteEvent {
  type: 'workflow_complete';
  final_state: {
    status: string;
    retry_count: number;
    current_node: string;
    lesson_saved?: boolean;
    lesson_id?: number | null;
  };
  timestamp: string;
}

export interface AgentErrorEvent {
  type: 'agent_error';
  error: string;
  sessionId?: string;
}

export type MultiAgentEvent =
  | AgentStartEvent
  | AgentCompleteEvent
  | QaRejectEvent
  | LessonSavedEvent
  | WorkflowCompleteEvent
  | AgentErrorEvent;

// ===== 工作流 State（从 /multi-agent/state 读取） =====
export interface MultiAgentState {
  session_id: string;
  user_request: string;
  teaching_design: TeachingDesign | null;
  content_draft: ContentDraft | null;
  qa_result: QaResult | null;
  retry_count: number;
  max_retry: number;
  current_node: string;
  status: string;
  agent_trace: AgentTraceEntry[];
}

// ===== Agent 元信息（用于拓扑图和卡片） =====
export const AGENT_META: Record<string, { name: string; desc: string; color: string }> = {
  teaching_design: {
    name: '教学设计 Agent',
    desc: '拆解教学目标，输出五段式骨架',
    color: '#1677ff',
  },
  content_generation: {
    name: '内容生成 Agent',
    desc: '基于 RAG 检索生成五段式内容',
    color: '#52c41a',
  },
  qa: {
    name: '质检 Agent',
    desc: '三维评分（准确性/格式/公式）',
    color: '#faad14',
  },
};

export const AGENT_ORDER = ['teaching_design', 'content_generation', 'qa'] as const;

// ===== API =====
export const multiAgentApi = {
  /**
   * 连接 SSE 流式运行 Multi-Agent 工作流
   *
   * 用浏览器原生 EventSource 连接后端 /multi-agent/run 端点。
   * 后端 ResponseBodyEmitter 透传 AI 服务的 LangGraph 工作流事件。
   *
   * 注意：EventSource 不支持自定义 Header，token 通过 query 参数传递。
   *
   * @returns EventSource 实例（调用方负责注册 onmessage/onerror/onclose）
   */
  connectSSE: (params: {
    userRequest: string;
    sessionId: string;
    useFullWorkflow?: boolean;
    token?: string;
  }): EventSource => {
    const base = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL || '/api';
    const queryParts = [
      `userRequest=${encodeURIComponent(params.userRequest)}`,
      `sessionId=${encodeURIComponent(params.sessionId)}`,
      `useFullWorkflow=${String(params.useFullWorkflow ?? true)}`,
    ];
    if (params.token) {
      queryParts.push(`token=${encodeURIComponent(params.token)}`);
    }
    return new EventSource(`${base}/multi-agent/run?${queryParts.join('&')}`);
  },

  /**
   * 查询工作流 State（断线恢复用）
   * 从 Redis 读取之前保存的工作流状态。
   */
  getState: async (sessionId: string): Promise<ApiResponse<{ success: boolean; state: MultiAgentState; session_id: string; error?: string }>> => {
    return axiosInstance.get(`/multi-agent/state?sessionId=${encodeURIComponent(sessionId)}`);
  },
};
