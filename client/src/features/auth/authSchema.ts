import { z } from 'zod';

type TextResolver = (key: string, fallback: string) => string;
const fallbackText: TextResolver = (_key, fallback) => fallback;

export function createLoginSchema(text: TextResolver = fallbackText) {
  return z.object({
    email: z.string().email(text('auth.validation.email', '请输入有效的邮箱地址')),
    password: z.string().min(8, text('auth.validation.passwordLength', '密码至少 8 个字符')),
  });
}

export const loginSchema = createLoginSchema();

export function createRegisterSchema(text: TextResolver = fallbackText) {
  return z
    .object({
      email: z.string().email(text('auth.validation.email', '请输入有效的邮箱地址')),
      password: z
        .string()
        .min(8, text('auth.validation.passwordLength', '密码至少 8 个字符'))
        .regex(/[A-Z]/, text('auth.validation.uppercase', '需包含至少 1 个大写字母'))
        .regex(/[a-z]/, text('auth.validation.lowercase', '需包含至少 1 个小写字母'))
        .regex(/[0-9]/, text('auth.validation.number', '需包含至少 1 个数字')),
      confirmPassword: z.string(),
      privacyAccepted: z.boolean().refine((value) => value === true, {
        message: text('auth.validation.privacy', '请阅读并同意隐私政策'),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: text('auth.validation.confirmPassword', '两次输入的密码不一致'),
      path: ['confirmPassword'],
    });
}

export const registerSchema = createRegisterSchema();

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
