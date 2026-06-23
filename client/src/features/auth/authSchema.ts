import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少 8 个字符'),
});

export const registerSchema = z
  .object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z
      .string()
      .min(8, '密码至少 8 个字符')
      .regex(/[A-Z]/, '需包含至少 1 个大写字母')
      .regex(/[a-z]/, '需包含至少 1 个小写字母')
      .regex(/[0-9]/, '需包含至少 1 个数字'),
    confirmPassword: z.string(),
    privacyAccepted: z.boolean().refine((v) => v === true, {
      message: '请阅读并同意隐私政策',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;