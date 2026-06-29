import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, Input, Button, Typography, Steps, Tag, Spin, Space, Divider,
  Alert, Collapse, Tooltip, Empty,
} from 'antd';
import {
  RobotOutlined, UserOutlined, SendOutlined, PlusOutlined,
  ToolOutlined, CheckCircleOutlined, DeleteOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { conversationApi, type ConversationMessage } from '@/api/conversation';
import type { AgentTraceStep } from '@/api/agent';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function AgentDemoPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastTrace, setLastTrace] = useState<AgentTraceStep[]>([]);

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

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || !sessionId || loading) return;

    setInput('');
    setError('');

    // 立即添加用户消息到本地
    const userMsg: ConversationMessage = {
      role: 'user',
      content: msg,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await conversationApi.sendMessage(sessionId, msg);
      if (res.data?.code === 200 && res.data?.data) {
        const { finalAnswer, trace } = res.data.data;
        const assistantMsg: ConversationMessage = {
          role: 'assistant',
          content: finalAnswer,
          timestamp: Date.now(),
          trace,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setLastTrace(trace || []);
      } else {
        setError(res.data?.message || 'Agent 调用失败');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '请求失败';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [input, sessionId, loading]);

  const handleNewSession = async () => {
    setMessages([]);
    setLastTrace([]);
    setError('');
    setLoading(false);
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

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="page-header mb-4">
        <Title level={3} className="page-title" style={{ margin: 0 }}>
          <RobotOutlined className="mr-2" />
          Agent 智能备课
        </Title>
        <Text type="secondary">
          多轮对话 · Agent 自主决策 · Redis 持久化会话
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
                <Text type="secondary">输入备课需求，Agent 将自主决策完成任务</Text>
                <Space wrap style={{ marginTop: 8, justifyContent: 'center' }}>
                  {examples.map((ex, i) => (
                    <Tag
                      key={i}
                      className="cursor-pointer"
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
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  backgroundColor: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                  color: msg.role === 'user' ? '#fff' : '#333',
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
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
                    <Text type="secondary">Agent 正在思考中...</Text>
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
                                overflow: 'auto', maxHeight: 120,
                                margin: 0,
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
                              overflow: 'auto', maxHeight: 120,
                              margin: 0,
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
                if (step.action === 'final_answer') {
                  return {
                    title: (
                      <Space size={4}>
                        <Tag color="success" style={{ fontSize: 11 }}>完成</Tag>
                        <Text type="secondary" style={{ fontSize: 13 }}>Agent 任务完成</Text>
                      </Space>
                    ),
                    description: (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {step.answer_preview}
                      </Text>
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