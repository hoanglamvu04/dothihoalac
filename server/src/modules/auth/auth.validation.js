import { z } from 'zod';

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(4)
  .max(30)
  .regex(/^[a-z0-9._]+$/, 'Tên người dùng chỉ gồm chữ không dấu, số, dấu chấm và gạch dưới.');
const password = z.string().min(8).max(128);
const emptyParams = z.object({}).passthrough();
const emptyQuery = z.object({}).passthrough();
const wrap = (body) => z.object({ body, params: emptyParams, query: emptyQuery });

export const registerSchema = wrap(
  z
    .object({
      email: z.email().transform((v) => v.toLowerCase()),
      username,
      displayName: z.string().trim().min(2).max(80),
      password,
      confirmPassword: password,
      acceptTerms: z.literal(true),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ['confirmPassword'],
      message: 'Mật khẩu xác nhận không khớp.',
    }),
);

export const loginSchema = wrap(
  z.object({ identifier: z.string().trim().min(3), password: z.string().min(1) }),
);
export const verifyCodeSchema = wrap(z.object({ code: z.string().regex(/^\d{6}$/) }));
export const requestPhoneSchema = wrap(z.object({ phone: z.string().trim().min(9).max(20) }));
export const confirmPhoneSchema = wrap(
  z.object({ phone: z.string().trim().min(9).max(20), code: z.string().regex(/^\d{6}$/) }),
);
export const forgotPasswordSchema = wrap(
  z.object({ email: z.email().transform((v) => v.toLowerCase()) }),
);
export const resetPasswordSchema = wrap(
  z
    .object({ token: z.string().min(20), newPassword: password, confirmPassword: password })
    .refine((v) => v.newPassword === v.confirmPassword, {
      path: ['confirmPassword'],
      message: 'Mật khẩu xác nhận không khớp.',
    }),
);
export const changePasswordSchema = wrap(
  z
    .object({
      currentPassword: z.string().min(1),
      newPassword: password,
      confirmPassword: password,
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      path: ['confirmPassword'],
      message: 'Mật khẩu xác nhận không khớp.',
    }),
);
