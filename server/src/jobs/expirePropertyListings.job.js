import Content from '../modules/contents/content.model.js';
import PropertyListing from '../modules/properties/propertyListing.model.js';
import { createNotification } from '../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { logger } from '../config/logger.js';

const EXPIRY_WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function expirePropertyListings() {
  const now = new Date();
  const warningCutoff = new Date(now.getTime() + EXPIRY_WARNING_WINDOW_MS);

  const [expiringRows, expiredRows] = await Promise.all([
    PropertyListing.find({
      expiresAt: { $gt: now, $lte: warningCutoff },
      soldAt: null,
      rentedAt: null,
    })
      .select('contentId expiresAt')
      .lean(),
    PropertyListing.find({
      expiresAt: { $lte: now },
      soldAt: null,
      rentedAt: null,
    })
      .select('contentId expiresAt')
      .lean(),
  ]);

  if (expiringRows.length) {
    const expiringIds = expiringRows.map((item) => item.contentId);
    const expiryMap = new Map(
      expiringRows.map((item) => [String(item.contentId), item.expiresAt]),
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
        const expiresAt = expiryMap.get(String(content._id));

        return createNotification({
          recipientId: content.authorId,
          notificationType: NOTIFICATION_TYPES.LISTING_EXPIRING,
          targetType: 'content',
          targetId: content._id,
          title: 'Tin bất động sản sắp hết hạn',
          message: content.title,
          payload: { expiresAt },
          dedupeKey: `property-expiring:${content._id}:${new Date(expiresAt).toISOString()}`,
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

  await Content.updateMany(
    { _id: { $in: expiredIds }, status: 'published' },
    { $set: { status: 'expired' } },
  );

  await Promise.all(
    contents.map((content) =>
      createNotification({
        recipientId: content.authorId,
        notificationType: NOTIFICATION_TYPES.LISTING_EXPIRED,
        targetType: 'content',
        targetId: content._id,
        title: 'Tin bất động sản đã hết hạn',
        message: content.title,
      }),
    ),
  );

  if (contents.length) {
    logger.info({ count: contents.length }, 'Expired property listings');
  }

  return contents.length;
}
