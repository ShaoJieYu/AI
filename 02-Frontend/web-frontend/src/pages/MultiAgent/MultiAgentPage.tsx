/**
 * Multi-Agent 多智能体协作页面（极简降噪版）
 *
 * 设计原则：
 * - 颜色只用于状态（灰=等待、蓝=进行中、绿=完成、红=错误）
 * - 不用渐变、不用彩色图标块、不用彩色标签
 * - 靠留白、字号、字重建立信息层次
 *
 * 工作流：3 个 Agent（教学设计 → 内容生成 → 质检）协作完成备课
 * 工作流完成后自动保存到备课历史，用户在备课历史详情页点导出按钮导出 PDF
 */
import { useRef, useCallback, useEffect } from 'react';
import {
  Card, Input, Button, Typography, Alert, Empty, Spin, Tag,
  Divider, Tabs, Select, message,
} from 'antd';
import {
  PlayCircleOutlined, StopOutlined,
  ApiFilled, BulbFilled,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { useMultiAgentStore } from '@/stores/multiAgentStore';
import {
  multiAgentApi, AGENT_ORDER, AGENT_META,
  type TeachingDesign, type ContentDraft,
  type QaResult, type ReActTraceStep,
} from '@/api/multi-agent';
import AgentTopology from './components/AgentTopology';
import AgentCard from './components/AgentCard';
import ReactTraceViewer from './components/ReactTraceViewer';
import QaRadarChart from './components/QaRadarChart';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ErrorBoundary from '@/components/ErrorBoundary';

const { Text } = Typography;
const { TextArea } = Input;

// ===== 极简主题 =====
const C = {
  bg: '#fafbfc',
  card: '#ffffff',
  border: '#e8eaed',
  text1: '#202124',
  text2: '#5f6368',
  text3: '#9aa0a6',
  accent: '#1a73e8', // 唯一强调色
  success: '#188038',
  error: '#d93025',
  warn: '#e37400',
};

const FIVE_SECTIONS: Array<{ key: keyof ContentDraft; label: string }> = [
  { key: 'coreDefinition', label: '教材核心原文' },
  { key: 'teachingAnalysis', label: '教学深度剖析' },
  { key: 'mistakeWarnings', label: '易错点拨' },
  { key: 'scoreBoosting', label: '提分技巧' },
  { key: 'exampleDerivation', label: '经典例题推导' },
];

// ===== 主页面 =====
export default function MultiAgentPage() {
  // 全部状态来自全局 store，组件卸载也不丢失
  const {
    userRequest, useFullWorkflow, running, error, activeAgent,
    teachingDesign, contentDraft, qaResult, retryCount, rejectTarget,
    agentTraces, agentStatuses, lessonSaved, lessonId, lessonSaveMessage,
    setUserRequest, setUseFullWorkflow,
    setError, setActiveAgent,
    resetWorkflow, onAgentStart, onAgentComplete, onQaReject,
    onLessonSaved, onWorkflowComplete, onAgentError,
  } = useMultiAgentStore();

  const eventSourceRef = useRef<EventSource | null>(null);

  const genSessionId = useCallback(() => {
    return `ma_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  // ===== 处理 SSE 事件（提前定义，handleRun 和 onmessage 都要用） =====
  const handleEvent = useCallback((event: { type: string; [k: string]: unknown }) => {
    switch (event.type) {
      case 'agent_start': {
        onAgentStart(event.agent as string);
        break;
      }
      case 'agent_complete': {
        onAgentComplete({
          agent: event.agent as string,
          react_trace: (event.react_trace as ReActTraceStep[]) || [],
          output_summary: (event.output_summary as string) || '',
          timestamp: (event.timestamp as string) || '',
          retry_attempt: (event.retry_attempt as number) || 0,
          retry_count: event.retry_count as number | undefined,
          teaching_design: event.teaching_design as TeachingDesign | undefined,
          content_draft: event.content_draft as ContentDraft | undefined,
          qa_result: event.qa_result as QaResult | undefined,
        });
        break;
      }
      case 'qa_reject': {
        const routeTo = event.route_to as string;
        const retryCount = (event.retry_count as number) || 0;
        onQaReject(routeTo, retryCount);
        break;
      }
      case 'lesson_saved': {
        const success = event.success as boolean;
        const msg = (event.message as string) || '';
        const lid = (event.lesson_id as number | null) ?? null;
        if (success) {
          message.success('已自动保存到备课历史，可在"备课历史"页面查看并导出 PDF');
        } else {
          message.warning('保存到备课历史失败：' + msg);
        }
        onLessonSaved(success, msg, lid);
        break;
      }
      case 'workflow_complete': {
        onWorkflowComplete();
        eventSourceRef.current?.close();
        break;
      }
      case 'agent_error': {
        const errMsg = (event.error as string) || '未知错误';
        onAgentError(errMsg);
        eventSourceRef.current?.close();
        break;
      }
      default:
        break;
    }
  }, [
    onAgentStart, onAgentComplete, onQaReject,
    onLessonSaved, onWorkflowComplete, onAgentError,
  ]);

  // ===== 启动 SSE =====
  const handleRun = useCallback(() => {
    if (!userRequest.trim()) {
      message.warning('请输入备课需求');
      return;
    }
    if (running) return;

    // 重置工作流结果（保留输入草稿）
    resetWorkflow();
    setActiveAgent('teaching_design');

    const sid = genSessionId();
    const token = useAuthStore.getState().accessToken;

    const es = multiAgentApi.connectSSE({
      userRequest: userRequest.trim(),
      sessionId: sid,
      useFullWorkflow,
      token: token || undefined,
    });
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        handleEvent(event);
      } catch {
        // 忽略解析失败的 event
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        onWorkflowComplete();
      } else {
        setError('SSE 连接异常，请检查后端服务');
        onWorkflowComplete();
      }
    };
  }, [
    userRequest, useFullWorkflow, running, genSessionId,
    resetWorkflow, setActiveAgent, setError, handleEvent, onWorkflowComplete,
  ]);

  const handleStop = useCallback(() => {
    eventSourceRef.current?.close();
    onWorkflowComplete();
  }, [onWorkflowComplete]);

  // 组件卸载时关闭 SSE（但不清空 store，下次回来还在）
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // ===== 中栏：产出内容 =====
  const renderContent = () => {
    if (teachingDesign || contentDraft) {
      return (
        <Tabs
          defaultActiveKey="design"
          items={[
            teachingDesign && {
              key: 'design',
              label: '教学设计',
              children: <TeachingDesignView design={teachingDesign} />,
            },
            contentDraft && {
              key: 'content',
              label: '五段式内容',
              children: <ContentDraftView draft={contentDraft} />,
            },
            lessonSaved || lessonSaveMessage ? {
              key: 'saved',
              label: '保存状态',
              children: <SaveStatusView saved={lessonSaved} lessonId={lessonId} message={lessonSaveMessage} />,
            } : null,
          ].filter(Boolean) as { key: string; label: string; children: React.ReactNode }[]}
        />
      );
    }
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: 280, border: `1px dashed ${C.border}`, borderRadius: 12, marginTop: 32 }}
      >
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}></div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, marginBottom: 4 }}>
          {running ? 'Agent 正在生成…' : '运行工作流后查看产出'}
        </div>
        <div style={{ fontSize: 12, color: C.text3 }}>
          教学设计 / 五段式内容 / 保存状态将在此展示
        </div>
      </div>
    );
  };

  // ===== 右栏 =====
  const renderRightPanel = () => {
    const activeTrace = agentTraces[activeAgent];
    return (
      <div>
        <div className="mb-3">
          <Text style={{ color: C.text2, fontSize: 12, fontWeight: 600 }}>
            选择 Agent 查看思考过程
          </Text>
          <Select
            value={activeAgent}
            onChange={setActiveAgent}
            className="w-full mt-2"
            size="small"
            options={AGENT_ORDER.map((k) => ({
              value: k,
              label: AGENT_META[k].name,
            }))}
          />
        </div>

        {qaResult && (
          <Card
            size="small"
            title={
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <ApiFilled style={{ marginRight: 6, color: C.text3 }} />
                质检评分
              </span>
            }
            className="mb-3"
            style={{ borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: 'none' }}
          >
            <QaRadarChart qaResult={qaResult} />
          </Card>
        )}

        <Card
          size="small"
          title={
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              <BulbFilled style={{ marginRight: 6, color: C.text3 }} />
              {AGENT_META[activeAgent]?.name} · ReAct 思考
            </span>
          }
          style={{ borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: 'none' }}
        >
          {activeTrace?.react_trace && activeTrace.react_trace.length > 0 ? (
            <ReactTraceViewer trace={activeTrace.react_trace} />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无思考记录" className="!my-4" />
          )}
        </Card>
      </div>
    );
  };

  return (
    <ErrorBoundary>
    <div style={{ background: C.bg, padding: 16, borderRadius: 12 }}>
      {/* 头部 */}
      <div
        className="mb-3 px-4 py-3"
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
        }}
      >
        {/* 第一行：标题 + 按钮 */}
        <div className="flex items-center gap-3 mb-3">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, lineHeight: 1.3 }}>
              Multi-Agent 多智能体协作
            </div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
              3 Agent 协作 · 质检不合格自动打回 · 完成后自动保存
            </div>
          </div>

          {running ? (
            <Button danger icon={<StopOutlined />} onClick={handleStop} size="small" style={{ borderRadius: 6, fontWeight: 600, flexShrink: 0 }}>
              停止
            </Button>
          ) : (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRun} size="small" style={{ borderRadius: 6, fontWeight: 600, flexShrink: 0 }}>
              启动工作流
            </Button>
          )}
        </div>

        {/* 第二行：输入 + 工作流选择 */}
        <div className="flex items-start gap-2">
          <TextArea
            value={userRequest}
            onChange={(e) => setUserRequest(e.target.value)}
            placeholder="输入备课需求，如：初二物理牛顿第二定律备课，45分钟"
            autoSize={{ minRows: 1, maxRows: 2 }}
            disabled={running}
            style={{ flex: 1, borderRadius: 6, fontSize: 13, minWidth: 0 }}
          />
          <Select
            value={useFullWorkflow ? 'full' : 'linear'}
            onChange={(v) => setUseFullWorkflow(v === 'full')}
            size="small"
            style={{ width: 150, flexShrink: 0 }}
            options={[
              { value: 'full', label: '完整（含打回）' },
              { value: 'linear', label: '线性（不打回）' },
            ]}
          />
        </div>

        {retryCount > 0 && (
          <div style={{ marginTop: 6 }}>
            <Tag style={{ borderRadius: 4, fontSize: 11, color: C.warn, background: '#fef7e0', border: `1px solid #fde0a0` }}>
              已重试 {retryCount} 次
            </Tag>
          </div>
        )}
        {error && (
          <Alert type="error" message={error} className="mt-2" closable onClose={() => setError('')} style={{ borderRadius: 6 }} />
        )}
      </div>

      {/* 拓扑图 */}
      <Card
        size="small"
        className="mb-3"
        style={{ borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: 'none' }}
        styles={{ body: { padding: '6px 8px' } }}
      >
        <AgentTopology
          statuses={agentStatuses}
          retryCount={retryCount}
          rejectTarget={rejectTarget}
        />
      </Card>

      {/* 三栏 */}
      <div className="grid grid-cols-12 gap-3">
        {/* 左栏 */}
        <div className="col-span-4 pr-1">
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8, paddingLeft: 4 }}>
            Agent 执行进度
          </div>
          {AGENT_ORDER.map((key) => (
            <AgentCard
              key={key}
              agentKey={key}
              status={agentStatuses[key]}
              trace={agentTraces[key]}
              qaResult={key === 'qa' ? qaResult : null}
            />
          ))}
        </div>

        {/* 中栏 */}
        <div className="col-span-5 px-1">
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8, paddingLeft: 4 }}>
            产出内容
          </div>
          {running && !teachingDesign && (
            <div className="flex justify-center items-center" style={{ height: 200, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
              <Spin tip="Agent 正在生成..." size="large">
                <div style={{ height: 100 }} />
              </Spin>
            </div>
          )}
          {renderContent()}
        </div>

        {/* 右栏 */}
        <div className="col-span-3 pl-1">
          {renderRightPanel()}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}

// ===== 教学设计视图 =====
function TeachingDesignView({ design }: { design: TeachingDesign }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Tag style={{ borderRadius: 4, fontSize: 12, color: C.text2, background: '#f1f3f4', border: `1px solid ${C.border}` }}>
          {design.topic}
        </Tag>
        <Tag style={{ borderRadius: 4, fontSize: 12, color: C.text2, background: '#f1f3f4', border: `1px solid ${C.border}` }}>
          {design.subject}
        </Tag>
        <Tag style={{ borderRadius: 4, fontSize: 12, color: C.text2, background: '#f1f3f4', border: `1px solid ${C.border}` }}>
          {design.difficulty}
        </Tag>
        <Tag style={{ borderRadius: 4, fontSize: 12, color: C.text2, background: '#f1f3f4', border: `1px solid ${C.border}` }}>
          {design.duration} 分钟
        </Tag>
      </div>

      <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
        <Text strong style={{ color: C.text1, fontSize: 13 }}>教学目标</Text>
        <ul style={{ marginTop: 6, paddingLeft: 20, marginBottom: 0 }}>
          {design.objectives?.map((obj, i) => (
            <li key={i} style={{ fontSize: 13, color: C.text2, marginBottom: 3 }}>{obj}</li>
          ))}
        </ul>
      </div>

      <div>
        <Text strong style={{ color: C.text1, fontSize: 13 }}>重点知识</Text>
        <div className="flex flex-wrap gap-2 mt-2">
          {design.key_points?.map((kp, i) => (
            <Tag key={i} style={{ borderRadius: 4, fontSize: 12, color: C.text2, background: '#f1f3f4', border: `1px solid ${C.border}` }}>
              {kp}
            </Tag>
          ))}
        </div>
      </div>

      <Divider className="!my-3" style={{ borderColor: C.border }} />

      <div>
        <Text strong style={{ color: C.text1, fontSize: 13 }}>五段式结构</Text>
        <div className="mt-3 space-y-2">
          {design.structure?.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3"
              style={{ padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, border: `1px solid ${C.border}` }}
            >
              <div
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: C.accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12, flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <Text strong style={{ color: C.text1, fontSize: 13 }}>{s.section}</Text>
                <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
                  {s.method} · {s.duration_min} 分钟
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== 五段式内容视图 =====
function ContentDraftView({ draft }: { draft: ContentDraft }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag style={{ borderRadius: 4, fontSize: 12, color: C.text2, background: '#f1f3f4', border: `1px solid ${C.border}` }}>
          {draft.topic}
        </Tag>
        <Tag style={{ borderRadius: 4, fontSize: 12, color: C.text2, background: '#f1f3f4', border: `1px solid ${C.border}` }}>
          {draft.subject}
        </Tag>
      </div>
      {FIVE_SECTIONS.map((sec) => (
        <div
          key={sec.key}
          style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.card }}
        >
          <div
            style={{
              padding: '8px 14px',
              background: '#f8f9fa',
              borderBottom: `1px solid ${C.border}`,
              fontWeight: 600,
              fontSize: 13,
              color: C.text1,
            }}
          >
            {sec.label}
          </div>
          <div style={{ padding: 14 }}>
            {draft[sec.key] ? (
              <MarkdownRenderer content={draft[sec.key] as string} />
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>（无内容）</Text>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== 保存状态视图 =====
function SaveStatusView({ saved, lessonId, message }: { saved: boolean; lessonId: number | null; message: string }) {
  if (saved) {
    return (
      <div style={{ padding: 16, background: '#e6f4ea', border: `1px solid #ceead6`, borderRadius: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.success, marginBottom: 4 }}>
          已自动保存到备课历史
        </div>
        <div style={{ fontSize: 12, color: C.text2 }}>
          备课记录 ID：{lessonId ?? '未知'} · 可前往「备课历史」页面导出 PDF
        </div>
      </div>
    );
  }
  return (
    <Alert type="warning" showIcon message="保存到备课历史失败" description={message || '未知原因'} style={{ borderRadius: 8 }} />
  );
}
