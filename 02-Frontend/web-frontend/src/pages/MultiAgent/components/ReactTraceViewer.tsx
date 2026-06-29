/**
 * ReAct 思考过程查看器（极简降噪版）
 *
 * 设计原则：
 * - 去掉彩色块头，改为简洁灰色标签
 * - 步骤编号用灰色圆形
 * - 内容用浅灰背景卡片
 */
import { useState } from 'react';
import { Collapse, Empty, Typography } from 'antd';
import type { ReActTraceStep } from '@/api/multi-agent';

const { Text } = Typography;

interface ReactTraceViewerProps {
  trace: ReActTraceStep[];
  defaultOpen?: boolean;
}

const C = {
  border: '#e8eaed',
  text1: '#202124',
  text2: '#5f6368',
  text3: '#9aa0a6',
  bg: '#f8f9fa',
  accent: '#1a73e8',
};

function TypeLabel({ type, children }: { type: string; children: React.ReactNode }) {
  const labelMap: Record<string, string> = {
    thought: '思考',
    action: '行动',
    observation: '观察',
    final_answer: '最终答案',
    error: '错误',
  };
  const isError = type === 'error';
  return (
    <div
      style={{
        marginBottom: 8,
        borderRadius: 6,
        overflow: 'hidden',
        border: `1px solid ${isError ? '#f5c2c7' : C.border}`,
      }}
    >
      <div
        style={{
          padding: '4px 10px',
          background: isError ? '#fff5f5' : C.bg,
          borderBottom: `1px solid ${isError ? '#f5c2c7' : C.border}`,
          fontSize: 10,
          fontWeight: 600,
          color: isError ? '#c92a2a' : C.text3,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {labelMap[type] || type}
      </div>
      <div style={{ padding: '8px 10px', fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

function TraceItem({ step, index, isLast }: { step: ReActTraceStep; index: number; isLast: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          marginRight: 10,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: C.bg,
            border: `1px solid ${C.border}`,
            color: C.text2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 11,
            zIndex: 1,
          }}
        >
          {index + 1}
        </div>
        {!isLast && (
          <div
            style={{
              width: 1,
              flex: 1,
              minHeight: 16,
              background: C.border,
              marginTop: 2,
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 12 }}>
        {/* 按 step.type 分支渲染单类型事件 */}
        {step.type === 'thought' && step.content && (
          <TypeLabel type="thought">{step.content}</TypeLabel>
        )}
        {step.type === 'action' && (
          <TypeLabel type="action">
            <div style={{ fontWeight: 600, marginBottom: 4, color: C.text1 }}>{step.name}</div>
            {step.input && Object.keys(step.input).length > 0 && (
              <pre
                style={{
                  margin: 0,
                  fontSize: 11,
                  background: C.bg,
                  borderRadius: 4,
                  padding: 6,
                  overflowX: 'auto',
                  fontFamily: 'Consolas, "Courier New", monospace',
                  color: C.text2,
                }}
              >
                {JSON.stringify(step.input, null, 2)}
              </pre>
            )}
          </TypeLabel>
        )}
        {step.type === 'observation' && step.content && (
          <TypeLabel type="observation">
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 120, overflowY: 'auto' }}>
              {step.content}
            </div>
          </TypeLabel>
        )}
        {step.type === 'final_answer' && step.content && (
          <TypeLabel type="final_answer">
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160, overflowY: 'auto', color: C.text1 }}>
              {step.content}
            </div>
          </TypeLabel>
        )}
        {step.type === 'error' && step.content && (
          <TypeLabel type="error">{step.content}</TypeLabel>
        )}
      </div>
    </div>
  );
}

export default function ReactTraceViewer({ trace, defaultOpen = false }: ReactTraceViewerProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!trace || trace.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无思考记录" className="!my-4" />;
  }

  return (
    <Collapse
      ghost
      activeKey={open ? ['trace'] : []}
      onChange={(keys) => setOpen(keys.includes('trace'))}
      items={[{
        key: 'trace',
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>
              ReAct 思考过程
            </Text>
            <span
              style={{
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                color: C.text3,
                background: C.bg,
              }}
            >
              {trace.length} 步
            </span>
          </div>
        ),
        children: (
          <div style={{ paddingTop: 6 }}>
            {trace.map((step, idx) => (
              <TraceItem key={idx} step={step} index={idx} isLast={idx === trace.length - 1} />
            ))}
          </div>
        ),
      }]}
    />
  );
}
