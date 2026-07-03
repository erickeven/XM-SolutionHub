import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Button, message, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema } from './authSchema';
import type { LoginInput } from '../../types/auth';

const { Text } = Typography;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data);
      message.success('登录成功');
      const redirect = searchParams.get('redirect') || localStorage.getItem('redirectAfterAuth');
      localStorage.removeItem('redirectAfterAuth');
      navigate(redirect || '/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败，请重试';
      message.error(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-8">
      <div className="grid w-full max-w-[960px] gap-6 md:grid-cols-[1fr_420px] md:items-center">
        <div className="hidden text-white md:block">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeftOutlined /> 返回首页
          </Link>
          <div className="mt-10 section-kicker text-copper-400">ACCOUNT ACCESS</div>
          <h1 className="mt-3 text-[34px] font-bold leading-tight">
            登录芯茂微资料与选型工作台
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            登录后可继续使用 AI 技术问答、查看完整资料权限，并保留选型与线索上下文。
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
            <SafetyCertificateOutlined className="text-copper-400" />
            Refresh Token 使用 HttpOnly Cookie 轮换保护
          </div>
        </div>

        <div className="surface-card w-full p-7 shadow-soft md:p-8">
          <div className="mb-6">
            <Link to="/" className="text-xl font-bold text-navy-950 md:hidden">
              芯茂微
            </Link>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:mt-0">登录</h2>
            <p className="mt-1 text-sm text-slate-500">使用您的账户继续</p>
          </div>

          <Form layout="vertical" onFinish={handleSubmit(onSubmit)} autoComplete="off">
          <Form.Item
            label="邮箱"
            validateStatus={errors.email ? 'error' : ''}
            help={errors.email?.message}
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  size="large"
                  style={{ minHeight: 44 }}
                  placeholder="name@example.com"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="密码"
            validateStatus={errors.password ? 'error' : ''}
            help={errors.password?.message}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  size="large"
                  style={{ minHeight: 44 }}
                  placeholder="请输入密码"
                />
              )}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isSubmitting}
              style={{ minHeight: 44 }}
            >
              登录
            </Button>
          </Form.Item>
          </Form>

          <div className="text-center">
            <Text className="text-sm text-slate-500">
              还没有账户？{' '}
              <Link to="/register" className="text-blue-600">
                立即注册
              </Link>
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
