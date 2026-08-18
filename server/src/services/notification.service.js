import Notification from '../modules/notifications/notification.model.js';
import NotificationPreference from '../modules/notifications/notificationPreference.model.js';

export async function createNotification({
  recipientId,
  actorId = null,
  notificationType,
  targetType = '',
  targetId = null,
  title,
  message = '',
  payload = {},
  dedupeKey = '',
}) {
  if (!recipientId) return null;
  if (actorId && String(recipientId) === String(actorId)) return null;

  const preference = await NotificationPreference.findOne({
    userId: recipientId,
    notificationType,
  }).lean();

  if (preference && !preference.inAppEnabled) return null;

  const normalizedPayload = {
    ...(payload || {}),
    ...(dedupeKey ? { dedupeKey } : {}),
  };

  if (dedupeKey) {
    const existing = await Notification.findOne({
      recipientId,
      notificationType,
      targetType,
      targetId,
      'payload.dedupeKey': dedupeKey,
      deletedAt: null,
    }).lean();

    if (existing) return existing;
  }

  return Notification.create({
    recipientId,
    actorId,
    notificationType,
    targetType,
    targetId,
    title,
    message,
    payload: normalizedPayload,
  });
}
