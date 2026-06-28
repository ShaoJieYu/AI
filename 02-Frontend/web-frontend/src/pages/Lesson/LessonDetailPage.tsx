import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Spin, Tag, message, Dropdown, Modal, Empty, Skeleton } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DownloadOutlined,
  StarOutlined,
  ThunderboltOutlined,
  BookOutlined,
  BulbOutlined,
  WarningOutlined,
  TrophyOutlined,
  FormOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lessonApi } from '@/api/lesson';
import { useLessonStore } from '@/stores/lessonStore';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import type { LessonContentType } from '@/types/lesson';
import {
  LESSON_MODE_LABELS,
  LESSON_STATUS_LABELS,
  LESSON_CONTENT_TYPE_LABELS,
  LESSON_CONTENT_TYPE_ICON_COLORS,
  LESSON_CONTENT_TYPE_ORDER,
} from '@/types/lesson';
import dayjs from 'dayjs';

// 五段式内容类型 → 图标
const CONTENT_TYPE_ICONS: Record<LessonContentType, React.ReactNode> = {
  core_definition: <BookOutlined />,
  teaching_analysis: <BulbOutlined />,
  mistake_warnings: <WarningOutlined />,
  score_boosting: <TrophyOutlined />,
  example_derivation: <FormOutlined />,
};

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lessonId = Number(id);
  const queryClient = useQueryClient();
  const { isGenerating, generationProgress } = useLessonStore();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  // 主数据查询
  const { data: lessonRes, isLoading: lessonLoading, isError: lessonError } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => lessonApi.getLesson(lessonId),
    enabled: !!lessonId,
    refetchInterval: (query) => {
      // 生成中时每 3 秒轮询，直到状态变为完成或失败
      const status = query.state.data?.data?.status;
      return status === 'generating' ? 3000 : false;
    },
  });

  const lesson = lessonRes?.data;
  const isGeneratingNow = lesson?.status === 'generating';
  const isFailed = lesson?.status === 'failed';
  // 理科才启用 LaTeX 公式渲染，文科/语言类避免把 $ 误识别为公式
  const isStemSubject = ['物理', '化学', '生物', '数学'].some(
    (s) => lesson?.subject?.includes(s)
  );

  // 内容列表查询（生成中时也轮询，以便展示已生成的分段内容）
  const { data: contentsRes, isLoading: contentsLoading } = useQuery({
    queryKey: ['lesson-contents', lessonId],
    queryFn: () => lessonApi.getLessonContents(lessonId),
    enabled: !!lessonId,
    refetchInterval: isGeneratingNow ? 3000 : false,
  });

  const contents = contentsRes?.data || [];

  // 按 sortOrder 升序；若 sortOrder 相同则按预设五段顺序
  const sortedContents = [...contents].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return LESSON_CONTENT_TYPE_ORDER.indexOf(a.contentType) - LESSON_CONTENT_TYPE_ORDER.indexOf(b.contentType);
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: (data: any) => lessonApi.submitFeedback(lessonId, data),
    onSuccess: () => {
      message.success('反馈已提交');
      setFeedbackVisible(false);
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
    },
    onError: () => {
      message.error('提交失败');
    },
  });

  const handleExport = async (format: 'pdf' | 'word') => {
    try {
      const blob = await lessonApi.exportLesson(lessonId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `备课_${lesson?.teachingGoal}_${dayjs().format('YYYYMMDD')}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      // 拦截器已对 blob 错误响应解析并显示后端真实 message，这里仅兜底
      if (!navigator.onLine) {
        message.error('网络不可用，导出失败');
      }
    }
  };

  const handleSubmitFeedback = () => {
    submitFeedbackMutation.mutate({
      rating,
      feedback: feedbackText,
    });
  };

  // 加载中
  if (lessonLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 加载失败
  if (lessonError || !lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">备课不存在或加载失败</p>
        <Button onClick={() => navigate('/lessons/history')}>返回备课历史</Button>
      </div>
    );
  }

  // 状态标签颜色
  const statusColor = lesson.status === 'completed' ? 'green' : lesson.status === 'failed' ? 'red' : 'orange';

  return (
    <div className="page-container">
      {/* 顶部信息栏 */}
      <div className="flex items-center gap-4 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold m-0">{lesson.teachingGoal || lesson.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Tag color="blue">{lesson.subject}</Tag>
            {lesson.grade && <Tag color="purple">{lesson.grade}</Tag>}
            <Tag color="cyan">{LESSON_MODE_LABELS[lesson.generateType] || lesson.generateType}</Tag>
            {lesson.difficulty && <Tag color="gold">难度：{lesson.difficulty}</Tag>}
            {lesson.estimatedDuration && <Tag>时长：{lesson.estimatedDuration}分钟</Tag>}
            {lesson.aiModel && <Tag color="geekblue">模型：{lesson.aiModel}</Tag>}
            <Tag color={statusColor}>{LESSON_STATUS_LABELS[lesson.status]}</Tag>
            <span className="text-gray-400 text-sm">
              {dayjs(lesson.createdAt).format('YYYY-MM-DD HH:mm')}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon={<StarOutlined />} onClick={() => setFeedbackVisible(true)}>
            评价
          </Button>
          <Dropdown menu={{
            items: [
              { key: 'pdf', label: '导出 PDF', onClick: () => handleExport('pdf') },
            ]
          }}>
            <Button icon={<DownloadOutlined />}>导出</Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => message.info('编辑功能开发中')}
          >
            编辑
          </Button>
        </div>
      </div>

      {/* 生成中进度提示 */}
      {(isGenerating || isGeneratingNow) && (
        <Card className="mb-6 bg-primary-50 border-primary-100">
          <div className="flex items-center gap-4">
            <Spin indicator={<ThunderboltOutlined spin style={{ fontSize: 24, color: '#6366F1' }} />} />
            <div className="flex-1">
              <div className="font-medium text-primary-600">AI 正在生成五段式备课内容...</div>
              <div className="text-sm text-gray-500 mt-1">
                {generationProgress?.message || '正在调用通义千问大模型，请稍候（约 30-60 秒）'}
                {generationProgress ? ` (${generationProgress.progress}%)` : ''}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 生成失败提示 */}
      {isFailed && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-4">
            <WarningOutlined style={{ fontSize: 24, color: '#cf1322' }} />
            <div className="flex-1">
              <div className="font-medium text-red-600">备课内容生成失败</div>
              <div className="text-sm text-gray-600 mt-1">
                可能是 AI 服务异常或网络问题，请稍后重试，或联系管理员查看 AI 服务日志。
              </div>
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => navigate('/lessons/new')}
            >
              重新生成
            </Button>
          </div>
        </Card>
      )}

      {/* 五段式内容区 */}
      {sortedContents.length > 0 ? (
        <div className="space-y-6">
          {sortedContents.map((item) => {
            const iconColor = LESSON_CONTENT_TYPE_ICON_COLORS[item.contentType] || '#6366F1';
            return (
              <Card
                key={item.id}
                title={
                  <div className="flex items-center gap-2">
                    <span style={{ color: iconColor, fontSize: 18 }}>
                      {CONTENT_TYPE_ICONS[item.contentType]}
                    </span>
                    <span className="font-semibold">
                      {item.title || LESSON_CONTENT_TYPE_LABELS[item.contentType]}
                    </span>
                  </div>
                }
                variant="borderless"
                className="shadow-sm"
              >
                <MarkdownRenderer
                  content={item.content}
                  enableMath={isStemSubject}
                />
              </Card>
            );
          })}
        </div>
      ) : (
        // 生成中且尚无内容时显示骨架屏
        isGeneratingNow || contentsLoading ? (
          <Card variant="borderless" className="shadow-sm">
            <Skeleton active paragraph={{ rows: 12 }} />
          </Card>
        ) : (
          <Empty description="暂无备课内容">
            <Button type="primary" onClick={() => navigate('/lessons/new')}>
              去新建备课
            </Button>
          </Empty>
        )
      )}

      {/* 评价弹窗 */}
      <Modal
        title="备课评价"
        open={feedbackVisible}
        onOk={handleSubmitFeedback}
        onCancel={() => setFeedbackVisible(false)}
        confirmLoading={submitFeedbackMutation.isPending}
      >
        <div className="py-4 space-y-4">
          <div>
            <div className="mb-2">评分</div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarOutlined
                  key={star}
                  style={{
                    fontSize: 24,
                    color: star <= rating ? '#fadb14' : '#d9d9d9',
                    cursor: 'pointer',
                  }}
                  onClick={() => setRating(star)}
                />
              ))}
              <span className="ml-2 text-gray-500">{rating} 分</span>
            </div>
          </div>
          <div>
            <div className="mb-2">反馈意见</div>
            <textarea
              className="w-full border border-gray-300 rounded p-2 text-sm"
              rows={4}
              placeholder="请输入您对本次备课内容的评价和改进建议..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
