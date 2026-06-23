import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Button, message, Typography, Checkbox } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { registerSchema } from './authSchema';
import type { RegisterSchema } from './authSchema';

const { Text } = Typography;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '至少 8 个字符', ok: password.length >= 8 },
    { label: '大写字母', ok: /[A-Z]/.test(password) },
    { label: '小写字母', ok: /[a-z]/.test(password) },
    { label: '数字', ok: /[0-9]/.test(password) },
  ];
  return (
    <div className="mt-1 flex flex-col gap-1">
      {checks.map((c) => (
        <Text key={c.label} className="text-xs">
          <span className={c.ok ? 'text-green-600' : 'text-slate-400'}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        </Text>
      ))}
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register: registerUser } = useAuth();

  const {
    register: registerField,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', privacyAccepted: false },
  });

  const password = watch('password', '');
  const privacyAccepted = watch('privacyAccepted', false);

  const onSubmit = async (data: RegisterSchema) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        privacyAccepted: data.privacyAccepted,
      });
      message.success('注册成功');
      const redirect = searchParams.get('redirect') || localStorage.getItem('redirectAfterAuth');
      localStorage.removeItem('redirectAfterAuth');
      navigate(redirect || '/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '注册失败，请重试';
      message.error(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold text-navy-950">
            芯茂微 SolutionHub
          </Link>
          <p className="mt-2 text-sm text-slate-500">创建新账户</p>
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
            {password && <PasswordStrength password={password} />}
          </Form.Item>

          <Form.Item
            label="确认密码"
            validateStatus={errors.confirmPassword ? 'error' : ''}
            help={errors.confirmPassword?.message}
          >
            <Input.Password
              {...registerField('confirmPassword')}
              size="large"
              style={{ minHeight: 44 }}
              placeholder=""
            />
          </Form.Item>

          <Form.Item
            validateStatus={errors.privacyAccepted ? 'error' : ''}
            help={errors.privacyAccepted?.message}
          >
            <Controller
              name="privacyAccepted"
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onBlur={field.onBlur}
                  onChange={(event) => field.onChange(event.target.checked)}
                >
                  <Text className="text-sm">我已阅读并同意《隐私政策》</Text>
                </Checkbox>
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
              disabled={!privacyAccepted}
              style={{ minHeight: 44 }}
            >
              注册
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center">
          <Text className="text-sm text-slate-500">
            已有账户？{' '}
            <Link to="/login" className="text-blue-600">
              立即登录
            </Link>
          </Text>
        </div>
      </div>
    </div>
  );
}
