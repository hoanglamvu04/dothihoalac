import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { publishScheduledContent } from './publishScheduledContent.job.js';
import { expirePropertyListings } from './expirePropertyListings.job.js';
import { expireJobPosts } from './expireJobPosts.job.js';
import { cleanupTokens } from './cleanupTokens.job.js';
import { cleanupMedia } from './cleanupMedia.job.js';
import {
  startNewsroomWorker,
  stopNewsroomWorker,
} from '../modules/newsroom/newsroom.worker.js';

let timer = null;

export function startJobs() {
  // Newsroom AI có cờ bật/tắt riêng. Không để SCHEDULER_ENABLED của
  // các job housekeeping làm task Scout nằm queue mãi.
  startNewsroomWorker();

  if (!env.SCHEDULER_ENABLED || env.NODE_ENV === 'test') {
    if (!env.SCHEDULER_ENABLED && env.NODE_ENV !== 'test') {
      logger.info('Housekeeping scheduler disabled; Newsroom worker remains independently controlled.');
    }
    return;
  }

  const run = async () => {
    try {
      await publishScheduledContent();
      await expirePropertyListings();
      await expireJobPosts();
      await cleanupTokens();
      await cleanupMedia();
    } catch (error) {
      logger.error({ err: error }, 'Scheduled jobs failed');
    }
  };

  timer = setInterval(run, 5 * 60 * 1000);
  timer.unref?.();
  setTimeout(run, 3000).unref?.();

  logger.info('Background jobs started');
}

export function stopJobs() {
  if (timer) clearInterval(timer);
  timer = null;
  stopNewsroomWorker();
}
