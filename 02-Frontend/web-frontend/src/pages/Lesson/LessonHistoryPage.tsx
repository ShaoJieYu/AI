import { useNavigate } from 'react-router-dom';
import { Table, Card, Input, Select, Tag, Button, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { lessonApi } from '@/api/lesson';
import type { LessonPlan } from '@/types/lesson';
import { LESSON_MODE_LABELS } from '@/types/lesson';
import type { ListQueryParams } from '@/types/api';
import dayjs from 'dayjs';

export default function LessonHistoryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ListQueryParams>({
    page: 1,
    pageSize: 10,
    keyword: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['lessons', params],
    queryFn: () => lessonApi.getLessons(params),
  });

  const lessons = data?.data?.items || [];
  const total = data?.data?.total || 0;

  const columns = [
    {
      title: '备课主题',
      key: 'teachingGoal',
      render: (_: any, record: LessonPlan) => (
        <div>
          <div
            className="font-medium text-primary-600 cursor-pointer hover:underline"
            onClick={() => navigate(`/lessons/${record.id}`)}
          >
            {record.teachingGoal}
          </div>
          <div className="text-sm text-gray-500">
            {record.grade} · {record.subject}
          </div>
        </div>
      ),
    },
    {
      title: '模式',
      dataIndex: 'generateType',
      key: 'generateType',
      render: (mode: string) => (
        <Tag color="purple">{LESSON_MODE_LABELS[mode as keyof typeof LESSON_MODE_LABELS] || mode}</Tag>
      ),
    },
    {
      title: '时长',
      dataIndex: 'estimatedDuration',
      key: 'estimatedDuration',
      render: (duration: string) => duration ? `${duration}分钟` : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : status === 'failed' ? 'red' : 'orange'}>
          {status === 'completed' ? '已完成' : status === 'failed' ? '生成失败' : '生成中'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: LessonPlan) => (
        <Space>
          <Button
            type="link"
            onClick={() => navigate(`/lessons/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            onClick={() => navigate(`/lessons/new?studentId=${record.studentId}`)}
          >
            再备一课
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">备课历史</h1>
          <p className="page-description">查看和管理您的备课记录</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/lessons/new')}
          size="large"
        >
          新建备课
        </Button>
      </div>

      <Card variant="borderless" className="shadow-sm">
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="搜索备课主题..."
            prefix={<SearchOutlined />}
            className="w-64"
            onChange={(e) => setParams({ ...params, keyword: e.target.value })}
            allowClear
          />
          <Select
            placeholder="备课模式"
            className="w-32"
            allowClear
            onChange={(value) => setParams({ ...params, mode: value })}
            options={Object.entries(LESSON_MODE_LABELS).map(([key, label]) => ({
              label,
              value: key,
            }))}
          />
          <Select
            placeholder="状态"
            className="w-24"
            allowClear
            onChange={(value) => setParams({ ...params, status: value })}
            options={[
              { label: '生成中', value: 'generating' },
              { label: '已完成', value: 'completed' },
              { label: '生成失败', value: 'failed' },
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={lessons}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: params.page,
            pageSize: params.pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => setParams({ ...params, page, pageSize }),
          }}
        />
      </Card>
    </div>
  );
}
