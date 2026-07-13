import Content from '../modules/contents/content.model.js';
import PropertyListing from '../modules/properties/propertyListing.model.js';
import { createNotification } from '../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { logger } from '../config/logger.js';
export async function expirePropertyListings() {
  const expired = await PropertyListing.find({
    expiresAt: { $lte: new Date() },
    soldAt: null,
    rentedAt: null,
  })
    .select('contentId')
    .lean();
  if (!expired.length) return 0;
  const ids = expired.map((x) => x.contentId);
  const contents = await Content.find({ _id: { $in: ids }, status: 'published' })
    .select('authorId title')
    .lean();
  await Content.updateMany(
    { _id: { $in: ids }, status: 'published' },
    { $set: { status: 'expired' } },
  );
  await Promise.all(
    contents.map((c) =>
      createNotification({
        recipientId: c.authorId,
        notificationType: NOTIFICATION_TYPES.LISTING_EXPIRED,
        targetType: 'content',
        targetId: c._id,
        title: 'Tin bất động sản đã hết hạn',
        message: c.title,
      }),
    ),
  );
  logger.info({ count: contents.length }, 'Expired property listings');
  return contents.length;
}
