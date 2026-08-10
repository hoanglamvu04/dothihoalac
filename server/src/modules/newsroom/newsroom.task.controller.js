import NewsroomTask from './newsroom.task.model.js';
import { sendSuccess } from '../../utils/apiResponse.js';

const TASK_STATUSES = new Set([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

const TASK_TYPES = new Set([
  'SCOUT',
  'RESEARCH',
  'EDITOR',
  'WRITE',
  'FACT_CHECK',
  'CREATE_PENDING_REVIEW',
]);

function clampLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(50, Math.max(1, Math.trunc(parsed)));
}

export async function listTasks(req, res) {
  const filter = {};
  const status = String(req.query?.status || '').trim();
  const type = String(req.query?.type || '').trim().toUpperCase();

  if (TASK_STATUSES.has(status)) {
    filter.status = status;
  }

  if (TASK_TYPES.has(type)) {
    filter.type = type;
  }

  const limit = clampLimit(req.query?.limit);

  const [items, total] = await Promise.all([
    NewsroomTask.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select([
        'type',
        'storyId',
        'status',
        'attempts',
        'maxAttempts',
        'runAt',
        'lockedAt',
        'finishedAt',
        'result',
        'usage',
        'model',
        'error',
        'createdAt',
        'updatedAt',
      ].join(' '))
      .lean(),
    NewsroomTask.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    data: items,
    meta: {
      total,
      limit,
    },
  });
}
