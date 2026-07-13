import Notification from './notification.model.js';
import NotificationPreference from './notificationPreference.model.js';
import { NOTIFICATION_TYPE_VALUES } from '../../constants/notificationTypes.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';
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
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
export const unreadCount = (userId) =>
  Notification.countDocuments({ recipientId: userId, readAt: null, deletedAt: null });
export async function readOne(userId, id) {
  const n = await Notification.findOneAndUpdate(
    { _id: id, recipientId: userId, deletedAt: null },
    { readAt: new Date() },
    { new: true },
  );
  if (!n) throw new ApiError(404, 'Không tìm thấy thông báo.', 'NOTIFICATION_NOT_FOUND');
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
  if (!n) throw new ApiError(404, 'Không tìm thấy thông báo.', 'NOTIFICATION_NOT_FOUND');
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
