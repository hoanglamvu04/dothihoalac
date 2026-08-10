import 'dotenv/config';
import { z } from 'zod';

const boolFromString = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  return ['true', '1', 'yes', 'on'].includes(
    value.trim().toLowerCase(),
  );
}, z.boolean());

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  },
  z.string().url().optional(),
);

const schema = z
  .object({
    // =====================================================
    // APPLICATION
    // =====================================================

    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    PORT: z.coerce
      .number()
      .int()
      .positive()
      .default(5000),

    CLIENT_URL: z
      .string()
      .url()
      .default('http://localhost:5173'),

    APP_URL: z
      .string()
      .url()
      .default('http://localhost:5000'),

    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173'),

    // =====================================================
    // DATABASE
    // =====================================================

    MONGO_URI: z
      .string()
      .min(1)
      .default(
        'mongodb://127.0.0.1:27017/dothihoalac',
      ),

    // =====================================================
    // JWT
    // =====================================================

    JWT_ACCESS_SECRET: z
      .string()
      .min(32, 'JWT_ACCESS_SECRET must have at least 32 characters.'),

    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must have at least 32 characters.'),

    JWT_ACCESS_EXPIRES: z
      .string()
      .default('15m'),

    JWT_REFRESH_EXPIRES: z
      .string()
      .default('30d'),

    // =====================================================
    // COOKIE
    // =====================================================

    COOKIE_SECURE: boolFromString.default(false),

    COOKIE_SAME_SITE: z
      .enum(['lax', 'strict', 'none'])
      .default('lax'),

    COOKIE_DOMAIN: z
      .string()
      .optional()
      .default(''),

    ACCESS_COOKIE_NAME: z
      .string()
      .default('dthl_access_token'),

    REFRESH_COOKIE_NAME: z
      .string()
      .default('dthl_refresh_token'),

    // =====================================================
    // EMAIL
    // =====================================================

    SMTP_HOST: z
      .string()
      .optional()
      .default(''),

    SMTP_PORT: z.coerce
      .number()
      .int()
      .positive()
      .default(587),

    SMTP_SECURE: boolFromString.default(false),

    SMTP_USER: z
      .string()
      .optional()
      .default(''),

    SMTP_PASS: z
      .string()
      .optional()
      .default(''),

    MAIL_FROM_NAME: z
      .string()
      .default('Do Thi Hoa Lac'),

    MAIL_FROM: z
      .string()
      .email()
      .default('no-reply@dothihoalac.vn'),

    // =====================================================
    // SMS
    // =====================================================

    SMS_PROVIDER: z
      .string()
      .default('none'),

    SMS_API_KEY: z
      .string()
      .optional()
      .default(''),

    SMS_SECRET_KEY: z
      .string()
      .optional()
      .default(''),

    SMS_BRANDNAME: z
      .string()
      .optional()
      .default(''),

    // =====================================================
    // STORAGE / CLOUDINARY
    // =====================================================

    UPLOAD_PROVIDER: z
      .enum(['local', 'cloudinary'])
      .default('cloudinary'),

    UPLOAD_DIR: z
      .string()
      .default('uploads'),

    UPLOAD_BASE_URL: optionalUrl,

    CLOUDINARY_URL: z
      .string()
      .optional()
      .default(''),

    CLOUDINARY_FOLDER: z
      .string()
      .min(1)
      .default('dothihoalac'),

    MAX_IMAGE_SIZE_MB: z.coerce
      .number()
      .positive()
      .default(10),

    MAX_VIDEO_SIZE_MB: z.coerce
      .number()
      .positive()
      .default(100),

    MAX_IMAGES_PER_CONTENT: z.coerce
      .number()
      .int()
      .positive()
      .max(50)
      .default(20),

    // =====================================================
    // ADMIN
    // =====================================================

    ADMIN_EMAIL: z
      .string()
      .email()
      .default('admin@dothihoalac.vn'),

    ADMIN_PASSWORD: z
      .string()
      .min(12, 'ADMIN_PASSWORD must have at least 12 characters.'),

    // =====================================================
    // GOOGLE WORKSPACE / DOCS
    // =====================================================

    GOOGLE_PROJECT_ID: z
      .string()
      .optional()
      .default(''),

    GOOGLE_OAUTH_CLIENT_ID: z
      .string()
      .optional()
      .default(''),

    GOOGLE_OAUTH_CLIENT_SECRET: z
      .string()
      .optional()
      .default(''),

    GOOGLE_OAUTH_REDIRECT_URI: z
      .string()
      .optional()
      .default(''),

    GOOGLE_WORKSPACE_ALLOWED_DOMAIN: z
      .string()
      .optional()
      .default(''),

    GOOGLE_TOKEN_ENCRYPTION_KEY: z
      .string()
      .optional()
      .default(''),

    // =====================================================
    // NEWSROOM AI / GEMINI
    // =====================================================

    GEMINI_API_KEY: z
      .string()
      .optional()
      .default(''),

    GEMINI_SCOUT_MODEL: z
      .string()
      .default('gemini-3.5-flash-lite'),

    GEMINI_RESEARCH_MODEL: z
      .string()
      .default('gemini-3.5-flash'),

    GEMINI_EDITOR_MODEL: z
      .string()
      .default('gemini-3.5-flash'),

    GEMINI_WRITER_MODEL: z
      .string()
      .default('gemini-3.5-flash'),

    GEMINI_FACTCHECK_MODEL: z
      .string()
      .default('gemini-3.5-flash'),

    NEWSROOM_AI_ENABLED: boolFromString.default(false),

    NEWSROOM_SCOUT_INTERVAL_MINUTES: z.coerce
      .number()
      .int()
      .min(10)
      .max(1440)
      .default(30),

    NEWSROOM_WORKER_INTERVAL_SECONDS: z.coerce
      .number()
      .int()
      .min(5)
      .max(300)
      .default(10),

    NEWSROOM_GEMINI_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(10000)
      .max(300000)
      .default(90000),

    NEWSROOM_SCOUT_ITEMS_PER_QUERY: z.coerce
      .number()
      .int()
      .min(3)
      .max(20)
      .default(8),

    NEWSROOM_MAX_CANDIDATES_PER_RUN: z.coerce
      .number()
      .int()
      .min(5)
      .max(100)
      .default(40),

    NEWSROOM_MAX_RESEARCH_PER_RUN: z.coerce
      .number()
      .int()
      .min(1)
      .max(30)
      .default(8),

    NEWSROOM_MIN_SCOUT_SCORE: z.coerce
      .number()
      .int()
      .min(0)
      .max(20)
      .default(9),

    NEWSROOM_MIN_FACT_SCORE: z.coerce
      .number()
      .int()
      .min(0)
      .max(10)
      .default(9),

    NEWSROOM_MIN_ORIGINALITY_SCORE: z.coerce
      .number()
      .int()
      .min(0)
      .max(10)
      .default(9),

    NEWSROOM_MIN_EDITORIAL_SCORE: z.coerce
      .number()
      .int()
      .min(0)
      .max(10)
      .default(8),

    NEWSROOM_TASK_LOCK_MINUTES: z.coerce
      .number()
      .int()
      .min(2)
      .max(120)
      .default(15),

    NEWSROOM_SCOUT_QUERIES: z
      .string()
      .optional()
      .default(''),

    // =====================================================
    // DEVELOPMENT / LOGGING
    // =====================================================

    EXPOSE_DEV_TOKENS: boolFromString.default(false),

    LOG_LEVEL: z
      .enum([
        'fatal',
        'error',
        'warn',
        'info',
        'debug',
        'trace',
        'silent',
      ])
      .default('info'),

    TRUST_PROXY: boolFromString.default(false),

    // =====================================================
    // RATE LIMIT
    // =====================================================

    RATE_LIMIT_WINDOW_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .default(15),

    RATE_LIMIT_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .positive()
      .default(300),

    AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .positive()
      .default(20),

    OTP_RATE_LIMIT_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .positive()
      .default(5),

    // =====================================================
    // BUSINESS RULES
    // =====================================================

    USERNAME_CHANGE_COOLDOWN_DAYS: z.coerce
      .number()
      .int()
      .min(0)
      .default(30),

    PROPERTY_DEFAULT_EXPIRE_DAYS: z.coerce
      .number()
      .int()
      .positive()
      .default(30),

    JOB_DEFAULT_EXPIRE_DAYS: z.coerce
      .number()
      .int()
      .positive()
      .default(30),

    SCHEDULER_ENABLED: boolFromString.default(true),
  })
  .superRefine((value, ctx) => {
    if (
      value.UPLOAD_PROVIDER === 'cloudinary' &&
      !value.CLOUDINARY_URL
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['CLOUDINARY_URL'],
        message:
          'CLOUDINARY_URL is required when UPLOAD_PROVIDER=cloudinary.',
      });
    }

    if (
      value.NEWSROOM_AI_ENABLED &&
      !value.GEMINI_API_KEY
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['GEMINI_API_KEY'],
        message:
          'GEMINI_API_KEY is required when NEWSROOM_AI_ENABLED=true.',
      });
    }

    if (
      value.COOKIE_SAME_SITE === 'none' &&
      !value.COOKIE_SECURE
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message:
          'COOKIE_SECURE must be true when COOKIE_SAME_SITE=none.',
      });
    }

    if (value.NODE_ENV === 'production') {
      const unsafeSecretPatterns = [
        'change_me',
        'dev_',
        'replace_with',
      ];

      const hasUnsafePattern = (secret) =>
        unsafeSecretPatterns.some((pattern) =>
          secret.toLowerCase().includes(pattern),
        );

      if (hasUnsafePattern(value.JWT_ACCESS_SECRET)) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_ACCESS_SECRET'],
          message: 'Production access secret is unsafe.',
        });
      }

      if (hasUnsafePattern(value.JWT_REFRESH_SECRET)) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_REFRESH_SECRET'],
          message: 'Production refresh secret is unsafe.',
        });
      }

      if (hasUnsafePattern(value.ADMIN_PASSWORD)) {
        ctx.addIssue({
          code: 'custom',
          path: ['ADMIN_PASSWORD'],
          message: 'Production admin password is unsafe.',
        });
      }

      if (!value.COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message:
            'COOKIE_SECURE must be true in production.',
        });
      }

      if (value.EXPOSE_DEV_TOKENS) {
        ctx.addIssue({
          code: 'custom',
          path: ['EXPOSE_DEV_TOKENS'],
          message:
            'EXPOSE_DEV_TOKENS must be false in production.',
        });
      }

      if (value.UPLOAD_PROVIDER === 'local') {
        ctx.addIssue({
          code: 'custom',
          path: ['UPLOAD_PROVIDER'],
          message:
            'Local uploads are not recommended in production. Use cloudinary.',
        });
      }
    }
  });

const result = schema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => {
      const path = issue.path.length
        ? issue.path.join('.')
        : 'environment';

      return `${path}: ${issue.message}`;
    })
    .join('\n');

  throw new Error(
    `Invalid environment configuration:\n${details}`,
  );
}

export const env = Object.freeze(result.data);

export const isProduction =
  env.NODE_ENV === 'production';

export const isDevelopment =
  env.NODE_ENV === 'development';

export const isTest =
  env.NODE_ENV === 'test';
