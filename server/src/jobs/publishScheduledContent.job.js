import Content from '../modules/contents/content.model.js';
import { createNotification } from '../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { logger } from '../config/logger.js';

export async function publishScheduledContent() {
  const now = new Date();
  const scheduled = await Content.find({
    status: 'scheduled',
    scheduledAt: { $lte: now },
    deletedAt: null,
  })
    .select('_id authorId title')
    .lean();

  if (!scheduled.length) return 0;

  const ids = scheduled.map((item) => item._id);
  const result = await Content.updateMany(
    {
      _id: { $in: ids },
      status: 'scheduled',
      deletedAt: null,
    },
    { $set: { status: 'published', publishedAt: now } },
  );

  await Promise.all(
    scheduled.map((content) =>
      createNotification({
        recipientId: content.authorId,
        notificationType: NOTIFICATION_TYPES.POST_PUBLISHED,
        targetType: 'content',
        targetId: content._id,
        title: 'Nội dung đã được xuất bản theo lịch',
        message: content.title,
        dedupeKey: `scheduled-published:${content._id}`,
      }),
    ),
  );

  if (result.modifiedCount) {
    logger.info(
      { count: result.modifiedCount },
      'Published scheduled content',
    );
  }

  return result.modifiedCount;
}
