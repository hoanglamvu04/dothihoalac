import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'development' ? 'debug' : 'info',
  base: { service: 'dothihoalac-api', environment: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'otp',
    ],
    censor: '[REDACTED]',
  },
});
