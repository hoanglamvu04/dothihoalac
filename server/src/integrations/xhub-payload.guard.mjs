// WA-001 browser-to-site boundary: reject extra fields before transmitting
// them to X-HUB. Central X-HUB also validates, but it is too late for PII if
// the website blindly forwards an invalid payload upstream.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_SLUG = /^[A-Za-z0-9_-]{1,80}$/;
const SAFE_METRIC = /^[\p{L}\p{N}_. -]+$/u;
const SAFE_HOST = /^[a-z0-9.-]{3,200}$/i;

const EVENTS = new Set([
  'page_view', 'content_view', 'search_used', 'filter_used',
  'map_place_view', 'map_directions_click', 'favorite_added',
  'contact_click', 'form_started', 'lead_submitted', 'outbound_click',
]);

const ENTITY_TYPES = new Set(['article', 'project', 'place', 'listing', 'service']);
const FIELDS = new Set([
  'eventId', 'sessionId', 'name', 'occurredAt', 'path', 'consent',
  'entityType', 'entityKey', 'utmSource', 'utmMedium', 'utmCampaign',
  'referrerHost', 'engagementMs',
]);

const PUBLIC_PATHS = new Set([
  '/', '/tin-tuc', '/cong-dong', '/bat-dong-san', '/viec-lam',
  '/tim-kiem', '/khu-vuc', '/lien-he', '/tu-van',
  '/tu-van-kien-truc', '/uoc-tinh-chi-phi-xay-dung',
  '/tim-homestay', '/dat-villa', '/gioi-thieu',
  '/dieu-khoan', '/dieu-khoan-su-dung',
  '/chinh-sach-quyen-rieng', '/chinh-sach-quyen-rieng-tu',
  '/quy-dinh-dang-bai', '/trang',
]);

const ownKeys = (value) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value) : [];

const safeMetric = (value, max) =>
  typeof value === 'string' &&
  value.length >= 1 && value.length <= max &&
  value.trim() === value &&
  SAFE_METRIC.test(value) &&
  !/\d{9,}/.test(value);

export function isSafeWa001Batch(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      ownKeys(body).some((key) => !['schemaVersion', 'events'].includes(key)) ||
      body.schemaVersion !== 1 || !Array.isArray(body.events) ||
      body.events.length < 1 || body.events.length > 20) return false;

  const eventIds = new Set();
  for (const event of body.events) {
    if (!event || typeof event !== 'object' || Array.isArray(event) ||
        ownKeys(event).some((key) => !FIELDS.has(key)) ||
        !UUID.test(event.eventId || '') ||
        !UUID.test(event.sessionId || '') ||
        !EVENTS.has(event.name) ||
        event.consent !== true ||
        !PUBLIC_PATHS.has(event.path)) return false;

    if (eventIds.has(event.eventId)) return false;
    eventIds.add(event.eventId);

    const time = typeof event.occurredAt === 'string'
      ? new Date(event.occurredAt).getTime() : NaN;
    if (!Number.isFinite(time) ||
        time < now - 24 * 60 * 60 * 1000 ||
        time > now + 5 * 60 * 1000) return false;

    const hasEntity = event.entityType !== undefined ||
      event.entityKey !== undefined;
    if (hasEntity &&
        (!ENTITY_TYPES.has(event.entityType) ||
         !SAFE_SLUG.test(event.entityKey || '') ||
         /\d{9,}/.test(event.entityKey))) return false;

    if (event.name === 'content_view' &&
        (event.entityType !== 'article' || !SAFE_SLUG.test(event.entityKey || '')))
      return false;

    for (const [key, max] of [
      ['utmSource', 60],
      ['utmMedium', 60],
      ['utmCampaign', 80],
    ]) {
      if (event[key] !== undefined && !safeMetric(event[key], max)) return false;
    }

    if (event.referrerHost !== undefined &&
        (typeof event.referrerHost !== 'string' ||
         !SAFE_HOST.test(event.referrerHost) ||
         event.referrerHost.includes('..') ||
         /^\d+\.\d+\.\d+\.\d+$/.test(event.referrerHost))) return false;

    if (event.engagementMs !== undefined &&
        (!Number.isSafeInteger(event.engagementMs) ||
         event.engagementMs < 0 || event.engagementMs > 3_600_000))
      return false;
  }
  return true;
}
