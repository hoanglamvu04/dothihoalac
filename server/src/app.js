import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { corsOptions } from './config/cors.js';
import { logger } from './config/logger.js';
import apiRoutes from './routes/index.js';

import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import { notFoundMiddleware } from './middlewares/notFound.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  /*
   * Render đặt ứng dụng phía sau reverse proxy.
   * Cần trust proxy để đọc đúng IP, HTTPS và secure cookie.
   */
  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
    }),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  app.use(cors(corsOptions));
  app.use(compression());
  app.use(cookieParser());

  /*
   * Chỉ áp dụng cho JSON và form URL-encoded.
   * Upload multipart/form-data được Multer xử lý riêng.
   */
  app.use(
    express.json({
      limit: '2mb',
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '2mb',
    }),
  );

  /*
   * Không cần express.static('/uploads') khi toàn bộ media
   * được lưu và phân phối qua Cloudinary.
   */
  app.use('/api/v1', apiLimiter, apiRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

const app = createApp();

export default app;