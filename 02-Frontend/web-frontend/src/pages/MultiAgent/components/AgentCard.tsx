/**
 * Agent 执行卡片（极简降噪版）
 *
 * 设计原则：
 * - 去掉左侧色条、彩色图标块、彩色状态徽章
 * - 统一白底 + 细边框
 * - 颜色只用于状态：灰=等待、蓝=进行中、绿=完成、红=错误
 */
import { Tag, Tooltip } from 'antd';
import {
  ClockCircleOutlined, CheckCircleFilled, LoadingOutlined,
  ExclamationCircleFilled, WarningFilled,
} from '@ant-design/icons';
import {
  AGENT_META, type AgentTraceEntry, type QaResult,
} from '@/api/multi-agent';
import ReactTraceViewer from './ReactTraceViewer';
import QaRadarChart from './QaRadarChart';

export type CardStatus = 'pending' | 'running' | 'done';

interface AgentCardProps {
  agentKey: string;
  status: CardStatus;
  trace?: AgentTraceEntry;
  qaResult?: QaResult | null;
}

const STATUS_META: Record<CardStatus, { color: string; label: string; icon: React.ReactNode }> = {
  pending: { color: '#9aa0a6', icon: <ClockCircleOutlined />, label: '等待中' },
  running: { color: '#1a73e8', icon: <LoadingOutlined spin />, label: '执行中' },
  done: { color: '#188038', icon: <CheckCircleFilled />, label: '已完成' },
};

const C = {
  card: '#ffffff',
  border: '#e8eaed',
  text1: '#202124',
  text2: '#5f6368',
  text3: '#9aa0a6',
};

export default function AgentCard({ agentKey, status, trace, qaResult }: AgentCardProps) {
  const meta = AGENT_META[agentKey] || { name: agentKey, desc: '', color: '#999' };
  const statusMeta = STATUS_META[status];

  return (
    <div
      style={{
        background: C.card,
        borderRadius: 8,
        marginBottom: 6,
        border: `1px solid ${C.border}`,
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.text1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {meta.name}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.text3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {meta.desc}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            color: statusMeta.color,
            background: `${statusMeta.color}10`,
            flexShrink: 0,
          }}
        >
          {statusMeta.icon}
          <span style={{ marginLeft: 2 }}>{statusMeta.label}</span>
        </div>
      </div>

      {/* 模板兜底 / 重试次数 */}
      {(trace?.template_used || (trace && trace.retry_attempt > 0)) && (
        <div style={{ padding: '0 12px 6px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {trace?.template_used && (
            <Tooltip title="输出未通过 Schema 校验，使用了模板兜底">
              <Tag
                style={{
                  borderRadius: 4,
                  padding: '0 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  margin: 0,
                  color: '#e37400',
                  background: '#fef7e0',
                  border: '1px solid #fde0a0',
                }}
              >
                <WarningFilled style={{ marginRight: 3 }} />
                模板兜底
              </Tag>
            </Tooltip>
          )}
          {trace && trace.retry_attempt > 0 && (
            <Tag
              style={{
                borderRadius: 4,
                padding: '0 8px',
                fontSize: 10,
                fontWeight: 600,
                margin: 0,
                color: '#d93025',
                background: '#fce8e6',
                border: '1px solid #f5c6cb',
              }}
            >
              <ExclamationCircleFilled style={{ marginRight: 3 }} />
              第 {trace.retry_attempt} 次重做
            </Tag>
          )}
        </div>
      )}

      {/* 内容区 */}
      <div style={{ padding: '0 12px 10px' }}>
        {trace ? (
          <div>
            <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 3 }}>
              产出摘要
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.text2,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                maxHeight: 60,
                overflow: 'auto',
              }}
            >
              {trace.output_summary || <span style={{ color: C.text3 }}>（无摘要）</span>}
            </div>
          </div>
        ) : status === 'pending' ? (
          <div style={{ padding: '12px 0', textAlign: 'center', color: C.text3, fontSize: 11 }}>
            未执行
          </div>
        ) : null}
      </div>

      {/* 质检 Agent 内嵌雷达图 */}
      {agentKey === 'qa' && qaResult && status === 'done' && (
        <div style={{ margin: '0 12px 10px', padding: 8, background: '#f8f9fa', borderRadius: 6 }}>
          <QaRadarChart qaResult={qaResult} />
        </div>
      )}

      {/* ReAct 思考过程 */}
      {trace && trace.react_trace && trace.react_trace.length > 0 && (
        <div style={{ borderTop: `1px dashed ${C.border}`, padding: '6px 12px 10px' }}>
          <ReactTraceViewer trace={trace.react_trace} />
        </div>
      )}
    </div>
  );
}
