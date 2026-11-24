import { Buffer } from 'node:buffer';

// Local WA-001 validation is an additional privacy barrier before forwarding
// to X-HUB. The server never sends arbitrary browser fields to its backend.
// X-HUB independently validates the same versioned contract.
const EVENT_FIELDS = new Set([
  'eventId', 'sessionId', 'name', 'occurredAt', 'path', 'consent',
  'entityType', 'entityKey', 'utmSource', 'utmMedium', 'utmCampaign',
  'referrerHost', 'engagementMs',
]);
const EVENT_NAMES = new Set([
  'page_view', 'content_view', 'search_used', 'filter_used',
  'contact_click', 'form_started', 'lead_submitted',
]);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_CAMPAIGN = /^[\p{L}\p{N}_. -]+$/u;
const SAFE_ENTITY = /^[a-zA-Z0-9_-]{1,80}$/;
const SAFE_HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const SAFE_PUBLIC_BASE_PATHS = new Set([
  '/', '/tin-tuc', '/cong-dong', '/bat-dong-san', '/nha-dat',
  '/viec-lam', '/tim-kiem', '/lien-he', '/gioi-thieu',
  '/khu-vuc', '/trang',
  '/dieu-khoan', '/dieu-khoan-su-dung', '/chinh-sach-quyen-rieng',
  '/chinh-sach-quyen-rieng-tu', '/quy-dinh-dang-bai',
  '/tu-van', '/tu-van-kien-truc', '/uoc-tinh-chi-phi-xay-dung',
  '/tim-homestay', '/dat-villa',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function safeOptionalMetric(value, max) {
  return value === undefined ||
    (typeof value === 'string' && value.length >= 1 &&
      value.length <= max && SAFE_CAMPAIGN.test(value) &&
      !/\d{9,}/.test(value));
}

export function isSafePublicTelemetryPath(path) {
  if (typeof path !== 'string' || path.length > 180 ||
    !path.startsWith('/') || /[?#@%]/.test(path) ||
    [...path].some((char) => char.charCodeAt(0) < 32) ||
    /\d{9,}/.test(path)) {
    return false;
  }
  const normalized = path === '/' ? path : path.replace(/\/+$/, '');
  // Never accept a raw dynamic slug from a forged browser request.
  return SAFE_PUBLIC_BASE_PATHS.has(normalized);
}

/**
 * Return a validated, explicitly whitelisted JSON batch, or null.
 * No personal values, user IDs, search/filter choices or full URLs can pass.
 */
export function validateXHubSiteBatch(body, { now = Date.now() } = {}) {
  if (!isPlainObject(body) ||
    Object.keys(body).some((key) => !['schemaVersion', 'events'].includes(key)) ||
    body.schemaVersion !== 1 ||
    !Array.isArray(body.events) ||
    body.events.length === 0 ||
    body.events.length > 20 ||
    Buffer.byteLength(JSON.stringify(body), 'utf8') > 16000) {
    return null;
  }

  const seen = new Set();
  const validated = [];

  for (const raw of body.events) {
    if (!isPlainObject(raw) ||
      Object.keys(raw).some((key) => !EVENT_FIELDS.has(key)) ||
      raw.consent !== true ||
      !UUID_V4.test(raw.eventId || '') ||
      !UUID_V4.test(raw.sessionId || '') ||
      !EVENT_NAMES.has(raw.name) ||
      !isSafePublicTelemetryPath(raw.path)) {
      return null;
    }

    const when = Date.parse(raw.occurredAt);
    if (typeof raw.occurredAt !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(raw.occurredAt) ||
      !Number.isFinite(when) ||
      when < now - 24 * 60 * 60 * 1000 ||
      when > now + 5 * 60 * 1000) {
      return null;
    }

    const key = raw.eventId.toLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);

    const hasType = raw.entityType !== undefined;
    const hasKey = raw.entityKey !== undefined;
    if (hasType !== hasKey ||
      (hasType && (
        !['article', 'project', 'place', 'listing', 'service'].includes(raw.entityType) ||
        typeof raw.entityKey !== 'string' ||
        !SAFE_ENTITY.test(raw.entityKey) ||
        /\d{9,}/.test(raw.entityKey)
      ))) {
      return null;
    }

    // Do not record any account or CRM identity; for this website the sole
    // entity event is a public article slug.
    if (raw.name === 'content_view') {
      if (raw.entityType !== 'article' ||
        raw.path !== '/tin-tuc') return null;
    } else if (hasType || hasKey) {
      return null;
    }

    if (!safeOptionalMetric(raw.utmSource, 60) ||
      !safeOptionalMetric(raw.utmMedium, 60) ||
      !safeOptionalMetric(raw.utmCampaign, 80) ||
      (raw.referrerHost !== undefined &&
        (typeof raw.referrerHost !== 'string' ||
          !SAFE_HOST.test(raw.referrerHost) ||
          /\d{9,}/.test(raw.referrerHost) ||
          raw.referrerHost.length > 253)) ||
      (raw.engagementMs !== undefined &&
        (!Number.isSafeInteger(raw.engagementMs) ||
          raw.engagementMs < 0 ||
          raw.engagementMs > 3600000))) {
      return null;
    }

    validated.push({
      eventId: raw.eventId,
      sessionId: raw.sessionId,
      name: raw.name,
      occurredAt: raw.occurredAt,
      path: raw.path,
      consent: true,
      ...(hasType ? { entityType: raw.entityType, entityKey: raw.entityKey } : {}),
      ...(raw.utmSource !== undefined ? { utmSource: raw.utmSource } : {}),
      ...(raw.utmMedium !== undefined ? { utmMedium: raw.utmMedium } : {}),
      ...(raw.utmCampaign !== undefined ? { utmCampaign: raw.utmCampaign } : {}),
      ...(raw.referrerHost !== undefined ? { referrerHost: raw.referrerHost } : {}),
      ...(raw.engagementMs !== undefined ? { engagementMs: raw.engagementMs } : {}),
    });
  }

  return { schemaVersion: 1, events: validated };
}
