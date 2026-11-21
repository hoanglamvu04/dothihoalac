import { createXHubWebTracker } from './xhub-web-tracker.mjs';
import {
  isXHubAnalyticsFeatureEnabled,
  isXHubConsentGranted,
} from './xhubConsent.mjs';

// Public, non-identifying website routes only. Never forward usernames,
// draft/editor URLs, account paths, tokens, private profiles or raw queries.
const SAFE_SEGMENT = '[a-zA-Z0-9_-]{1,80}';
const PUBLIC_BASE_ROUTES = new Set([
  '/', '/tin-tuc', '/cong-dong', '/bat-dong-san', '/nha-dat',
  '/viec-lam', '/tim-kiem', '/lien-he', '/gioi-thieu',
  '/dieu-khoan', '/dieu-khoan-su-dung', '/chinh-sach-quyen-rieng',
  '/chinh-sach-quyen-rieng-tu', '/quy-dinh-dang-bai',
  '/tu-van', '/tu-van-kien-truc', '/uoc-tinh-chi-phi-xay-dung',
  '/tim-homestay', '/dat-villa',
]);

const PUBLIC_DETAIL_PATTERNS = [
  new RegExp('^/(?:tin-tuc|cong-dong|bat-dong-san|nha-dat|viec-lam)/' +
    SAFE_SEGMENT + '(?:/' + SAFE_SEGMENT + ')?$'),
  new RegExp('^/(?:khu-vuc|trang)/' + SAFE_SEGMENT + '$'),
];

export function isXHubTrackablePublicPath(path) {
  if (typeof path !== 'string' || path.length > 180 ||
    !path.startsWith('/') || /[?#@%\u0000-\u001f]/.test(path)) {
    return false;
  }

  const normalized = path === '/' ? path : path.replace(/\/+$/, '');
  return PUBLIC_BASE_ROUTES.has(normalized) ||
    PUBLIC_DETAIL_PATTERNS.some((pattern) => pattern.test(normalized));
}

// Injected dependencies permit network-free unit tests without importing
// the app's GA4 implementation or reading any form/search values.
export function createXHubAnalyticsAdapter({
  enabled = false,
  root = globalThis,
  hasConsent = () => false,
  trackerFactory = createXHubWebTracker,
} = {}) {
  if (!enabled) {
    return {
      trackEvent: () => false,
      trackPageView: () => false,
      disable: () => {},
      pending: () => 0,
    };
  }

  const tracker = trackerFactory({
    endpoint: '/api/xhub-analytics',
    hasConsent,
    root,
  });
  let lastPageView = '';

  function allowed() {
    return hasConsent() === true &&
      isXHubTrackablePublicPath(root.location?.pathname);
  }

  function trackEvent(name, { entityKey } = {}) {
    if (!allowed()) {
      if (hasConsent() !== true) {
        lastPageView = '';
        tracker.disable();
      }
      return false;
    }

    // Do not accept metadata for search, filter, contact, form or lead events.
    let metadata = {};
    if (name === 'content_view') {
      const key = String(entityKey || '');
      if (!/^[-_a-zA-Z0-9]{1,80}$/.test(key) ||
        !root.location?.pathname?.startsWith('/tin-tuc/')) return false;
      metadata = { entityType: 'article', entityKey: key };
    } else if (![
      'page_view', 'search_used', 'filter_used',
      'contact_click', 'form_started', 'lead_submitted',
    ].includes(name)) {
      return false;
    }

    const queued = tracker.track(name, metadata);
    if (queued) void tracker.flush();
    return queued;
  }

  function trackPageView() {
    const currentPath = root.location?.pathname || '';
    if (currentPath === lastPageView) return false;
    const sent = trackEvent('page_view');
    if (sent) lastPageView = currentPath;
    return sent;
  }

  return {
    trackEvent,
    trackPageView,
    disable() {
      lastPageView = '';
      tracker.disable();
    },
    pending: () => tracker.pending(),
  };
}

let singleton = null;
function getAdapter() {
  if (typeof window === 'undefined' || !isXHubAnalyticsFeatureEnabled()) {
    return null;
  }

  if (!singleton) {
    singleton = createXHubAnalyticsAdapter({
      enabled: true,
      root: window,
      hasConsent: () => isXHubConsentGranted({ root: window }),
    });
  }
  return singleton;
}

export function trackXHubPageView() {
  return getAdapter()?.trackPageView() || false;
}

export function trackXHubEvent(name, metadata = {}) {
  return getAdapter()?.trackEvent(name, metadata) || false;
}

export function disableXHubAnalytics() {
  singleton?.disable();
}
