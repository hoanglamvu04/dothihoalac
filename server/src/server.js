import http from 'node:http';

import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { ensureStorageDirectories } from './config/storage.js';
import { startJobs, stopJobs } from './jobs/index.js';

let server = null;
let activePort = null;

const DEV_PORT_SCAN_LIMIT = 20;

function listenOnPort(port) {
  return new Promise((resolve, reject) => {
    const candidate = http.createServer(app);

    const handleError = (error) => {
      candidate.removeListener('listening', handleListening);

      if (error?.code === 'EADDRINUSE') {
        resolve({ server: null, port, portInUse: true });
        return;
      }

      reject(error);
    };

    const handleListening = () => {
      candidate.removeListener('error', handleError);
      resolve({ server: candidate, port, portInUse: false });
    };

    candidate.once('error', handleError);
    candidate.once('listening', handleListening);
    candidate.listen(port);
  });
}

async function startHttpServer(startPort) {
  const attempts = env.NODE_ENV === 'development' ? DEV_PORT_SCAN_LIMIT : 1;

  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;

    if (port > 65535) break;

    const result = await listenOnPort(port);

    if (!result.portInUse) return result;

    if (offset < attempts - 1) {
      logger.warn(
        { port, nextPort: port + 1 },
        `Port ${port} is already in use. Trying port ${port + 1}...`,
      );
    }
  }

  const endPort = Math.min(65535, startPort + attempts - 1);

  if (attempts === 1) {
    throw new Error(`Port ${startPort} is already in use.`);
  }

  throw new Error(`Unable to find an available port between ${startPort} and ${endPort}.`);
}

async function bootstrap() {
  await ensureStorageDirectories();
  await connectDatabase();

  const result = await startHttpServer(env.PORT);
  server = result.server;
  activePort = result.port;

  process.env.DTHL_ACTIVE_PORT = String(activePort);

  server.on('error', (error) => {
    logger.error({ err: error, port: activePort }, 'HTTP server error');
  });

  logger.info(
    {
      requestedPort: env.PORT,
      port: activePort,
      url: `http://localhost:${activePort}/api/v1/health`,
    },
    'Server started',
  );

  startJobs();
}

async function shutdown(signal) {
  logger.info({ signal, port: activePort }, 'Graceful shutdown started');
  stopJobs();

  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }

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
