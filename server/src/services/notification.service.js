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

  const record = {
    recipientId, actorId, notificationType, targetType, targetId,
    title, message, payload: normalizedPayload,
  };

  if (!dedupeKey) return Notification.create(record);

  // A unique compound key makes alert delivery idempotent even when the
  // scheduler retries after a crash or two workers overlap.
  try {
    return await Notification.findOneAndUpdate(
      { recipientId, dedupeKey },
      { $setOnInsert: { ...record, dedupeKey } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Notification.findOne({ recipientId, dedupeKey });
    }
    throw error;
  }
}
