import crypto from 'node:crypto';

import { getDatabaseState } from '../../config/database.js';
import { env } from '../../config/env.js';
import User from '../users/user.model.js';
import Content from '../contents/content.model.js';
import Report from '../reports/report.model.js';
import SystemErrorEvent from './systemErrorEvent.model.js';
import ApiError from '../../utils/ApiError.js';

function text(value = '', max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

function fingerprintFor({
  source,
  message,
  stack,
  route,
}) {
  const firstStackLine = text(stack, 12000)
    .split('\n')
    .slice(0, 3)
    .join('\n');

  return crypto
    .createHash('sha256')
    .update(
      [
        source,
        text(message),
        firstStackLine,
        text(route, 1000),
      ].join('|'),
    )
    .digest('hex');
}

export async function recordSystemError({
  source = 'backend',
  level = 'error',
  message,
  stack = '',
  route = '',
  requestId = '',
  userId = null,
  userAgent = '',
  metadata = {},
}) {
  const normalizedMessage =
    text(message) || 'Unknown system error';

  const fingerprint = fingerprintFor({
    source,
    message: normalizedMessage,
    stack,
    route,
  });

  const now = new Date();

  return SystemErrorEvent.findOneAndUpdate(
    {
      fingerprint,
      resolvedAt: null,
    },
    {
      $set: {
        source,
        level,
        message: normalizedMessage,
        stack: text(stack, 12000),
        route: text(route, 1000),
        requestId: text(requestId, 200),
        userId: userId || null,
        userAgent: text(userAgent, 1000),
        metadata:
          metadata &&
          typeof metadata === 'object'
            ? metadata
            : {},
        lastSeenAt: now,
      },
      $setOnInsert: {
        fingerprint,
        firstSeenAt: now,
      },
      $inc: {
        occurrences: 1,
      },
    },
    {
      upsert: true,
      new: true,
    },
  ).lean();
}

export async function recordClientError(payload = {}, req = null) {
  const metadata = {
    ...(payload.metadata &&
    typeof payload.metadata === 'object'
      ? payload.metadata
      : {}),
    viewport: payload.viewport || undefined,
  };

  return recordSystemError({
    source: 'frontend',
    level: 'error',
    message: payload.message,
    stack: payload.stack,
    route:
      payload.route ||
      payload.url ||
      req?.headers?.referer ||
      '',
    requestId: payload.requestId || '',
    userId: req?.user?._id || null,
    userAgent:
      payload.userAgent ||
      req?.headers?.['user-agent'] ||
      '',
    metadata,
  });
}

export async function operationsOverview(hours = 24) {
  const safeHours = Math.min(
    168,
    Math.max(1, Number(hours) || 24),
  );
  const since = new Date(
    Date.now() - safeHours * 60 * 60 * 1000,
  );

  const [
    totalErrors,
    unresolvedErrors,
    frontendErrors,
    backendErrors,
    recentErrors,
    newUsers,
    pendingContent,
    pendingReports,
    publishedContent,
  ] = await Promise.all([
    SystemErrorEvent.countDocuments({
      lastSeenAt: { $gte: since },
    }),
    SystemErrorEvent.countDocuments({
      resolvedAt: null,
    }),
    SystemErrorEvent.countDocuments({
      source: 'frontend',
      lastSeenAt: { $gte: since },
    }),
    SystemErrorEvent.countDocuments({
      source: 'backend',
      lastSeenAt: { $gte: since },
    }),
    SystemErrorEvent.find({
      resolvedAt: null,
    })
      .sort({
        lastSeenAt: -1,
        occurrences: -1,
      })
      .limit(12)
      .populate('userId', 'email username displayName')
      .lean(),
    User.countDocuments({
      createdAt: { $gte: since },
      deletedAt: null,
    }),
    Content.countDocuments({
      status: 'pending_review',
      deletedAt: null,
    }),
    Report.countDocuments({
      status: { $in: ['pending', 'reviewing'] },
    }),
    Content.countDocuments({
      status: 'published',
      deletedAt: null,
    }),
  ]);

  const memory = process.memoryUsage();

  return {
    windowHours: safeHours,
    health: {
      status:
        getDatabaseState() === 'connected'
          ? 'ok'
          : 'degraded',
      database: getDatabaseState(),
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(
          memory.heapUsed / 1024 / 1024,
        ),
      },
      environment: env.NODE_ENV,
    },
    alerts: {
      totalErrors,
      unresolvedErrors,
      frontendErrors,
      backendErrors,
    },
    activity: {
      newUsers,
      pendingContent,
      pendingReports,
      publishedContent,
    },
    integrations: {
      smtpConfigured: Boolean(
        env.SMTP_HOST &&
          env.SMTP_USER &&
          env.SMTP_PASS,
      ),
      cloudinaryConfigured: Boolean(
        env.CLOUDINARY_URL,
      ),
      smsEnabled:
        String(env.SMS_PROVIDER || 'none') !==
        'none',
      schedulerEnabled:
        Boolean(env.SCHEDULER_ENABLED),
    },
    recentErrors,
    generatedAt: new Date().toISOString(),
  };
}

export async function resolveSystemError(
  id,
  userId,
) {
  const item =
    await SystemErrorEvent.findById(id);

  if (!item) {
    throw new ApiError(
      404,
      'Không tìm thấy cảnh báo lỗi.',
      'SYSTEM_ERROR_NOT_FOUND',
    );
  }

  item.resolvedAt = new Date();
  item.resolvedBy = userId;
  await item.save();

  return item.toObject();
}
