import { useState } from 'react';
import { Card, Input, Button, Typography, Steps, Tag, Alert, Spin, Collapse, Space, Divider } from 'antd';
import { RobotOutlined, SendOutlined, ToolOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { agentApi, type AgentResponse, type AgentTraceStep } from '@/api/agent';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

export default function AgentDemoPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string>('');

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await agentApi.runDemo(message);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Agent 运行失败';
      setError(msg);
    } finally {
      setLoading(false);
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
    <div className="page-container">
      {/* 页面标题 */}
      <div className="page-header mb-6">
        <Title level={3} className="page-title">
          <RobotOutlined className="mr-2" />
          Agent 智能备课（Function Calling）
        </Title>
        <Text type="secondary">
          用自然语言描述你的备课需求，Agent 会自主决策调用工具完成任务（查教材、生成备课、总结）。
        </Text>
      </div>

      {/* 输入区 */}
      <Card className="mb-4 shadow-sm">
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的备课需求，例如：帮我备一节静电场的物理课，难度中等，45分钟"
          autoSize={{ minRows: 3, maxRows: 6 }}
          className="mb-3"
        />
        <div className="flex justify-between items-center">
          <Space size="small" wrap>
            {examples.map((ex, i) => (
              <Tag
                key={i}
                className="cursor-pointer"
                color="blue"
                onClick={() => setMessage(ex)}
              >
                {ex}
              </Tag>
            ))}
          </Space>
          <Button
            type="primary"
            icon={loading ? <LoadingOutlined /> : <SendOutlined />}
            onClick={handleSend}
            disabled={loading || !message.trim()}
            size="large"
          >
            {loading ? 'Agent 思考中...' : '发送'}
          </Button>
        </div>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert
          message="运行出错"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      {/* 加载中 */}
      {loading && (
        <Card className="mb-4 shadow-sm">
          <div className="flex items-center justify-center py-8">
            <Spin size="large" />
            <Text type="secondary" className="ml-4">
              Agent 正在自主决策中...（可能需要 30-60 秒）
            </Text>
          </div>
        </Card>
      )}

      {/* 决策过程可视化 */}
      {result && result.trace && result.trace.length > 0 && (
        <Card
          className="mb-4 shadow-sm"
          title={
            <Space>
              <ToolOutlined />
              <span>Agent 决策过程</span>
              <Tag color="processing">{result.trace.length} 步</Tag>
            </Space>
          }
        >
          <Steps
            direction="vertical"
            current={result.trace.length - 1}
            items={result.trace.map((step: AgentTraceStep, index: number) => {
              if (step.action === 'call_tool') {
                return {
                  title: (
                    <Space>
                      <Tag color="blue">第 {step.step} 步</Tag>
                      <Text strong>调用工具：<Text code>{step.tool}</Text></Text>
                    </Space>
                  ),
                  description: (
                    <div className="mt-2">
                      <Text type="secondary">参数：</Text>
                      <pre className="bg-gray-50 p-3 rounded mt-1 text-sm overflow-auto">
                        {JSON.stringify(step.arguments, null, 2)}
                      </pre>
                    </div>
                  ),
                  icon: <ToolOutlined />,
                };
              }
              if (step.action === 'tool_result') {
                return {
                  title: (
                    <Space>
                      <Tag color="green">结果返回</Tag>
                      <Text type="secondary">{step.tool} 执行完成</Text>
                    </Space>
                  ),
                  description: (
                    <Collapse
                      ghost
                      size="small"
                      className="mt-1"
                      items={[{
                        key: '1',
                        label: '查看执行结果',
                        children: (
                          <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-48">
                            {step.result_preview}
                          </pre>
                        ),
                      }]}
                    />
                  ),
                  icon: <CheckCircleOutlined />,
                };
              }
              if (step.action === 'final_answer') {
                return {
                  title: (
                    <Space>
                      <Tag color="success">最终回答</Tag>
                      <Text type="secondary">Agent 任务完成</Text>
                    </Space>
                  ),
                  description: <Text type="secondary">{step.answer_preview}</Text>,
                  icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                };
              }
              return {
                title: <Text>步骤 {index + 1}</Text>,
                description: <Text type="secondary">{JSON.stringify(step)}</Text>,
              };
            })}
          />
        </Card>
      )}

      {/* 最终回答 */}
      {result && result.final_answer && (
        <>
          <Divider />
          <Card
            className="shadow-sm"
            title={
              <Space>
                <RobotOutlined />
                <span>Agent 最终回答</span>
              </Space>
            }
          >
            <div className="whitespace-pre-wrap text-base leading-relaxed">
              {result.final_answer}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
