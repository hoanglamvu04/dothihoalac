import { logger } from '../../config/logger.js';
import { runDueSources } from './sourceWatch.service.js';

let timer = null;
let running = false;

function enabled() {
  return String(process.env.SOURCE_WATCH_ENABLED || 'true').trim().toLowerCase() !== 'false';
}

function intervalMs() {
  const seconds = Number(process.env.SOURCE_WATCH_WORKER_INTERVAL_SECONDS || 60);
  const safeSeconds = Number.isFinite(seconds)
    ? Math.max(30, Math.min(300, Math.round(seconds)))
    : 60;
  return safeSeconds * 1000;
}

async function tick() {
  if (running || !enabled()) return;
  running = true;
  try {
    const results = await runDueSources(3);
    const created = results.reduce((sum, item) => sum + Number(item?.created || 0), 0);
    if (results.length || created) {
      logger.info(
        { checkedSources: results.length, createdItems: created },
        'Source Watch tick completed',
      );
    }
  } catch (error) {
    logger.error({ err: error }, 'Source Watch worker tick failed');
  } finally {
    running = false;
  }
}

export function startSourceWatchWorker() {
  if (timer || !enabled() || process.env.NODE_ENV === 'test') return;
  timer = setInterval(tick, intervalMs());
  timer.unref?.();
  setTimeout(tick, 5000).unref?.();
  logger.info(
    { intervalSeconds: intervalMs() / 1000 },
    'Source Watch worker started',
  );
}

export function stopSourceWatchWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
