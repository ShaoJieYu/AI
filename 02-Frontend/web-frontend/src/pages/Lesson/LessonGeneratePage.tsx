import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Select, Input, Button, Slider, Steps, message } from 'antd';
import { BookOutlined, BulbOutlined, ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '@/api/student';
import { lessonApi } from '@/api/lesson';
import { useLessonStore } from '@/stores/lessonStore';
import type { GenerateLessonRequest, LessonMode } from '@/types/lesson';
import { LESSON_MODE_LABELS, SUBJECT_OPTIONS } from '@/types/lesson';
import { getStages, getTextbooks, getChapters } from '@/data/textbooks';

const { TextArea } = Input;

const STEPS = ['选择学生', '设置参数', '确认生成'];

// 支持教材章节级联选择的科目（人教版，陕西西安适用）
const TEXTBOOK_SUBJECTS = ['英语', '物理'];

// 各科目对应的备课主题输入框 placeholder 提示
const TOPIC_PLACEHOLDERS: Record<string, string> = {
  '语文': '例如：记叙文的写作技巧',
  '数学': '例如：一次函数的概念与图像',
  '英语': '例如：现在完成时的用法',
  '物理': '例如：牛顿第二定律的应用',
  '化学': '例如：氧化还原反应的判断',
  '生物': '例如：细胞的结构与功能',
  '政治': '例如：公民的权利与义务',
  '历史': '例如：辛亥革命的历史意义',
  '地理': '例如：气候类型的分布规律',
};
const DEFAULT_TOPIC_PLACEHOLDER = '请先选择科目';

export default function LessonGeneratePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const { startGeneration, setDraftContent } = useLessonStore();

  const studentIdParam = searchParams.get('studentId');

  // 使用 Form.useWatch 订阅字段变化，确保组件实时更新（避免 getFieldValue 不触发重渲染的问题）
  // 第三步确认页也直接使用这些订阅值，避免 Form.Item 卸载后 getFieldsValue() 取不到值
  const watchedStudentId = Form.useWatch('studentId', form);
  const watchedSubject = Form.useWatch('subject', form);
  const watchedStage = Form.useWatch('textbookStage', form);
  const watchedTextbookId = Form.useWatch('textbookId', form);
  const watchedChapterId = Form.useWatch('chapterId', form);
  const watchedSectionId = Form.useWatch('sectionId', form);
  const watchedTopic = Form.useWatch('topic', form);
  const watchedMode = Form.useWatch('mode', form);
  const watchedDuration = Form.useWatch('duration', form);
  const watchedCustomRequirements = Form.useWatch('customRequirements', form);

  // 根据所选科目动态计算备课主题输入框的 placeholder
  const topicPlaceholder = (watchedSubject && TOPIC_PLACEHOLDERS[watchedSubject]) || DEFAULT_TOPIC_PLACEHOLDER;

  useEffect(() => {
    if (studentIdParam) {
      form.setFieldValue('studentId', Number(studentIdParam));
    }
  }, [studentIdParam, form]);

  const { data: studentsData } = useQuery({
    queryKey: ['students', { page: 1, pageSize: 100 }],
    queryFn: () => studentApi.getStudents({ page: 1, pageSize: 100 }),
  });

  const students = studentsData?.data?.items || [];

  const selectedStudent = students.find(s => s.id === watchedStudentId);

  // 自动检测所选学生的学科并填入科目字段；学生无科目则留空
  useEffect(() => {
    if (selectedStudent) {
      form.setFieldValue('subject', selectedStudent.currentSubject || undefined);
    }
    // 切换学生时清空教材章节级联（含小节）
    form.setFieldValue('textbookStage', undefined);
    form.setFieldValue('textbookId', undefined);
    form.setFieldValue('chapterId', undefined);
    form.setFieldValue('sectionId', undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent?.id]);

  // 科目变化时重置教材章节级联（含小节）
  useEffect(() => {
    form.setFieldValue('textbookStage', undefined);
    form.setFieldValue('textbookId', undefined);
    form.setFieldValue('chapterId', undefined);
    form.setFieldValue('sectionId', undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSubject]);

  // 课本变化时清空章节与小节（不同课本的章节不同）
  useEffect(() => {
    form.setFieldValue('chapterId', undefined);
    form.setFieldValue('sectionId', undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTextbookId]);

  // 章节变化时清空小节（不同章节的小节不同）
  useEffect(() => {
    form.setFieldValue('sectionId', undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedChapterId]);

  // 是否展示教材章节级联
  const showTextbookSelect = TEXTBOOK_SUBJECTS.includes(watchedSubject);

  // 计算级联选项数据
  const stages = useMemo(
    () => (showTextbookSelect ? getStages(watchedSubject) : []),
    [showTextbookSelect, watchedSubject]
  );

  const textbooks = useMemo(
    () => (watchedSubject && watchedStage ? getTextbooks(watchedSubject, watchedStage) : []),
    [watchedSubject, watchedStage]
  );

  const chapters = useMemo(
    () => (watchedSubject && watchedStage && watchedTextbookId
      ? getChapters(watchedSubject, watchedStage, watchedTextbookId)
      : []),
    [watchedSubject, watchedStage, watchedTextbookId]
  );

  const selectedTextbook = textbooks.find(t => t.id === watchedTextbookId);
  const selectedChapter = chapters.find(c => c.id === watchedChapterId);
  // 当前章节下的小节（仅高中物理已补录；无 sections 时为空数组，不展示小节选择器）
  const sections = selectedChapter?.sections || [];
  const selectedSection = sections.find(s => s.id === watchedSectionId);

  const handleNext = async () => {
    try {
      // 按步指定校验字段：hidden 方式下所有 Form.Item 始终挂载，需精确校验当前步
      const fieldsByStep: Record<number, string[]> = {
        0: ['studentId'],
        1: showTextbookSelect
          ? ['subject', 'textbookStage', 'textbookId', 'chapterId', ...(sections.length > 0 ? ['sectionId'] : []), 'topic', 'mode', 'duration']
          : ['subject', 'topic', 'mode', 'duration'],
      };
      await form.validateFields(fieldsByStep[currentStep] || []);
      if (currentStep < 2) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    try {
      setDraftContent(null);

      // 将教材章节信息拼入辅导备注，确保 AI 服务收到完整教材上下文
      let customRequirements = watchedCustomRequirements || '';
      if (showTextbookSelect && watchedStage && watchedTextbookId) {
        const textbookLabel = selectedTextbook?.title || '';
        const chapterLabel = selectedChapter?.title || '';
        const sectionLabel = selectedSection?.title || '';
        const textbookInfo = `【教材依据】${watchedSubject} · ${watchedStage} · ${textbookLabel}${chapterLabel ? ' · ' + chapterLabel : ''}${sectionLabel ? ' · ' + sectionLabel : ''}`;
        customRequirements = customRequirements
          ? `${textbookInfo}\n${customRequirements}`
          : textbookInfo;
      }

      const request: GenerateLessonRequest = {
        studentId: watchedStudentId!,
        subject: watchedSubject!,
        topic: watchedTopic!,
        mode: watchedMode!,
        duration: watchedDuration!,
        difficulty: 3,
        customRequirements: customRequirements || undefined,
      };

      startGeneration();
      const response = await lessonApi.generateLesson(request);

      message.success('备课生成中...');
      navigate(`/lessons/${response.data.id}`);
    } catch (error: any) {
      message.error(error.response?.data?.message || '生成失败');
    }
  };

  // 第一步、第二步的 Form.Item 始终挂载（用 hidden 控制显隐），
  // 避免 Form.Item 卸载导致 Form.useWatch 取不到值、教材字段被误清空（项目约定：多步表单保留字段值）
  // 第三步为纯展示页，条件渲染即可

  const student = students.find(s => s.id === watchedStudentId);

  return (
    <div className="page-container max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">新建备课</h1>
        <p className="page-description">基于学生情况，AI 自动生成个性化备课内容</p>
      </div>

      <Card variant="borderless" className="shadow-sm">
        <Steps current={currentStep} items={STEPS.map(name => ({ title: name }))} className="mb-8" />

        <Form form={form} layout="vertical">
          {/* 第一步：选择学生 */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }} className="py-8">
            <h3 className="text-lg font-medium mb-6 text-center">请选择备课学生</h3>
            <Form.Item
              name="studentId"
              rules={[{ required: true, message: '请选择学生' }]}
            >
              <Select
                placeholder="搜索或选择学生..."
                size="large"
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={students.map(s => ({
                  label: `${s.name} - ${s.grade} - ${s.currentSubject || '未设置科目'}`,
                  value: s.id,
                }))}
              />
            </Form.Item>

            {selectedStudent && (
              <Card className="mt-6" bordered>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-600">
                    {selectedStudent.name[0]}
                  </div>
                  <div>
                    <div className="font-medium text-lg">{selectedStudent.name}</div>
                    <div className="text-gray-500">
                      {selectedStudent.grade} · {selectedStudent.currentSubject || '未设置科目'}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* 第二步：设置参数 */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }} className="py-8">
            <h3 className="text-lg font-medium mb-6 text-center">设置备课参数</h3>

            <Form.Item
              name="subject"
              label="科目"
              rules={[{ required: true, message: '请选择科目' }]}
            >
              <Select placeholder="选择科目" size="large">
                {SUBJECT_OPTIONS.map(s => (
                  <Select.Option key={s} value={s}>{s}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            {showTextbookSelect && (
              <>
                <Form.Item
                  name="textbookStage"
                  label="学段"
                  rules={[{ required: true, message: '请选择学段' }]}
                >
                  <Select placeholder="选择 初中 / 高中" size="large">
                    {stages.map(stage => (
                      <Select.Option key={stage} value={stage}>{stage}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="textbookId"
                  label="课本"
                  rules={[{ required: true, message: '请选择课本' }]}
                >
                  <Select placeholder="选择课本" size="large" disabled={!watchedStage}>
                    {textbooks.map(t => (
                      <Select.Option key={t.id} value={t.id}>{t.title}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="chapterId"
                  label="章节"
                  rules={[{ required: true, message: '请选择章节' }]}
                >
                  <Select placeholder="选择章节" size="large" disabled={!watchedTextbookId}>
                    {chapters.map(c => (
                      <Select.Option key={c.id} value={c.id}>{c.title}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                {sections.length > 0 && (
                  <Form.Item
                    name="sectionId"
                    label="小节"
                    rules={[{ required: true, message: '请选择小节' }]}
                  >
                    <Select placeholder="选择小节" size="large" disabled={!watchedChapterId}>
                      {sections.map(s => (
                        <Select.Option key={s.id} value={s.id}>{s.title}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
              </>
            )}

            <Form.Item
              name="topic"
              label="备课主题"
              rules={[{ required: true, message: '请输入备课主题' }]}
            >
              <Input placeholder={topicPlaceholder} size="large" />
            </Form.Item>

            <Form.Item
              name="mode"
              label="备课模式"
              rules={[{ required: true, message: '请选择备课模式' }]}
              initialValue="new_lesson"
            >
              <Select placeholder="选择模式" size="large">
                {Object.entries(LESSON_MODE_LABELS).map(([key, label]) => (
                  <Select.Option key={key} value={key}>{label}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="duration"
              label="课程时长"
              initialValue={90}
            >
              <Slider marks={{ 60: '60分钟', 90: '90分钟', 120: '120分钟' }}
                min={60} max={120} step={5} />
            </Form.Item>

            <Form.Item name="customRequirements" label="辅导备注（可选）">
              <TextArea
                rows={3}
                placeholder="例如：学生基础偏弱，本次辅导需多用生活实例引导，重点突破概念理解，配合基础题巩固..."
              />
            </Form.Item>
          </div>

          {/* 第三步：确认生成（纯展示，无表单字段） */}
          {currentStep === 2 && (
            <div className="py-8">
              <h3 className="text-lg font-medium mb-6 text-center">确认备课信息</h3>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">学生</span>
                  <span className="font-medium">{student?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">科目</span>
                  <span className="font-medium">{watchedSubject || '-'}</span>
                </div>
                {showTextbookSelect && selectedTextbook && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">教材</span>
                    <span className="font-medium">
                      {watchedStage} · {selectedTextbook.title}
                      {selectedChapter ? ' · ' + selectedChapter.title : ''}
                      {selectedSection ? ' · ' + selectedSection.title : ''}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">主题</span>
                  <span className="font-medium">{watchedTopic || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">模式</span>
                  <span className="font-medium">
                    {LESSON_MODE_LABELS[watchedMode as LessonMode] || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">时长</span>
                  <span className="font-medium">{watchedDuration ?? 90} 分钟</span>
                </div>
                {watchedCustomRequirements && (
                  <div className="pt-4 border-t">
                    <span className="text-gray-500">辅导备注</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{watchedCustomRequirements}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 text-center text-gray-500 text-sm">
                <BulbOutlined className="mr-1" />
                AI 将根据以上信息生成个性化的备课内容，预计需要 10-30 秒
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              size="large"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeftOutlined /> 上一步
            </Button>

            {currentStep < 2 ? (
              <Button type="primary" size="large" onClick={handleNext}>
                下一步 <ArrowRightOutlined />
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<BookOutlined />}
                onClick={handleGenerate}
              >
                开始生成备课
              </Button>
            )}
          </div>
        </Form>
      </Card>
    </div>
  );
}
