import { Card, Tabs, Form, Input, Button, Avatar, Switch, Select, Upload, message } from 'antd';
import { UserOutlined, LockOutlined, BellOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { useMutation } from '@tanstack/react-query';
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
