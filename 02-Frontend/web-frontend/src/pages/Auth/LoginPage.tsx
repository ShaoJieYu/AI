import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Tabs, message } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const [form] = Form.useForm();
  const [loginType, setLoginType] = useState<'password' | 'sms'>('password');
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const sendCodeMutation = useMutation({
    mutationFn: (phone: string) => authApi.sendCode(phone),
    onSuccess: () => {
      message.success('验证码已发送');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: () => {
      message.error('发送验证码失败');
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data: any) => authApi.login(data),
    onSuccess: (response: any) => {
      login(response.data);
      message.success('登录成功');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      message.error(error?.message || error.response?.data?.message || '登录失败');
    },
  });

  const handleSendCode = async () => {
    try {
      const phone = form.getFieldValue('phone');
      if (!phone) {
        message.error('请输入手机号');
        return;
      }
      sendCodeMutation.mutate(phone);
    } catch (error) {
      console.error('Send code error:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    loginMutation.mutate({
      username: values.phone,
      password: values.password,
      type: loginType,
    } as any);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">登录账号</h2>
        <p className="text-gray-500 mt-1">欢迎回来！请登录您的账号</p>
      </div>

      <Tabs
        activeKey={loginType}
        onChange={(key) => setLoginType(key as 'password' | 'sms')}
        centered
        items={[
          {
            key: 'password',
            label: '密码登录',
          },
          {
            key: 'sms',
            label: '验证码登录',
          },
        ]}
      />

      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={false}
        initialValues={{ remember: true }}
      >
        <Form.Item
          name="phone"
          rules={[
            { required: true, message: '请输入手机号或账号' }
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="请输入手机号或账号"
            size="large"
          />
        </Form.Item>

        {loginType === 'password' ? (
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="请输入密码"
              size="large"
            />
          </Form.Item>
        ) : (
          <Form.Item
            name="code"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <div className="flex gap-2">
              <Input
                prefix={<SafetyOutlined className="text-gray-400" />}
                placeholder="请输入验证码"
                size="large"
                className="flex-1"
              />
              <Button
                size="large"
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Button>
            </div>
          </Form.Item>
        )}

        <div className="flex items-center justify-between mb-6">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>记住我</Checkbox>
          </Form.Item>
          <Link to="/auth/forgot-password" className="text-primary-600 hover:text-primary-500">
            忘记密码？
          </Link>
        </div>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loginMutation.isPending}
          >
            登录
          </Button>
        </Form.Item>
      </Form>

      <div className="text-center text-gray-500">
        还没有账号？
        <Link to="/auth/register" className="text-primary-600 hover:text-primary-500 ml-1">
          立即注册
        </Link>
      </div>
    </div>
  );
}
