import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Select, message } from 'antd';
import { UserOutlined, LockOutlined, MobileOutlined, SafetyOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import type { RegisterRequest } from '@/types/auth';
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from '@/types/lesson';

export default function RegisterPage() {
  const [form] = Form.useForm();
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

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (response) => {
      login(response.data);
      message.success('注册成功');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '注册失败');
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
    registerMutation.mutate({
      username: values.phone,
      realName: values.realName,
      phone: values.phone,
      code: values.code,
      password: values.password,
      subjects: values.teachingSubjects?.join(','),
      teachingYears: values.teachingGrades?.join(','),
    } as RegisterRequest);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">注册账号</h2>
        <p className="text-gray-500 mt-1">创建您的账号，开始智能备课之旅</p>
      </div>

      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="realName"
          label="姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="请输入姓名"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
          ]}
        >
          <Input
            prefix={<MobileOutlined className="text-gray-400" />}
            placeholder="请输入手机号"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="code"
          label="验证码"
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

        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 8, message: '密码至少8位' },
            { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, message: '密码需包含大小写字母和数字' },
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="请输入密码"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="请再次输入密码"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="teachingGrades"
          label="可教年级"
          rules={[{ required: true, message: '请选择可教年级' }]}
        >
          <Select
            mode="multiple"
            placeholder="请选择可教年级"
            size="large"
            options={GRADE_OPTIONS.map((g) => ({ label: g, value: g }))}
          />
        </Form.Item>

        <Form.Item
          name="teachingSubjects"
          label="可教科目"
          rules={[{ required: true, message: '请选择可教科目' }]}
        >
          <Select
            mode="multiple"
            placeholder="请选择可教科目"
            size="large"
            options={SUBJECT_OPTIONS.map((s) => ({ label: s, value: s }))}
          />
        </Form.Item>

        <Form.Item
          name="agreement"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value ? Promise.resolve() : Promise.reject(new Error('请阅读并同意协议')),
            },
          ]}
        >
          <Checkbox>
            我已阅读并同意
            <a href="/agreement" className="text-primary-600 hover:text-primary-500 ml-1">《用户协议》</a>
            和
            <a href="/privacy" className="text-primary-600 hover:text-primary-500 ml-1">《隐私政策》</a>
          </Checkbox>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={registerMutation.isPending}
          >
            注册
          </Button>
        </Form.Item>
      </Form>

      <div className="text-center text-gray-500">
        已有账号？
        <Link to="/auth/login" className="text-primary-600 hover:text-primary-500 ml-1">
          立即登录
        </Link>
      </div>
    </div>
  );
}
