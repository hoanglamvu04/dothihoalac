import 'dotenv/config';
import { z } from 'zod';

const boolFromString = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}, z.boolean());

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    APP_URL: z.string().default('http://localhost:5173'),
    MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/dothihoalac'),
    JWT_ACCESS_SECRET: z.string().min(16).default('dev_access_secret_change_me_123456789'),
    JWT_REFRESH_SECRET: z.string().min(16).default('dev_refresh_secret_change_me_123456789'),
    JWT_ACCESS_EXPIRES: z.string().default('15m'),
    JWT_REFRESH_EXPIRES: z.string().default('30d'),
    COOKIE_SECURE: boolFromString.default(false),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional().default(''),
    SMTP_HOST: z.string().optional().default(''),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: boolFromString.default(false),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASS: z.string().optional().default(''),
    MAIL_FROM: z.string().default('no-reply@dothihoalac.vn'),
    SMS_PROVIDER: z.string().default('none'),
    SMS_API_KEY: z.string().optional().default(''),
    SMS_BRANDNAME: z.string().optional().default(''),
    UPLOAD_PROVIDER: z.enum(['local']).default('local'),
    UPLOAD_DIR: z.string().default('uploads'),
    MAX_IMAGE_SIZE_MB: z.coerce.number().positive().default(10),
    MAX_VIDEO_SIZE_MB: z.coerce.number().positive().default(100),
    ADMIN_EMAIL: z.string().email().default('admin@dothihoalac.vn'),
    ADMIN_PASSWORD: z.string().min(8).default('change_me_admin_password'),
    EXPOSE_DEV_TOKENS: boolFromString.default(true),
    USERNAME_CHANGE_COOLDOWN_DAYS: z.coerce.number().int().min(0).default(30),
    PROPERTY_DEFAULT_EXPIRE_DAYS: z.coerce.number().int().positive().default(30),
    JOB_DEFAULT_EXPIRE_DAYS: z.coerce.number().int().positive().default(30),
    SCHEDULER_ENABLED: boolFromString.default(true),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
      if (
        value.JWT_ACCESS_SECRET.includes('change_me') ||
        value.JWT_ACCESS_SECRET.includes('dev_')
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_ACCESS_SECRET'],
          message: 'Production access secret is unsafe.',
        });
      }
      if (
        value.JWT_REFRESH_SECRET.includes('change_me') ||
        value.JWT_REFRESH_SECRET.includes('dev_')
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_REFRESH_SECRET'],
          message: 'Production refresh secret is unsafe.',
        });
      }
      if (!value.COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production.',
        });
      }
    }
  });

const result = schema.safeParse(process.env);
if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = Object.freeze(result.data);
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
