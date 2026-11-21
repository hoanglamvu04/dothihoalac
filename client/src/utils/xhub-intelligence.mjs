import { createXHubWebTracker } from './xhub-web-tracker.mjs';
import {
  isPublicContactHref,
  privacySignalEnabled,
  publicArticleSlug,
  safePublicAnalyticsPath,
} from './xhub-analytics-policy.mjs';

export const XHUB_CONSENT_CHANGE_EVENT = 'dthl:xhub-consent-updated';
const STORAGE_KEY = 'dthl:xhub-analytics-consent:v1';

/**
 * This is an independent WA-001 adapter, not a GA4 forwarding bridge.
 * ENABLED only after the site owner approves its consent UI, source identity,
 * public-host reverse proxy and X-HUB migration 089.
 */
export function createXHubIntelligence({
  root = globalThis,
  enabled = false,
  send,
} = {}) {
  let temporaryChoice = null;
  let lastNavigation = null;
  let lastContentKey = null;

  function preference() {
    if (privacySignalEnabled(root)) return 'blocked';
    try {
      const value = root.localStorage?.getItem(STORAGE_KEY);
      if (value === 'accepted' || value === 'rejected') return value;
    } catch {
      // Privacy settings may disallow storage; keep in-memory choice only.
    }
    return temporaryChoice || 'unset';
  }

  const hasConsent = () => enabled && preference() === 'accepted';

  // Inject a safe route-category path to avoid ever collecting raw user IDs,
  // private slugs, search text, contact details, hashes or form URLs.
  const tracker = createXHubWebTracker({
    endpoint: '/api/xhub-analytics',
    hasConsent,
    root,
    send: send || root.fetch?.bind(root),
    getPath: () => safePublicAnalyticsPath(root.location?.pathname),
  });

  function emit(name, context) {
    if (!hasConsent()) {
      tracker.disable();
      return false;
    }
    const tracked = tracker.track(name, context);
    if (tracked) void tracker.flush();
    return tracked;
  }

  function recordNavigation(pathname = root.location?.pathname) {
    const safe = safePublicAnalyticsPath(pathname);
    if (!safe) {
      lastNavigation = null;
      lastContentKey = null;
      return false;
    }

    // The in-memory raw pathname is never emitted or persisted. Detect a
    // genuine route change, not a React rerender or query-only form change.
    if (lastNavigation === pathname) return false;
    const tracked = emit('page_view');
    if (tracked) {
      lastNavigation = pathname;
      lastContentKey = null;
    }
    return tracked;
  }

  function recordArticleView(slug) {
    const publicSlug = publicArticleSlug(slug);
    if (!publicSlug ||
        safePublicAnalyticsPath(root.location?.pathname) !== '/tin-tuc') return false;
    const key = String(root.location?.pathname || '') + ':' + publicSlug;
    if (lastContentKey === key) return false;
    const tracked = emit('content_view', {
      entityType: 'article',
      entityKey: publicSlug,
    });
    if (tracked) lastContentKey = key;
    return tracked;
  }

  function setConsent(allowed) {
    const accepted = enabled && allowed === true && !privacySignalEnabled(root);
    const next = accepted ? 'accepted' : 'rejected';
    temporaryChoice = next;
    try {
      root.localStorage?.setItem(STORAGE_KEY, next);
    } catch {
      // Consent is still valid for the current tab if storage is blocked.
    }
    tracker.disable();
    lastNavigation = null;
    lastContentKey = null;
    if (typeof root.Event === 'function') {
      root.dispatchEvent?.(new root.Event(XHUB_CONSENT_CHANGE_EVENT));
    }
    if (accepted) recordNavigation();
    return accepted;
  }

  function onLinkClick(href) {
    if (!isPublicContactHref(href)) return false;
    return emit('contact_click');
  }

  return {
    enabled: () => enabled,
    preference,
    hasConsent,
    setConsent,
    recordNavigation,
    recordArticleView,
    searchUsed: () => emit('search_used'),
    filterUsed: () => emit('filter_used'),
    formStarted: () => emit('form_started'),
    leadSubmitted: () => emit('lead_submitted'),
    onLinkClick,
    disable: () => {
      tracker.disable();
      lastNavigation = null;
      lastContentKey = null;
    },
    pending: tracker.pending,
  };
}

// Default OFF, even if someone later provisions backend secrets.
// A frontend approval switch is not itself consent: visitors still opt in.
export const xhubIntelligence = createXHubIntelligence({
  enabled: import.meta.env?.VITE_XHUB_ANALYTICS_APPROVED === 'true',
});
