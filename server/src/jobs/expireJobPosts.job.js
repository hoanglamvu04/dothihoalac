import Content from '../modules/contents/content.model.js';
import JobPost from '../modules/jobs/jobPost.model.js';
import { createNotification } from '../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { logger } from '../config/logger.js';

const EXPIRY_WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function expireJobPosts() {
  const now = new Date();
  const warningCutoff = new Date(now.getTime() + EXPIRY_WARNING_WINDOW_MS);

  const [expiringRows, expiredRows] = await Promise.all([
    JobPost.find({
      deadline: { $gt: now, $lte: warningCutoff },
    })
      .select('contentId deadline')
      .lean(),
    JobPost.find({ deadline: { $lte: now } })
      .select('contentId deadline')
      .lean(),
  ]);

  if (expiringRows.length) {
    const expiringIds = expiringRows.map((item) => item.contentId);
    const deadlineMap = new Map(
      expiringRows.map((item) => [String(item.contentId), item.deadline]),
    );

    const expiringContents = await Content.find({
      _id: { $in: expiringIds },
      status: 'published',
      deletedAt: null,
    })
      .select('authorId title')
      .lean();

    await Promise.all(
      expiringContents.map((content) => {
        const deadline = deadlineMap.get(String(content._id));

        return createNotification({
          recipientId: content.authorId,
          notificationType: NOTIFICATION_TYPES.JOB_EXPIRING,
          targetType: 'content',
          targetId: content._id,
          title: 'Tin tuyển dụng sắp hết hạn',
          message: content.title,
          payload: { deadline },
          dedupeKey: `job-expiring:${content._id}:${new Date(deadline).toISOString()}`,
        });
      }),
    );
  }

  if (!expiredRows.length) return 0;

  const expiredIds = expiredRows.map((item) => item.contentId);
  const contents = await Content.find({
    _id: { $in: expiredIds },
    status: 'published',
    deletedAt: null,
  })
    .select('authorId title')
    .lean();

  const result = await Content.updateMany(
    { _id: { $in: expiredIds }, status: 'published' },
    { $set: { status: 'expired' } },
  );

  await Promise.all(
    contents.map((content) =>
      createNotification({
        recipientId: content.authorId,
        notificationType: NOTIFICATION_TYPES.JOB_EXPIRED,
        targetType: 'content',
        targetId: content._id,
        title: 'Tin tuyển dụng đã hết hạn',
        message: content.title,
      }),
    ),
  );

  if (result.modifiedCount) {
    logger.info({ count: result.modifiedCount }, 'Expired job posts');
  }

  return result.modifiedCount;
}
