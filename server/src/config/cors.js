import { env } from './env.js';
import ApiError from '../utils/ApiError.js';

const allowedOrigins = env.CLIENT_URL.split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new ApiError(403, 'Origin is not allowed by CORS.', 'CORS_ORIGIN_DENIED'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
};
