import { env } from './env.js';
import ApiError from '../utils/ApiError.js';

function normalizeOrigin(value = '') {
  return String(value)
    .trim()
    .replace(/\/+$/, '');
}

function parseOrigins(value = '') {
  return String(value)
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

const allowedOrigins = new Set([
  ...parseOrigins(env.CLIENT_URL),
  ...parseOrigins(process.env.CORS_ORIGINS),
]);

function isLocalDevelopmentOrigin(origin) {
  if (env.NODE_ENV !== 'development') {
    return false;
  }

  try {
    const url = new URL(origin);

    const isLocalHost = [
      'localhost',
      '127.0.0.1',
    ].includes(url.hostname);

    return (
      url.protocol === 'http:' &&
      isLocalHost
    );
  } catch {
    return false;
  }
}

export const corsOptions = {
  origin(origin, callback) {
    /*
     * Cho phép request không có Origin:
     * Postman, curl, Render health check,
     * server-to-server.
     */
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin =
      normalizeOrigin(origin);

    const isConfiguredOrigin =
      allowedOrigins.has(normalizedOrigin);

    const isAllowedLocalOrigin =
      isLocalDevelopmentOrigin(
        normalizedOrigin,
      );

    if (
      isConfiguredOrigin ||
      isAllowedLocalOrigin
    ) {
      return callback(null, true);
    }

    console.warn(
      `[CORS] Blocked origin: ${origin}`,
    );

    console.warn(
      '[CORS] Allowed origins:',
      Array.from(allowedOrigins),
    );

    return callback(
      new ApiError(
        403,
        `Origin is not allowed by CORS: ${origin}`,
        'CORS_ORIGIN_DENIED',
      ),
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Accept',
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'X-Requested-With',
  ],

  exposedHeaders: [
    'X-Request-Id',
  ],

  optionsSuccessStatus: 204,

  maxAge: 86400,
};