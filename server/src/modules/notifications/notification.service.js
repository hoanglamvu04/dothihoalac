import Notification from './notification.model.js';
import NotificationPreference from './notificationPreference.model.js';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_VALUES,
} from '../../constants/notificationTypes.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';

function publicContentUrl(contentType, slug) {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) return '';

  const section = {
    article: 'tin-tuc',
    community: 'cong-dong',
    property: 'bat-dong-san',
    job: 'viec-lam',
  }[contentType];

  return section ? `/${section}/${encodeURIComponent(cleanSlug)}` : '';
}

function notificationDestination(item) {
  const payload = item?.payload || {};

  if (payload.url) return String(payload.url);

  const directContentUrl = publicContentUrl(
    payload.contentType,
    payload.slug,
  );

  if (directContentUrl) return directContentUrl;

  switch (item?.notificationType) {
    case NOTIFICATION_TYPES.LISTING_EXPIRING:
    case NOTIFICATION_TYPES.LISTING_EXPIRED:
      return '/tai-khoan/noi-dung?type=property';

    case NOTIFICATION_TYPES.JOB_EXPIRING:
    case NOTIFICATION_TYPES.JOB_EXPIRED:
      return '/tai-khoan/noi-dung?type=job';

    case NOTIFICATION_TYPES.POST_APPROVED:
    case NOTIFICATION_TYPES.POST_REJECTED:
    case NOTIFICATION_TYPES.POST_NEEDS_REVISION:
    case NOTIFICATION_TYPES.POST_PUBLISHED:
      return '/tai-khoan/noi-dung';

    case NOTIFICATION_TYPES.NEW_FOLLOWER:
      return item?.actorId?.username
        ? `/thanh-vien/${encodeURIComponent(item.actorId.username)}`
        : '/tai-khoan/thong-bao';

    case NOTIFICATION_TYPES.REPORT_RESOLVED:
      return '/tai-khoan/bao-cao';

    default:
      return '/tai-khoan/thong-bao';
  }
}

function normalizeNotification(item) {
  return {
    ...item,
    type: item.notificationType,
    url: notificationDestination(item),
  };
}

export async function list(userId, q) {
  const { page, limit, skip } = parsePagination(q);
  const f = { recipientId: userId, deletedAt: null };

  if (q.unread === 'true') f.readAt = null;
  if (q.type) f.notificationType = q.type;

  const [items, total] = await Promise.all([
    Notification.find(f)
      .populate('actorId', 'username displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(f),
  ]);

  return {
    items: items.map(normalizeNotification),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export const unreadCount = (userId) =>
  Notification.countDocuments({
    recipientId: userId,
    readAt: null,
    deletedAt: null,
  });

export async function readOne(userId, id) {
  const n = await Notification.findOneAndUpdate(
    { _id: id, recipientId: userId, deletedAt: null },
    { readAt: new Date() },
    { new: true },
  );

  if (!n) {
    throw new ApiError(
      404,
      'Không tìm thấy thông báo.',
      'NOTIFICATION_NOT_FOUND',
    );
  }

  return n;
}

export async function readAll(userId) {
  const r = await Notification.updateMany(
    { recipientId: userId, readAt: null, deletedAt: null },
    { readAt: new Date() },
  );

  return { updated: r.modifiedCount };
}

export async function remove(userId, id) {
  const n = await Notification.findOneAndUpdate(
    { _id: id, recipientId: userId },
    { deletedAt: new Date() },
    { new: true },
  );

  if (!n) {
    throw new ApiError(
      404,
      'Không tìm thấy thông báo.',
      'NOTIFICATION_NOT_FOUND',
    );
  }

  return n;
}

export async function getPreferences(userId) {
  const existing = await NotificationPreference.find({ userId }).lean();
  const map = new Map(existing.map((i) => [i.notificationType, i]));

  return NOTIFICATION_TYPE_VALUES.map(
    (type) =>
      map.get(type) || {
        notificationType: type,
        inAppEnabled: true,
        emailEnabled: false,
        smsEnabled: false,
      },
  );
}

export async function updatePreferences(userId, items) {
  await Promise.all(
    items.map((item) =>
      NotificationPreference.findOneAndUpdate(
        { userId, notificationType: item.notificationType },
        { $set: item },
        { upsert: true, new: true, runValidators: true },
      ),
    ),
  );

  return getPreferences(userId);
}
