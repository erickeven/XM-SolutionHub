import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Button, message, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema } from './authSchema';
import type { LoginInput } from '../../types/auth';

const { Text } = Typography;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const {
    register: registerField,
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold text-navy-950">
            芯茂微 SolutionHub
          </Link>
          <p className="mt-2 text-sm text-slate-500">登录您的账户</p>
        </div>

        <Form layout="vertical" onFinish={handleSubmit(onSubmit)} autoComplete="off">
          <Form.Item
            label="邮箱"
            validateStatus={errors.email ? 'error' : ''}
            help={errors.email?.message}
          >
            <Input
              {...registerField('email')}
              type="email"
              size="large"
              style={{ minHeight: 44 }}
              placeholder=""
            />
          </Form.Item>

          <Form.Item
            label="密码"
            validateStatus={errors.password ? 'error' : ''}
            help={errors.password?.message}
          >
            <Input.Password
              {...registerField('password')}
              size="large"
              style={{ minHeight: 44 }}
              placeholder=""
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
  );
}