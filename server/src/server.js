import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { ensureStorageDirectories } from './config/storage.js';
import { startJobs, stopJobs } from './jobs/index.js';

let server;
async function bootstrap() {
  await ensureStorageDirectories();
  await connectDatabase();
  server = http.createServer(app);
  server.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, url: `http://localhost:${env.PORT}/api/v1/health` },
      'Server started',
    );
  });
  startJobs();
}
async function shutdown(signal) {
  logger.info({ signal }, 'Graceful shutdown started');
  stopJobs();
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});
bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'Unable to start server');
  process.exit(1);
});
