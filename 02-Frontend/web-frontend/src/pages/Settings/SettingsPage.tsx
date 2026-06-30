import { useState, useEffect } from 'react';
import { Card, Tabs, Form, Input, Button, Avatar, Switch, Select, Upload, Radio, Tag, Spin, message } from 'antd';
import { UserOutlined, LockOutlined, BellOutlined, RobotOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { llmApi } from '@/api/llm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from '@/types/lesson';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [form] = Form.useForm();

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => authApi.updateProfile(data),
    onSuccess: (res) => {
      updateUser(res.data);
      message.success('保存成功');
    },
    onError: () => {
      message.error('保存失败');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(data.oldPassword, data.newPassword),
    onSuccess: () => {
      message.success('密码修改成功');
      form.resetFields();
    },
    onError: () => {
      message.error('密码修改失败');
    },
  });

  // ===== LLM 模型切换 =====
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>();

  const { data: providerRes, isLoading: providerLoading } = useQuery({
    queryKey: ['llmProvider'],
    queryFn: () => llmApi.getProvider(),
  });

  const { data: statusRes, isLoading: statusLoading } = useQuery({
    queryKey: ['llmStatus'],
    queryFn: () => llmApi.getStatus(),
  });

  const providerData = providerRes?.data;
  const statusData = statusRes?.data;

  useEffect(() => {
    if (providerData?.current) {
      setSelectedProvider(providerData.current);
    }
  }, [providerData?.current]);

  const switchProviderMutation = useMutation({
    mutationFn: (provider: string) => llmApi.switchProvider(provider),
    onSuccess: (res) => {
      if (res.data?.success) {
        message.success(res.data?.message || '切换成功');
        queryClient.invalidateQueries({ queryKey: ['llmProvider'] });
        queryClient.invalidateQueries({ queryKey: ['llmStatus'] });
      } else {
        message.error(res.data?.message || '切换失败');
      }
    },
    onError: () => {
      message.error('切换失败');
    },
  });

  const handleSwitchProvider = () => {
    if (selectedProvider && selectedProvider !== providerData?.current) {
      switchProviderMutation.mutate(selectedProvider);
    }
  };

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined className="mr-1" />
          个人资料
        </span>
      ),
      children: (
        <div className="py-6">
          <Form
            layout="vertical"
            initialValues={{
              realName: user?.realName,
              email: user?.email,
              teachingGrades: user?.teachingYears?.split(','),
              teachingSubjects: user?.subjects?.split(','),
            }}
            onFinish={(values) => {
              const data = {
                ...values,
                subjects: values.teachingSubjects?.join(','),
                teachingYears: values.teachingGrades?.join(','),
              };
              updateProfileMutation.mutate(data);
            }}
          >
            <div className="flex items-center gap-6 mb-8">
              <Avatar size={80} src={user?.avatar} icon={<UserOutlined />} />
              <div>
                <Upload showUploadList={false}>
                  <Button>更换头像</Button>
                </Upload>
                <div className="text-sm text-gray-400 mt-2">支持 JPG、PNG 格式，最大 5MB</div>
              </div>
            </div>

            <div className="max-w-md">
              <Form.Item name="realName" label="姓名">
                <Input placeholder="请输入姓名" />
              </Form.Item>

              <Form.Item name="email" label="邮箱">
                <Input placeholder="请输入邮箱" />
              </Form.Item>

              <Form.Item name="phone" label="手机号">
                <Input value={user?.phone} disabled />
              </Form.Item>

              <Form.Item name="teachingGrades" label="可教年级">
                <Select mode="multiple" placeholder="选择可教年级">
                  {GRADE_OPTIONS.map((g) => (
                    <Select.Option key={g} value={g}>{g}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="teachingSubjects" label="可教科目">
                <Select mode="multiple" placeholder="选择可教科目">
                  {SUBJECT_OPTIONS.map((s) => (
                    <Select.Option key={s} value={s}>{s}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={updateProfileMutation.isPending}>
                  保存修改
                </Button>
              </Form.Item>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined className="mr-1" />
          账号安全
        </span>
      ),
      children: (
        <div className="py-6">
          <div className="max-w-md">
            <div className="mb-8">
              <h4 className="text-lg font-medium mb-4">修改密码</h4>
              <Form
                layout="vertical"
                form={form}
                onFinish={(values) => changePasswordMutation.mutate(values)}
              >
                <Form.Item
                  name="oldPassword"
                  label="当前密码"
                  rules={[{ required: true, message: '请输入当前密码' }]}
                >
                  <Input.Password placeholder="请输入当前密码" />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 8, message: '密码至少8位' },
                    { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, message: '密码需包含大小写字母和数字' },
                  ]}
                  hasFeedback
                >
                  <Input.Password placeholder="请输入新密码" />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="确认新密码"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '请确认新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                  hasFeedback
                >
                  <Input.Password placeholder="请再次输入新密码" />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={changePasswordMutation.isPending}>
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </div>

            <div>
              <h4 className="text-lg font-medium mb-4">账号绑定</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">微信</div>
                    <div className="text-sm text-gray-500">已绑定：188****8888</div>
                  </div>
                  <Button>解绑</Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">手机号</div>
                    <div className="text-sm text-gray-500">{user?.phone || '未绑定'}</div>
                  </div>
                  <Button>更换</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'notification',
      label: (
        <span>
          <BellOutlined className="mr-1" />
          通知设置
        </span>
      ),
      children: (
        <div className="py-6">
          <div className="max-w-md space-y-6">
            <div>
              <h4 className="text-lg font-medium mb-4">消息通知</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">课程提醒</div>
                    <div className="text-sm text-gray-500">上课前1小时发送提醒</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">备课完成通知</div>
                    <div className="text-sm text-gray-500">AI备课生成完成时通知</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">系统公告</div>
                    <div className="text-sm text-gray-500">接收系统重要通知</div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'llm',
      label: (
        <span>
          <RobotOutlined className="mr-1" />
          AI 模型
        </span>
      ),
      children: (
        <div className="py-6">
          <div className="max-w-2xl space-y-6">
            {/* 当前模型 */}
            <Card title="当前模型" size="small">
              {statusLoading ? (
                <div className="flex justify-center py-6">
                  <Spin />
                </div>
              ) : statusData ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium">{statusData.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{statusData.description}</div>
                    {statusData.detail ? (
                      <div className="text-xs text-gray-400 mt-1">{statusData.detail}</div>
                    ) : null}
                  </div>
                  <Tag color={statusData.reachable ? 'green' : 'red'}>
                    {statusData.reachable ? '已连接' : '未连接'}
                  </Tag>
                </div>
              ) : (
                <div className="text-sm text-gray-400">暂无状态信息</div>
              )}
            </Card>

            {/* 切换模型 */}
            <Card title="切换模型" size="small">
              {providerLoading ? (
                <div className="flex justify-center py-6">
                  <Spin />
                </div>
              ) : providerData ? (
                <div className="space-y-4">
                  <Radio.Group
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full"
                  >
                    <div className="space-y-3">
                      {Object.entries(providerData.providers).map(([key, info]) => (
                        <div
                          key={key}
                          className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
                            selectedProvider === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <Radio value={key} />
                          <div>
                            <div className="font-medium">{info.label}</div>
                            <div className="text-sm text-gray-500 mt-1">{info.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Radio.Group>
                  {selectedProvider && selectedProvider !== providerData.current && (
                    <Button
                      type="primary"
                      loading={switchProviderMutation.isPending}
                      onClick={handleSwitchProvider}
                    >
                      切换到该模型
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400">暂无可切换的模型</div>
              )}
            </Card>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">设置</h1>
        <p className="page-description">管理您的个人信息和偏好设置</p>
      </div>

      <Card variant="borderless" className="shadow-sm">
        <Tabs tabPosition="left" items={tabItems} />
      </Card>
    </div>
  );
}
