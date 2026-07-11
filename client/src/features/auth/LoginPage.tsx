import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Button, message, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { createLoginSchema } from './authSchema';
import type { LoginInput } from '../../types/auth';
import { useUiContent } from '../../api/ui-content';

const { Text } = Typography;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { text } = useUiContent();
  const validationSchema = useMemo(() => createLoginSchema(text), [text]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(validationSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data);
      message.success(text('auth.login.success', '登录成功'));
      const redirect = searchParams.get('redirect') || localStorage.getItem('redirectAfterAuth');
      localStorage.removeItem('redirectAfterAuth');
      navigate(redirect || '/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : text('auth.login.failed', '登录失败，请重试');
      message.error(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-8">
      <div className="grid w-full max-w-[960px] gap-6 md:grid-cols-[1fr_420px] md:items-center">
        <div className="hidden text-white md:block">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeftOutlined /> {text('auth.backHome', '返回首页')}
          </Link>
          <div className="mt-10 section-kicker text-copper-400">{text('auth.login.kicker', 'ACCOUNT ACCESS')}</div>
          <h1 className="mt-3 text-[34px] font-bold leading-tight">
            {text('auth.login.heroTitle', '登录芯茂微资料与选型工作台')}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            {text('auth.login.heroSubtitle', '登录后可继续使用 AI 技术问答、查看完整资料权限，并保留选型与线索上下文。')}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
            <SafetyCertificateOutlined className="text-copper-400" />
            {text('auth.login.security', 'Refresh Token 使用 HttpOnly Cookie 轮换保护')}
          </div>
        </div>

        <div className="surface-card w-full p-7 shadow-soft md:p-8">
          <div className="mb-6">
            <Link to="/" className="text-xl font-bold text-navy-950 md:hidden">
              {text('brand.name', '芯茂微')}
            </Link>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:mt-0">{text('auth.login', '登录')}</h2>
            <p className="mt-1 text-sm text-slate-500">{text('auth.login.subtitle', '使用您的账户继续')}</p>
          </div>

          <Form layout="vertical" onFinish={handleSubmit(onSubmit)} autoComplete="off">
          <Form.Item
            label={text('auth.field.email', '邮箱')}
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
            label={text('auth.field.password', '密码')}
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
                  placeholder={text('auth.field.password.placeholder', '请输入密码')}
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
              {text('auth.login', '登录')}
            </Button>
          </Form.Item>
          </Form>

          <div className="text-center">
            <Text className="text-sm text-slate-500">
              {text('auth.login.noAccount', '还没有账户？')}{' '}
              <Link to="/register" className="text-blue-600">
                {text('auth.login.registerNow', '立即注册')}
              </Link>
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
