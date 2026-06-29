/**
 * Multi-Agent 备课页面全局状态
 *
 * 用途：让 MultiAgentPage 跳转到其他页面再返回时，已完成的工作流结果不丢失
 *
 * 设计要点：
 * - 业务状态（teachingDesign/contentDraft/qaResult/agentTraces 等）走内存 store，
 *   组件卸载也不清空，返回时读回
 * - 输入框草稿（userRequest/useFullWorkflow）用 persist 中间件持久化到 localStorage，
 *   连浏览器刷新都能保留
 * - running 标志不持久化：工作流运行中跳走 SSE 会断，回来必须重跑，
 *   running=true 反而会让页面卡在"运行中"假状态
 * - 不做 SSE 断线重连：需要后端保存 session 状态支持 reconnect，改动过大，
 *   且实际场景中很少有人在工作流运行中跳走
 *
 * 原有 MultiAgentPage 的 useState 本地状态全部迁移到这里
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AgentTraceEntry,
  TeachingDesign,
  ContentDraft,
  QaResult,
  ReActTraceStep,
} from '@/api/multi-agent';
import type { NodeStatus } from '@/pages/MultiAgent/components/AgentTopology';

// ===== 状态类型（与原 PageState 一致） =====
export interface MultiAgentState {
  // 业务产出
  teachingDesign: TeachingDesign | null;
  contentDraft: ContentDraft | null;
  qaResult: QaResult | null;
  retryCount: number;
  rejectTarget: string | null;
  agentTraces: Record<string, AgentTraceEntry>;
  agentStatuses: Record<string, NodeStatus>;
  lessonSaved: boolean;
  lessonId: number | null;
  lessonSaveMessage: string;

  // 运行时状态（不持久化）
  running: boolean;
  error: string;
  activeAgent: string;

  // 输入草稿（持久化到 localStorage）
  userRequest: string;
  useFullWorkflow: boolean;

  // ===== Actions =====
  setUserRequest: (v: string) => void;
  setUseFullWorkflow: (v: boolean) => void;
  setRunning: (v: boolean) => void;
  setError: (v: string) => void;
  setActiveAgent: (v: string) => void;

  /** 处理 agent_start 事件 */
  onAgentStart: (agent: string) => void;
  /** 处理 agent_complete 事件 */
  onAgentComplete: (payload: {
    agent: string;
    react_trace?: ReActTraceStep[];
    output_summary?: string;
    timestamp?: string;
    retry_attempt?: number;
    retry_count?: number;
    teaching_design?: TeachingDesign;
    content_draft?: ContentDraft;
    qa_result?: QaResult;
  }) => void;
  /** 处理 qa_reject 事件 */
  onQaReject: (routeTo: string, retryCount: number) => void;
  /** 处理 lesson_saved 事件 */
  onLessonSaved: (success: boolean, message: string, lessonId: number | null) => void;
  /** 处理 workflow_complete 事件 */
  onWorkflowComplete: () => void;
  /** 处理 agent_error 事件 */
  onAgentError: (errMsg: string) => void;

  /** 重置为初始状态（保留输入草稿） */
  resetWorkflow: () => void;
}

const INITIAL_AGENT_STATUSES: Record<string, NodeStatus> = {
  teaching_design: 'pending',
  content_generation: 'pending',
  qa: 'pending',
};

const DEFAULT_USER_REQUEST =
  '初二物理牛顿第二定律备课，45分钟，重点讲清 F=ma 的物理意义和单位换算';

export const useMultiAgentStore = create<MultiAgentState>()(
  persist(
    (set) => ({
      // 业务产出（初始为空，跑完工作流才有）
      teachingDesign: null,
      contentDraft: null,
      qaResult: null,
      retryCount: 0,
      rejectTarget: null,
      agentTraces: {},
      agentStatuses: { ...INITIAL_AGENT_STATUSES },
      lessonSaved: false,
      lessonId: null,
      lessonSaveMessage: '',

      // 运行时状态（不持久化，每次进入页面默认 false/空）
      running: false,
      error: '',
      activeAgent: 'teaching_design',

      // 输入草稿（持久化）
      userRequest: DEFAULT_USER_REQUEST,
      useFullWorkflow: true,

      // ===== 简单 setter =====
      setUserRequest: (v) => set({ userRequest: v }),
      setUseFullWorkflow: (v) => set({ useFullWorkflow: v }),
      setRunning: (v) => set({ running: v }),
      setError: (v) => set({ error: v }),
      setActiveAgent: (v) => set({ activeAgent: v }),

      // ===== SSE 事件处理 =====
      onAgentStart: (agent) =>
        set((s) => ({
          running: true,
          error: '',
          activeAgent: agent,
          agentStatuses: { ...s.agentStatuses, [agent]: 'running' },
        })),

      onAgentComplete: (p) =>
        set((s) => {
          const traceEntry: AgentTraceEntry = {
            agent: p.agent,
            node: p.agent,
            input_summary: '',
            output_summary: p.output_summary || '',
            react_trace: p.react_trace || [],
            duration_ms: 0,
            timestamp: p.timestamp || '',
            template_used: false,
            retry_attempt: p.retry_attempt || 0,
          };
          const update: Partial<MultiAgentState> = {
            agentStatuses: { ...s.agentStatuses, [p.agent]: 'done' },
            agentTraces: { ...s.agentTraces, [p.agent]: traceEntry },
            retryCount: p.retry_count ?? s.retryCount,
          };
          if (p.teaching_design) update.teachingDesign = p.teaching_design;
          if (p.content_draft) update.contentDraft = p.content_draft;
          if (p.qa_result) update.qaResult = p.qa_result;
          return { ...s, ...update };
        }),

      onQaReject: (routeTo, retryCount) =>
        set({ rejectTarget: routeTo, retryCount }),

      onLessonSaved: (success, message, lessonId) =>
        set({
          lessonSaved: success,
          lessonId,
          lessonSaveMessage: message,
        }),

      onWorkflowComplete: () =>
        set({ running: false, rejectTarget: null }),

      onAgentError: (errMsg) => set({ running: false, error: errMsg }),

      /** 重置工作流结果（保留输入草稿和 activeAgent） */
      resetWorkflow: () =>
        set({
          teachingDesign: null,
          contentDraft: null,
          qaResult: null,
          retryCount: 0,
          rejectTarget: null,
          agentTraces: {},
          agentStatuses: { ...INITIAL_AGENT_STATUSES },
          lessonSaved: false,
          lessonId: null,
          lessonSaveMessage: '',
          running: false,
          error: '',
        }),
    }),
    {
      name: 'multi-agent-storage',
      // 只持久化输入草稿：业务结果和运行时状态都走内存
      partialize: (state) => ({
        userRequest: state.userRequest,
        useFullWorkflow: state.useFullWorkflow,
      }),
    }
  )
);
