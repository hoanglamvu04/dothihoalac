export const DEFAULT_NOTIFICATION_DESTINATION = '/tai-khoan/thong-bao';

// Prevent open redirects from links in server or legacy notifications.
export function safeNotificationDestination(value) {
  if (typeof value !== 'string') return DEFAULT_NOTIFICATION_DESTINATION;
  const path = value.trim();
  return path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    path.length <= 1024 &&
    !/[\u0000-\u001f\u007f]/.test(path)
    ? path
    : DEFAULT_NOTIFICATION_DESTINATION;
}
