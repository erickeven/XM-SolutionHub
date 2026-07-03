import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Button, message, Typography, Checkbox } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
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
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-8">
      <div className="grid w-full max-w-[980px] gap-6 md:grid-cols-[1fr_440px] md:items-center">
        <div className="hidden text-white md:block">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeftOutlined /> 返回首页
          </Link>
          <div className="mt-10 section-kicker text-copper-400">CREATE ACCOUNT</div>
          <h1 className="mt-3 text-[34px] font-bold leading-tight">
            注册后查看完整方案资料
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            账户用于资料预览、下载审计、AI 问答与线索跟进，敏感令牌通过服务端 Cookie 策略保护。
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
            <SafetyCertificateOutlined className="text-copper-400" />
            注册即记录隐私版本和同意时间
          </div>
        </div>

        <div className="surface-card w-full p-7 shadow-soft md:p-8">
          <div className="mb-6">
            <Link to="/" className="text-xl font-bold text-navy-950 md:hidden">
              芯茂微
            </Link>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:mt-0">注册</h2>
            <p className="mt-1 text-sm text-slate-500">创建新账户解锁完整资料下载与 AI 问答</p>
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
                  placeholder="至少 8 个字符"
                />
              )}
            />
            {password && <PasswordStrength password={password} />}
          </Form.Item>

          <Form.Item
            label="确认密码"
            validateStatus={errors.confirmPassword ? 'error' : ''}
            help={errors.confirmPassword?.message}
          >
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  size="large"
                  style={{ minHeight: 44 }}
                  placeholder="再次输入密码"
                />
              )}
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
    </div>
  );
}
