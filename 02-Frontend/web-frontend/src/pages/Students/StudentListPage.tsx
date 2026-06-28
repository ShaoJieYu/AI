import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Input, Space, Tag, Avatar, Dropdown, message } from 'antd';
import { PlusOutlined, SearchOutlined, MoreOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modal } from '@/utils/antd';
import { studentApi } from '@/api/student';
import type { Student } from '@/types/student';
import type { ListQueryParams } from '@/types/api';

export default function StudentListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [params, setParams] = useState<ListQueryParams>({
    page: 1,
    pageSize: 10,
    keyword: '',
    status: undefined,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students', params],
    queryFn: () => studentApi.getStudents(params),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentApi.deleteStudent(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  const students = data?.data?.items || [];
  const total = data?.data?.total || 0;

  const columns = [
    {
      title: '学生信息',
      key: 'info',
      render: (_: any, record: Student) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ backgroundColor: '#6366F1' }}>
            {record.name[0]}
          </Avatar>
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-sm text-gray-400">{record.school || '暂无学校信息'}</div>
          </div>
        </div>
      ),
    },
    {
      title: '年级/科目',
      key: 'grade',
      render: (_: any, record: Student) => (
        <div>
          <Tag color="blue">{record.grade}</Tag>
          <span className="ml-1">{record.currentSubject || '-'}</span>
        </div>
      ),
    },
    {
      title: '家长联系',
      key: 'parent',
      render: (_: any, record: Student) => (
        <div>
          <div>{record.parentName || '-'}</div>
          <div className="text-sm text-gray-400">{record.parentContact || ''}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : status === 'paused' ? 'orange' : 'gray'}>
          {status === 'active' ? '在读' : status === 'paused' ? '暂停' : '已结课'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date.split('T')[0],
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Student) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/students/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/students/${record.id}/edit`)}
          />
          <Dropdown
            menu={{
              items: [
                {
                  key: 'lesson',
                  label: '新建备课',
                  onClick: () => navigate(`/lessons/new?studentId=${record.id}`),
                },
                {
                  key: 'delete',
                  label: '删除',
                  danger: true,
                  onClick: () => {
                    modal.confirm({
                      title: '确认删除',
                      content: `确定要删除学生 ${record.name} 吗？此操作不可逆。`,
                      okText: '确认',
                      cancelText: '取消',
                      onOk: () => deleteMutation.mutate(record.id),
                    });
                  },
                },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">学生管理</h1>
          <p className="page-description">管理您的学生信息，了解学习情况</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/students/new')}
          size="large"
        >
          添加学生
        </Button>
      </div>

      <Card variant="borderless" className="shadow-sm">
        <div className="mb-4">
          <Space>
            <Input
              placeholder="搜索学生姓名..."
              prefix={<SearchOutlined />}
              className="w-64"
              onChange={(e) => setParams({ ...params, keyword: e.target.value })}
              allowClear
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={students}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: params.page,
            pageSize: params.pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 名学生`,
            onChange: (page, pageSize) => setParams({ ...params, page, pageSize }),
          }}
        />
      </Card>
    </div>
  );
}
