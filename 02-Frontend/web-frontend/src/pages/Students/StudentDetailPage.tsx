import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Tabs, Timeline, Progress, Modal, Form, Select, Input, Popconfirm, Empty, Alert, message } from 'antd';
import { EditOutlined, ArrowLeftOutlined, BookOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '@/api/student';
import { lessonApi } from '@/api/lesson';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { StudentWeakPoint } from '@/types/student';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const studentId = Number(id);

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentApi.getStudent(studentId),
    enabled: !!studentId,
  });

  const { data: profileData } = useQuery({
    queryKey: ['studentProfile', studentId],
    queryFn: () => studentApi.getStudentProfile(studentId),
    enabled: !!studentId,
  });

  const { data: goalsData } = useQuery({
    queryKey: ['teachingGoals', studentId],
    queryFn: () => studentApi.getTeachingGoals(studentId),
    enabled: !!studentId,
  });

  const { data: lessonsData } = useQuery({
    queryKey: ['studentLessons', studentId],
    queryFn: () => lessonApi.getLessonsByStudent(studentId),
    enabled: !!studentId,
  });

  const student = studentData?.data;
  const profile = profileData?.data;
  const goals = goalsData?.data || [];
  const lessons = lessonsData?.data || [];

  // ===== 薄弱知识点（阶段 2b-1） =====
  const queryClient = useQueryClient();
  const [wpModalOpen, setWpModalOpen] = useState(false);
  const [editingWp, setEditingWp] = useState<StudentWeakPoint | null>(null);
  const [wpForm] = Form.useForm();

  const { data: weakPoints = [] } = useQuery({
    queryKey: ['studentWeakPoints', studentId],
    queryFn: () => studentApi.getWeakPoints(studentId),
    enabled: !!studentId,
  });

  const createWpMutation = useMutation({
    mutationFn: (data: Parameters<typeof studentApi.createWeakPoint>[1]) =>
      studentApi.createWeakPoint(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentWeakPoints', studentId] });
      message.success('薄弱点添加成功');
      setWpModalOpen(false);
      wpForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '添加失败');
    },
  });

  const updateWpMutation = useMutation({
    mutationFn: (data: { id: number; body: Parameters<typeof studentApi.updateWeakPoint>[2] }) =>
      studentApi.updateWeakPoint(studentId, data.id, data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentWeakPoints', studentId] });
      message.success('薄弱点更新成功');
      setWpModalOpen(false);
      setEditingWp(null);
      wpForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '更新失败');
    },
  });

  const deleteWpMutation = useMutation({
    mutationFn: (id: number) => studentApi.deleteWeakPoint(studentId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentWeakPoints', studentId] });
      message.success('薄弱点已删除');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '删除失败');
    },
  });

  const handleWpSubmit = async () => {
    const values = await wpForm.validateFields();
    if (editingWp) {
      updateWpMutation.mutate({ id: editingWp.id, body: values });
    } else {
      createWpMutation.mutate(values);
    }
  };

  const openAddModal = () => {
    setEditingWp(null);
    wpForm.resetFields();
    wpForm.setFieldsValue({ masteryLevel: 'WEAK', subject: student?.currentSubject || '' });
    setWpModalOpen(true);
  };

  const openEditModal = (wp: StudentWeakPoint) => {
    setEditingWp(wp);
    wpForm.setFieldsValue(wp);
    setWpModalOpen(true);
  };

  const masteryColorMap: Record<string, string> = {
    WEAK: 'red',
    MEDIUM: 'orange',
    STRONG: 'green',
  };
  const masteryLabelMap: Record<string, string> = {
    WEAK: '薄弱',
    MEDIUM: '一般',
    STRONG: '掌握',
  };
  const sourceLabelMap: Record<string, string> = {
    ERROR_ANALYSIS: '错题分析',
    MANUAL: '手动录入',
  };

  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <div className="py-4">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="姓名">{student?.name}</Descriptions.Item>
            <Descriptions.Item label="年级">{student?.grade}</Descriptions.Item>
            <Descriptions.Item label="学校">{student?.school || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={student?.status === 'active' ? 'green' : 'orange'}>
                {student?.status === 'active' ? '在读' : '暂停'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="家长姓名">{student?.parentName || '-'}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{student?.parentContact || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {student?.createdAt ? dayjs(student.createdAt).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
          </Descriptions>

          <h3 className="text-base font-semibold mt-6 mb-4 text-gray-700">当前学习目标与进度</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card size="small" title="期中考试目标" className="border-gray-200">
              <div className="text-center py-2">
                <div className="text-2xl font-bold text-indigo-600 mb-2">{student?.midtermTarget || 75}%</div>
                <Progress percent={student?.midtermTarget || 75} showInfo={false} strokeColor="#6366F1" />
              </div>
            </Card>
            <Card size="small" title="知识点掌握度" className="border-gray-200">
              <div className="text-center py-2">
                <div className="text-2xl font-bold text-green-600 mb-2">{student?.knowledgeMastery || 60}%</div>
                <Progress percent={student?.knowledgeMastery || 60} showInfo={false} strokeColor="#10B981" />
              </div>
            </Card>
            <Card size="small" title="作业完成率" className="border-gray-200">
              <div className="text-center py-2">
                <div className="text-2xl font-bold text-amber-600 mb-2">{student?.homeworkCompletion || 85}%</div>
                <Progress percent={student?.homeworkCompletion || 85} showInfo={false} strokeColor="#F59E0B" />
              </div>
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: 'profile',
      label: '学情分析',
      children: (
        <div className="py-4">
          {profile ? (
            <>
              <Descriptions column={2} bordered className="mb-6">
                <Descriptions.Item label="学习基础">
                  <Tag color={
                    profile.academicLevel === 'excellent' ? 'green' :
                    profile.academicLevel === 'good' ? 'blue' :
                    profile.academicLevel === 'medium' ? 'orange' : 'red'
                  }>
                    {profile.academicLevel === 'excellent' ? '优秀' :
                     profile.academicLevel === 'good' ? '良好' :
                     profile.academicLevel === 'medium' ? '中等' : '薄弱'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="学习风格">
                  {profile.learningStyle === 'visual' ? '视觉型' :
                   profile.learningStyle === 'auditory' ? '听觉型' :
                   profile.learningStyle === 'kinesthetic' ? '动觉型' : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="薄弱科目" span={2}>
                  {profile.weakSubjects?.join('、') || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="性格特点" span={2}>
                  {profile.personality?.description || (
                    <>
                      {profile.personality?.introverted && <Tag className="mr-1">内向</Tag>}
                      {profile.personality?.active && <Tag className="mr-1">主动</Tag>}
                      {profile.personality?.cautious && <Tag>谨慎</Tag>}
                    </>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="特殊需求" span={2}>
                  {profile.specialNeeds || '-'}
                </Descriptions.Item>
              </Descriptions>

              <h4 className="text-base font-medium mb-4">教学目标</h4>
              <div className="space-y-4">
                {goals.filter(g => g.goalType === 'short').map(goal => (
                  <Card key={goal.id} size="small">
                    <div className="flex justify-between items-start">
                      <div>
                        <Tag color="green">短期目标</Tag>
                        <p className="mt-2">{goal.description}</p>
                        {goal.targetScore && <span className="text-sm text-gray-500">目标分数：{goal.targetScore}</span>}
                      </div>
                      <Tag color={goal.status === 'achieved' ? 'green' : 'orange'}>
                        {goal.status === 'achieved' ? '已达成' : '进行中'}
                      </Tag>
                    </div>
                  </Card>
                ))}
              </div>

              {/* 薄弱知识点区域 */}
              <div className="flex items-center justify-between mt-8 mb-4">
                <h4 className="text-base font-medium m-0">
                  薄弱知识点
                  <span className="text-sm text-gray-400 ml-2 font-normal">（{weakPoints.length} 条记录）</span>
                </h4>
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddModal}>
                  添加
                </Button>
              </div>

              {weakPoints.length > 0 ? (
                <div className="space-y-3">
                  {weakPoints.map(wp => (
                    <Card key={wp.id} size="small" className="border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800">{wp.knowledgePoint}</span>
                            <Tag color={masteryColorMap[wp.masteryLevel]}>
                              {masteryLabelMap[wp.masteryLevel]}
                            </Tag>
                            <Tag>{wp.subject}</Tag>
                            <Tag color={wp.source === 'ERROR_ANALYSIS' ? 'blue' : 'default'}>
                              {sourceLabelMap[wp.source]}
                            </Tag>
                          </div>
                          <div className="text-xs text-gray-400">
                            发现时间：{dayjs(wp.createdAt).format('YYYY-MM-DD HH:mm')}
                            {wp.notes && <span className="ml-4">备注：{wp.notes}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button type="link" size="small" icon={<EditOutlined />}
                            onClick={() => openEditModal(wp)} />
                          <Popconfirm title="确认删除此薄弱点？" onConfirm={() => deleteWpMutation.mutate(wp.id)}>
                            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert
                  message="暂无薄弱知识点记录"
                  description="尚未记录该学生的薄弱知识点。可以通过「错题拍照分析」自动生成，或点击上方「添加」按钮手动录入。"
                  type="info"
                  showIcon
                />
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              暂无学情信息
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'lessons',
      label: '备课记录',
      children: (
        <div className="py-4">
          {lessons.length > 0 ? (
            <Timeline
              items={lessons.slice(0, 10).map(lesson => ({
                color: lesson.status === 'failed' ? 'gray' : 'blue',
                children: (
                  <div
                    className="cursor-pointer hover:text-primary-600"
                    onClick={() => navigate(`/lessons/${lesson.id}`)}
                  >
                    <div className="font-medium">
                      {lesson.teachingGoal} <Tag>{lesson.subject}</Tag>
                    </div>
                    <div className="text-sm text-gray-500">
                      {dayjs(lesson.createdAt).format('YYYY-MM-DD HH:mm')}
                      <span className="ml-2">
                        {lesson.status === 'completed' ? '已完成' : lesson.status === 'failed' ? '生成失败' : '生成中'}
                      </span>
                    </div>
                  </div>
                ),
              }))}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">
              暂无备课记录
            </div>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-4 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')}>
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold m-0">{student?.name}</h1>
          <span className="text-gray-500 text-sm">{student?.grade} · {student?.currentSubject}</span>
        </div>
        <Button
          type="primary"
          icon={<BookOutlined />}
          onClick={() => navigate(`/lessons/new?studentId=${studentId}`)}
        >
          新建备课
        </Button>
        <Button icon={<EditOutlined />} onClick={() => navigate(`/students/${studentId}/edit`)}>
          编辑
        </Button>
      </div>

      <Card bordered={false} className="shadow-sm">
        <Tabs items={tabItems} />
      </Card>

      {/* 薄弱知识点新增/编辑弹窗 */}
      <Modal
        title={editingWp ? '编辑薄弱知识点' : '添加薄弱知识点'}
        open={wpModalOpen}
        onOk={handleWpSubmit}
        onCancel={() => { setWpModalOpen(false); setEditingWp(null); wpForm.resetFields(); }}
        confirmLoading={createWpMutation.isPending || updateWpMutation.isPending}
      >
        <Form form={wpForm} layout="vertical">
          <Form.Item name="subject" label="学科" rules={[{ required: true, message: '请选择学科' }]}>
            <Select
              options={[
                { value: '语文', label: '语文' },
                { value: '数学', label: '数学' },
                { value: '英语', label: '英语' },
                { value: '物理', label: '物理' },
                { value: '化学', label: '化学' },
                { value: '生物', label: '生物' },
                { value: '历史', label: '历史' },
                { value: '地理', label: '地理' },
                { value: '政治', label: '政治' },
              ]}
            />
          </Form.Item>
          <Form.Item name="knowledgePoint" label="知识点名称" rules={[{ required: true, message: '请输入知识点名称' }]}>
            <Input placeholder="例如：一般过去时的动词变化规则" />
          </Form.Item>
          <Form.Item name="masteryLevel" label="掌握程度" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'WEAK', label: '薄弱' },
                { value: 'MEDIUM', label: '一般' },
                { value: 'STRONG', label: '掌握' },
              ]}
            />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="可选，记录具体情况" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
