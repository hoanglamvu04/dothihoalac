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
}) {
  if (!recipientId) return null;
  if (actorId && String(recipientId) === String(actorId)) return null;
  const preference = await NotificationPreference.findOne({
    userId: recipientId,
    notificationType,
  }).lean();
  if (preference && !preference.inAppEnabled) return null;
  return Notification.create({
    recipientId,
    actorId,
    notificationType,
    targetType,
    targetId,
    title,
    message,
    payload,
  });
}
