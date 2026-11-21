// Consent preferences are site-local boolean choices, NOT visitor identifiers.
// Tracking remains disabled unless the operator explicitly approves both the
// feature flag AND the website's own consent interface.
const CONSENT_KEY = 'dthl_xhub_analytics_consent_v1';
export const XHUB_CONSENT_CHANGE_EVENT = 'dthl:xhub-analytics-consent-change';

export function isXHubAnalyticsFeatureEnabled() {
  return import.meta.env?.VITE_XHUB_WEB_ANALYTICS_ENABLED === 'true';
}

export function isXHubPrivacySignalActive(root = globalThis) {
  const navigator = root.navigator;
  return navigator?.globalPrivacyControl === true ||
    navigator?.doNotTrack === '1' ||
    root.doNotTrack === '1';
}

export function readXHubConsentChoice(root = globalThis) {
  try {
    const value = root.localStorage?.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function isXHubConsentGranted({
  root = globalThis,
  enabled = isXHubAnalyticsFeatureEnabled(),
} = {}) {
  return enabled === true &&
    !isXHubPrivacySignalActive(root) &&
    readXHubConsentChoice(root) === 'granted';
}

// Called exclusively by a real user choice in the consent UI. No background
// task may write a "granted" preference and no personal data is persisted.
export function setXHubConsentChoice(choice, root = globalThis) {
  if (choice !== 'granted' && choice !== 'denied') {
    throw new TypeError('Explicit analytics consent choice required');
  }

  if (choice === 'granted' &&
    (!isXHubAnalyticsFeatureEnabled() || isXHubPrivacySignalActive(root))) {
    return false;
  }

  try {
    root.localStorage?.setItem(CONSENT_KEY, choice);
    if (typeof root.dispatchEvent === 'function' && typeof root.Event === 'function') {
      root.dispatchEvent(new root.Event(XHUB_CONSENT_CHANGE_EVENT));
    }
    return true;
  } catch {
    // A blocked storage API fails closed: no consent is assumed.
    return false;
  }
}
