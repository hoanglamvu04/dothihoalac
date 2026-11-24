export const DEFAULT_NOTIFICATION_DESTINATION = '/tai-khoan/thong-bao';

// Prevent open redirects from links in server or legacy notifications.
export function safeNotificationDestination(value) {
  if (typeof value !== 'string') return DEFAULT_NOTIFICATION_DESTINATION;
  const path = value.trim();
  return path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    path.length <= 1024 &&
    !Array.from(path).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  })
    ? path
    : DEFAULT_NOTIFICATION_DESTINATION;
}
