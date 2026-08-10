import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import {
  claimNextTask,
  completeTask,
  enqueueScheduledScoutIfDue,
  executeTask,
  failTask,
  recoverStaleTasks,
} from './newsroom.service.js';

let timer = null;
let running = false;
let lastRecoveryAt = 0;

async function tick() {
  if (running || !env.NEWSROOM_AI_ENABLED || !env.GEMINI_API_KEY) return;
  running = true;

  try {
    if (Date.now() - lastRecoveryAt > 5 * 60 * 1000) {
      await recoverStaleTasks();
      lastRecoveryAt = Date.now();
    }

    await enqueueScheduledScoutIfDue();

    const task = await claimNextTask();
    if (!task) return;

    try {
      const execution = await executeTask(task);
      await completeTask(task, execution);
      logger.info(
        {
          newsroomTaskId: String(task._id),
          type: task.type,
          storyId: task.storyId ? String(task.storyId) : null,
        },
        'Newsroom AI task completed',
      );
    } catch (error) {
      await failTask(task, error);
      logger.error(
        {
          err: error,
          newsroomTaskId: String(task._id),
          type: task.type,
          storyId: task.storyId ? String(task.storyId) : null,
        },
        'Newsroom AI task failed',
      );
    }
  } catch (error) {
    logger.error({ err: error }, 'Newsroom AI worker tick failed');
  } finally {
    running = false;
  }
}

export function startNewsroomWorker() {
  if (
    timer ||
    !env.NEWSROOM_AI_ENABLED ||
    !env.GEMINI_API_KEY ||
    env.NODE_ENV === 'test'
  ) {
    return;
  }

  const intervalMs = Math.max(5, env.NEWSROOM_WORKER_INTERVAL_SECONDS) * 1000;
  timer = setInterval(tick, intervalMs);
  timer.unref?.();
  setTimeout(tick, 5000).unref?.();

  logger.info(
    {
      intervalSeconds: env.NEWSROOM_WORKER_INTERVAL_SECONDS,
      scoutIntervalMinutes: env.NEWSROOM_SCOUT_INTERVAL_MINUTES,
    },
    'Newsroom AI worker started',
  );
}

export function stopNewsroomWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
