import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, Input, Button, Typography, Steps, Tag, Spin, Space,
  Alert, Collapse, Tooltip, Empty, Input as AntInput, Divider,
} from 'antd';
import {
  RobotOutlined, UserOutlined, SendOutlined, PlusOutlined,
  ToolOutlined, CheckCircleOutlined, DeleteOutlined, HistoryOutlined,
  CheckOutlined, RedoOutlined, CloseOutlined,
} from '@ant-design/icons';
import {
  conversationApi,
  type ConversationMessage,
  type PlanStep,
} from '@/api/conversation';
import type { AgentTraceStep } from '@/api/agent';

const { Title, Text } = Typography;
const { TextArea } = AntInput;

// ===== 卡片视图类型 =====
type CardView =
  | { kind: 'plan'; plan: PlanStep[] }
  | { kind: 'step_result'; step: number; stepName: string; tool: string; result: string; plan: PlanStep[] }
  | { kind: 'summary'; summary: string }
  | { kind: 'text'; content: string };

// 聊天消息（扩展：支持卡片视图）
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  card?: CardView;
}

export default function AgentDemoPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastTrace, setLastTrace] = useState<AgentTraceStep[]>([]);
  // 当前执行计划（用户确认后逐步执行）
  const [currentPlan, setCurrentPlan] = useState<PlanStep[]>([]);
  // 当前执行到第几步
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  // 重新执行时的反馈输入
  const [retryInput, setRetryInput] = useState('');
  const [retrying, setRetrying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 页面加载时自动创建会话
  useEffect(() => {
    conversationApi.createSession().then((res) => {
      if (res.data?.code === 200 && res.data?.data?.sessionId) {
        setSessionId(res.data.data.sessionId);
      }
    }).catch(() => {
      setError('创建会话失败，请检查后端服务是否运行');
    });
  }, []);

  // 新消息时自动滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== 发送消息（阶段 3：先生成计划） =====
  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || !sessionId || loading) return;

    setInput('');
    setError('');
    setCurrentPlan([]);
    setCurrentStepIndex(0);

    // 立即添加用户消息
    const userMsg: ChatMessage = {
      role: 'user', content: msg, timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // 阶段 3：先调 generatePlan 生成计划
      const res = await conversationApi.generatePlan(sessionId, msg);
      if (res.data?.code === 200 && res.data?.data) {
        const data = res.data.data;
        const plan: PlanStep[] = data.plan || [];
        setCurrentPlan(plan);

        // 添加计划卡片
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: `📋 执行计划（共${plan.length}步）`,
          timestamp: Date.now(),
          card: { kind: 'plan', plan },
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setError(res.data?.message || '生成计划失败');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '请求失败';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [input, sessionId, loading]);

  // ===== 确认计划，开始逐步执行 =====
  const handleConfirmPlan = useCallback(async () => {
    if (!sessionId || currentPlan.length === 0) return;
    setLoading(true);
    setError('');
    setCurrentStepIndex(0);

    await executeStep(0);
  }, [sessionId, currentPlan]);

  // ===== 执行指定步骤 =====
  const executeStep = useCallback(async (index: number) => {
    if (!sessionId || !currentPlan[index]) return;

    setLoading(true);
    setError('');

    try {
      const step = currentPlan[index];
      const res = await conversationApi.executeStep(sessionId, step);

      if (res.data?.code === 200 && res.data?.data) {
        const data = res.data.data;
        setLastTrace(data.trace || []);

        // 更新计划中该步骤的状态
        const updatedPlan = [...currentPlan];
        updatedPlan[index] = { ...step, status: 'completed' };
        setCurrentPlan(updatedPlan);

        // 添加步骤结果卡片
        const resultMsg: ChatMessage = {
          role: 'assistant',
          content: `✅ 第${data.step}步完成：${data.step_name}`,
          timestamp: Date.now(),
          card: {
            kind: 'step_result',
            step: data.step,
            stepName: data.step_name,
            tool: data.tool,
            result: data.result,
            plan: updatedPlan,
          },
        };
        setMessages((prev) => [...prev, resultMsg]);
        setCurrentStepIndex(index);
      } else {
        setError(res.data?.message || '步骤执行失败');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '请求失败';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [sessionId, currentPlan]);

  // ===== 确认当前步骤结果，继续下一步 =====
  const handleConfirmStep = useCallback(async () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= currentPlan.length) {
      // 所有步骤完成，生成总结
      await handleGenerateSummary();
    } else {
      await executeStep(nextIndex);
    }
  }, [currentStepIndex, currentPlan]);

  // ===== 重新执行当前步骤（用户选 A：输入修改意见后重新执行） =====
  const handleRetryStep = useCallback(async () => {
    if (!sessionId || !currentPlan[currentStepIndex]) return;
    const feedback = retryInput.trim();
    if (!feedback) return;

    setRetrying(true);
    setError('');

    try {
      const step = currentPlan[currentStepIndex];
      const res = await conversationApi.retryStep(sessionId, feedback, step);

      if (res.data?.code === 200 && res.data?.data) {
        const data = res.data.data;
        setLastTrace(data.trace || []);

        // 更新消息中最后一个 step_result 卡片
        setMessages((prev) => {
          const newMsgs = [...prev];
          // 找到最后一个 step_result 类型的消息替换
          for (let i = newMsgs.length - 1; i >= 0; i--) {
            if (newMsgs[i].card?.kind === 'step_result') {
              newMsgs[i] = {
                role: 'assistant',
                content: `🔄 第${data.step}步已重新执行：${data.step_name}`,
                timestamp: Date.now(),
                card: {
                  kind: 'step_result',
                  step: data.step,
                  stepName: data.step_name,
                  tool: data.tool,
                  result: data.result,
                  plan: currentPlan,
                },
              };
              break;
            }
          }
          return newMsgs;
        });

        setRetryInput('');
      } else {
        setError(res.data?.message || '重新执行失败');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '请求失败';
      setError(errorMsg);
    } finally {
      setRetrying(false);
    }
  }, [sessionId, currentPlan, currentStepIndex, retryInput]);

  // ===== 生成总结 =====
  const handleGenerateSummary = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);

    try {
      const res = await conversationApi.generateSummary(sessionId, currentPlan);
      if (res.data?.code === 200 && res.data?.data) {
        const summary = res.data.data.summary;
        const summaryMsg: ChatMessage = {
          role: 'assistant',
          content: '📊 任务总结',
          timestamp: Date.now(),
          card: { kind: 'summary', summary },
        };
        setMessages((prev) => [...prev, summaryMsg]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '总结生成失败';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [sessionId, currentPlan]);

  // ===== 新建会话 =====
  const handleNewSession = async () => {
    setMessages([]);
    setLastTrace([]);
    setError('');
    setLoading(false);
    setCurrentPlan([]);
    setCurrentStepIndex(0);
    setRetryInput('');
    try {
      const res = await conversationApi.createSession();
      if (res.data?.code === 200 && res.data?.data?.sessionId) {
        setSessionId(res.data.data.sessionId);
      }
    } catch {
      setError('创建会话失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSend();
    }
  };

  // 预设示例
  const examples = [
    '帮我备一节静电场的物理课，难度中等，45分钟',
    '帮我备一节英语一般过去时的课',
    '帮我备一节牛顿第二定律的物理课，难度困难，90分钟',
  ];

  // ===== 渲染卡片视图 =====
  const renderCard = (card: CardView) => {
    if (card.kind === 'plan') {
      return (
        <div style={{ marginTop: 8 }}>
          <div style={{
            background: '#f6f8fa', borderRadius: 8, padding: 12,
            border: '1px solid #d0d7de',
          }}>
            <Space style={{ marginBottom: 8 }}>
              <ToolOutlined style={{ color: '#1677ff' }} />
              <Text strong>执行计划（共{card.plan.length}步）</Text>
            </Space>
            <Steps
              direction="vertical"
              current={-1}
              size="small"
              items={card.plan.map((s) => ({
                title: <Text strong style={{ fontSize: 13 }}>{s.name}</Text>,
                description: <Text type="secondary" style={{ fontSize: 12 }}>{s.description}</Text>,
              }))}
            />
          </div>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleConfirmPlan}
              loading={loading}
            >
              确认开始执行
            </Button>
          </div>
        </div>
      );
    }

    if (card.kind === 'step_result') {
      const isLast = card.step >= card.plan.length;
      return (
        <div style={{ marginTop: 8 }}>
          <div style={{
            background: '#f6f8fa', borderRadius: 8, padding: 12,
            border: '1px solid #d0d7de',
          }}>
            <Space style={{ marginBottom: 8 }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong>第{card.step}步完成：{card.stepName}</Text>
              <Tag color="blue">{card.tool}</Tag>
            </Space>

            {/* 计划进度 */}
            <Steps
              direction="vertical"
              current={card.step - 1}
              size="small"
              style={{ marginBottom: 12 }}
              items={card.plan.map((s, i) => ({
                title: <Text style={{ fontSize: 12, color: i < card.step ? '#52c41a' : '#999' }}>{s.name}</Text>,
                status: i < card.step ? 'finish' : i === card.step - 1 ? 'process' : 'wait',
              }))}
            />

            {/* 结果内容 */}
            <Collapse
              ghost
              size="small"
              items={[{
                key: '1',
                label: <Text type="secondary" style={{ fontSize: 12 }}>查看结果详情</Text>,
                children: (
                  <pre style={{
                    fontSize: 12, background: '#fff', padding: 8, borderRadius: 4,
                    overflow: 'auto', maxHeight: 200, margin: 0,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {card.result}
                  </pre>
                ),
              }]}
            />
          </div>

          {/* 确认 / 重新执行 按钮 */}
          <div style={{ marginTop: 8 }}>
            {/* 重新执行输入框 */}
            <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
              <Input
                placeholder="输入修改意见，重新执行当前步骤..."
                value={retryInput}
                onChange={(e) => setRetryInput(e.target.value)}
                disabled={retrying}
                prefix={<RedoOutlined style={{ color: '#999' }} />}
              />
              <Button
                icon={<RedoOutlined />}
                onClick={handleRetryStep}
                loading={retrying}
                disabled={!retryInput.trim()}
              >
                重新执行
              </Button>
            </Space.Compact>

            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleConfirmStep}
                loading={loading}
              >
                {isLast ? '生成总结' : '确认继续下一步'}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (card.kind === 'summary') {
      return (
        <div style={{
          marginTop: 8, background: '#f6ffed', borderRadius: 8, padding: 12,
          border: '1px solid #b7eb8f',
        }}>
          <Space style={{ marginBottom: 8 }}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text strong style={{ color: '#389e0d' }}>任务完成总结</Text>
          </Space>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: '#333' }}>
            {card.summary}
          </div>
        </div>
      );
    }

    // text 类型：普通文本
    return <div style={{ whiteSpace: 'pre-wrap' }}>{card.content}</div>;
  };

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="page-header mb-4">
        <Title level={3} className="page-title" style={{ margin: 0 }}>
          <RobotOutlined className="mr-2" />
          Agent 智能备课
        </Title>
        <Text type="secondary">
          阶段 3 · Planning 自主规划 · 逐步执行确认
        </Text>
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100% - 60px)' }}>
        {/* ===== 左侧：聊天面板 ===== */}
        <Card
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}
        >
          {/* 会话头 */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Space>
              <HistoryOutlined />
              <Text strong>对话会话</Text>
              {sessionId && (
                <Text code style={{ fontSize: 11 }}>{sessionId.slice(0, 8)}...</Text>
              )}
              {currentPlan.length > 0 && (
                <Tag color="processing">
                  计划进度 {currentStepIndex + 1}/{currentPlan.length}
                </Tag>
              )}
            </Space>
            <Space size="small">
              <Tooltip title="新会话">
                <Button size="small" icon={<PlusOutlined />} onClick={handleNewSession}>
                  新建
                </Button>
              </Tooltip>
              {sessionId && (
                <Tooltip title="删除当前会话">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                      await conversationApi.deleteSession(sessionId);
                      handleNewSession();
                    }}
                  />
                </Tooltip>
              )}
            </Space>
          </div>

          {/* 消息列表 */}
          <div style={{
            flex: 1, overflow: 'auto', padding: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {/* 欢迎消息 */}
            {messages.length === 0 && !loading && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', gap: 12,
                color: '#999',
              }}>
                <RobotOutlined style={{ fontSize: 48, opacity: 0.3 }} />
                <Text type="secondary">输入备课需求，Agent 将先制定计划再逐步执行</Text>
                <Space wrap style={{ marginTop: 8, justifyContent: 'center' }}>
                  {examples.map((ex, i) => (
                    <Tag
                      key={i}
                      color="blue"
                      onClick={() => setInput(ex)}
                      style={{ cursor: 'pointer' }}
                    >
                      {ex}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* 消息气泡 */}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 8,
                  alignItems: 'flex-start',
                }}
              >
                {/* 头像 */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: msg.role === 'user' ? '#1677ff' : '#f0f0f0',
                  flexShrink: 0,
                }}>
                  {msg.role === 'user' ? (
                    <UserOutlined style={{ color: '#fff', fontSize: 14 }} />
                  ) : (
                    <RobotOutlined style={{ color: '#666', fontSize: 14 }} />
                  )}
                </div>

                {/* 气泡内容 */}
                <div style={{
                  maxWidth: msg.card ? '80%' : '75%',
                  padding: msg.card ? '10px 14px' : '10px 14px',
                  borderRadius: 12,
                  backgroundColor: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                  color: msg.role === 'user' ? '#fff' : '#333',
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.card ? (
                    <div>
                      <Text style={{ color: '#666', fontSize: 13 }}>{msg.content}</Text>
                      {renderCard(msg.card)}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* 加载指示器 */}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#f0f0f0', flexShrink: 0,
                }}>
                  <RobotOutlined style={{ color: '#666', fontSize: 14 }} />
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  backgroundColor: '#f5f5f5',
                }}>
                  <Space>
                    <Spin size="small" />
                    <Text type="secondary">
                      {currentPlan.length === 0 ? 'Agent 正在制定计划...' : `Agent 正在执行第${currentStepIndex + 1}步...`}
                    </Text>
                  </Space>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <Alert message={error} type="error" showIcon closable
                onClose={() => setError('')} style={{ marginTop: 8 }}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入区 */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid #f0f0f0',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入备课需求，按 Ctrl+Enter 发送..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                disabled={!sessionId || loading}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!sessionId || loading || !input.trim()}
                style={{ alignSelf: 'flex-end' }}
              >
                发送
              </Button>
            </div>
          </div>
        </Card>

        {/* ===== 右侧：决策轨迹面板 ===== */}
        <Card
          title={
            <Space>
              <ToolOutlined />
              <span>决策轨迹</span>
              {lastTrace.length > 0 && (
                <Tag color="processing">{lastTrace.length} 步</Tag>
              )}
            </Space>
          }
          style={{ width: 380, overflow: 'auto' }}
          bodyStyle={{ padding: 12 }}
        >
          {/* 当前计划进度 */}
          {currentPlan.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 13 }}>当前计划进度</Text>
              <Steps
                direction="vertical"
                current={currentStepIndex}
                size="small"
                style={{ marginTop: 8 }}
                items={currentPlan.map((s, i) => ({
                  title: <Text style={{ fontSize: 12 }}>{s.name}</Text>,
                  status: i < currentStepIndex ? 'finish' : i === currentStepIndex ? 'process' : 'wait',
                  description: <Text type="secondary" style={{ fontSize: 11 }}>{s.tool}</Text>,
                }))}
              />
              <Divider style={{ margin: '12px 0' }} />
            </div>
          )}

          {lastTrace.length === 0 ? (
            <Empty
              description="发送消息后，Agent 的决策过程将显示在此处"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Steps
              direction="vertical"
              current={lastTrace.length - 1}
              size="small"
              items={lastTrace.map((step: AgentTraceStep, index: number) => {
                if (step.action === 'call_tool') {
                  return {
                    title: (
                      <Space size={4}>
                        <Tag color="blue" style={{ fontSize: 11 }}>第 {step.step} 步</Tag>
                        <Text strong style={{ fontSize: 13 }}>调用工具</Text>
                      </Space>
                    ),
                    description: (
                      <div style={{ marginTop: 4 }}>
                        <Tag color="geekblue">{step.tool}</Tag>
                        <Collapse
                          ghost
                          size="small"
                          style={{ marginTop: 4 }}
                          items={[{
                            key: '1',
                            label: <Text type="secondary" style={{ fontSize: 12 }}>参数</Text>,
                            children: (
                              <pre style={{
                                fontSize: 11, background: '#fafafa',
                                padding: 8, borderRadius: 4,
                                overflow: 'auto', maxHeight: 120, margin: 0,
                              }}>
                                {JSON.stringify(step.arguments, null, 2)}
                              </pre>
                            ),
                          }]}
                        />
                      </div>
                    ),
                    icon: <ToolOutlined style={{ fontSize: 14 }} />,
                  };
                }
                if (step.action === 'tool_result') {
                  return {
                    title: (
                      <Space size={4}>
                        <Tag color="green" style={{ fontSize: 11 }}>结果</Tag>
                        <Text type="secondary" style={{ fontSize: 13 }}>{step.tool}</Text>
                      </Space>
                    ),
                    description: (
                      <Collapse
                        ghost
                        size="small"
                        style={{ marginTop: 4 }}
                        items={[{
                          key: '1',
                          label: <Text type="secondary" style={{ fontSize: 12 }}>查看结果</Text>,
                          children: (
                            <pre style={{
                              fontSize: 11, background: '#fafafa',
                              padding: 8, borderRadius: 4,
                              overflow: 'auto', maxHeight: 120, margin: 0,
                            }}>
                              {step.result_preview}
                            </pre>
                          ),
                        }]}
                      />
                    ),
                    icon: <CheckCircleOutlined style={{ fontSize: 14, color: '#52c41a' }} />,
                  };
                }
                return {
                  title: <Text style={{ fontSize: 13 }}>步骤 {index + 1}</Text>,
                  description: <Text type="secondary" style={{ fontSize: 12 }}>{JSON.stringify(step)}</Text>,
                };
              })}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
