import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import {
  createXHubAnalyticsAdapter,
  isXHubTrackablePublicPath,
  canonicalXHubPublicPath,
} from '../src/utils/xhubAnalytics.mjs';
import {
  isXHubConsentGranted,
  isXHubPrivacySignalActive,
  readXHubConsentChoice,
  setXHubConsentChoice,
} from '../src/utils/xhubConsent.mjs';
import { withConfirmedLeadTelemetry } from '../src/utils/xhubLeadSuccess.mjs';

function makeBrowser({ consent = false, gpc = false, dnt = '0' } = {}) {
  let approved = consent;
  const requests = [];
  const root = {
    crypto: { randomUUID },
    location: {
      pathname: '/tin-tuc/quy-hoach-hoa-lac',
      search: '?utm_source=facebook&utm_campaign=tin-tuc&email=hidden',
    },
    document: { referrer: 'https://www.facebook.com/?email=private' },
    navigator: { globalPrivacyControl: gpc, doNotTrack: dnt },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true };
    },
  };
  const adapter = createXHubAnalyticsAdapter({
    enabled: true,
    root,
    hasConsent: () => approved,
  });
  return {
    root, adapter, requests,
    setConsent: (value) => { approved = value; if (!value) adapter.disable(); },
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('default-disabled adapter and explicit opt-out send zero network requests', async () => {
  const browser = makeBrowser({ consent: false });
  assert.equal(browser.adapter.trackPageView(), false);
  assert.equal(browser.adapter.trackEvent('lead_submitted'), false);
  assert.equal(browser.adapter.pending(), 0);
  const disabled = createXHubAnalyticsAdapter({
    enabled: false,
    root: browser.root,
    hasConsent: () => true,
  });
  assert.equal(disabled.trackPageView(), false);
  await tick();
  assert.equal(browser.requests.length, 0);
});

test('public page views dedupe route rerenders without sending full query strings', async () => {
  const browser = makeBrowser({ consent: true });
  assert.equal(browser.adapter.trackPageView(), true);
  assert.equal(browser.adapter.trackPageView(), false);
  await tick();
  assert.equal(browser.requests.length, 1);
  const { url, options } = browser.requests[0];
  assert.equal(url, '/api/xhub-analytics');
  assert.equal(options.credentials, 'omit');
  assert.ok(!options.headers.Authorization);
  const event = JSON.parse(options.body).events[0];
  assert.equal(event.name, 'page_view');
  assert.equal(event.path, '/tin-tuc');
  assert.equal(event.utmSource, 'facebook');
  assert.equal(event.utmCampaign, 'tin-tuc');
  assert.equal(JSON.stringify(event).includes('hidden'), false);
  assert.equal('email' in event, false);
});

test('article, search, filter and contact only forward allowlisted fields', async () => {
  const browser = makeBrowser({ consent: true });
  browser.adapter.trackEvent('content_view', {
    entityKey: 'quy-hoach-hoa-lac',
    name: 'secret',
    email: 'private@example.vn',
  });
  browser.adapter.trackEvent('search_used', { query: 'my house' });
  browser.adapter.trackEvent('filter_used', { latitude: 21.1 });
  browser.adapter.trackEvent('contact_click', { phone: '0912345678' });
  await tick();
  const eventBodies = browser.requests.flatMap((request) =>
    JSON.parse(request.options.body).events);
  assert.deepEqual(eventBodies.map((e) => e.name), [
    'content_view', 'search_used', 'filter_used', 'contact_click',
  ]);
  assert.deepEqual(
    { type: eventBodies[0].entityType, key: eventBodies[0].entityKey },
    { type: 'article', key: 'quy-hoach-hoa-lac' },
  );
  for (const event of eventBodies) {
    assert.equal(JSON.stringify(event).includes('0912345678'), false);
    assert.equal(JSON.stringify(event).includes('my house'), false);
    assert.equal(JSON.stringify(event).includes('private@example.vn'), false);
    assert.equal('sourcePage' in event, false);
  }
});

test('canonical public paths and attribution never leak numeric IDs or phone', async () => {
  assert.equal(canonicalXHubPublicPath('/tin-tuc/public-article'), '/tin-tuc');
  assert.equal(canonicalXHubPublicPath('/cong-dong/public-post'), '/cong-dong');
  assert.equal(canonicalXHubPublicPath('/tin-tuc/0123456789'), null);
  const browser = makeBrowser({ consent: true });
  browser.root.location.search = '?utm_source=0901234567&utm_campaign=valid-campaign';
  browser.root.document.referrer = 'https://123456789.example.com/sensitive';
  browser.adapter.trackPageView();
  await tick();
  const event = JSON.parse(browser.requests[0].options.body).events[0];
  assert.equal(event.utmSource, undefined);
  assert.equal(event.utmCampaign, 'valid-campaign');
  assert.equal(event.referrerHost, undefined);
});

test('private/account/editor/user profile paths cannot be tracked', async () => {
  const browser = makeBrowser({ consent: true });
  for (const path of [
    '/quan-tri/bai-viet', '/tai-khoan/ho-so', '/studio/bat-dong-san',
    '/dang-nhap', '/thanh-vien/username', '/tin-tuc/user@example.vn',
    '/tim-kiem?q=someone', '/tin-tuc/a%40example',
  ]) {
    assert.equal(isXHubTrackablePublicPath(path), false, path);
    browser.root.location.pathname = path;
    assert.equal(browser.adapter.trackPageView(), false);
  }
  await tick();
  assert.equal(browser.requests.length, 0);
});

test('GPC and DNT block opt-in even if a stored preference says granted', () => {
  const root = {
    navigator: { globalPrivacyControl: true, doNotTrack: '0' },
    localStorage: { getItem: () => 'granted' },
  };
  assert.equal(isXHubPrivacySignalActive(root), true);
  assert.equal(isXHubConsentGranted({ enabled: true, root }), false);
  root.navigator.globalPrivacyControl = false;
  root.navigator.doNotTrack = '1';
  assert.equal(isXHubConsentGranted({ enabled: true, root }), false);
  root.navigator.doNotTrack = '0';
  assert.equal(isXHubConsentGranted({ enabled: true, root }), true);
});

test('consent storage defaults to none and cannot grant while feature is disabled', () => {
  const values = new Map();
  const root = {
    localStorage: {
      getItem: (name) => values.get(name) || null,
      setItem: (name, value) => values.set(name, value),
    },
    navigator: {},
  };
  assert.equal(readXHubConsentChoice(root), null);
  assert.equal(setXHubConsentChoice('granted', root), false);
  assert.equal(readXHubConsentChoice(root), null);
  assert.equal(setXHubConsentChoice('denied', root), true);
  assert.equal(readXHubConsentChoice(root), 'denied');
});

test('withdrawing consent clears queued events and prevents future requests', async () => {
  const browser = makeBrowser({ consent: true });
  browser.adapter.trackPageView();
  await tick();
  const initial = browser.requests.length;
  browser.setConsent(false);
  assert.equal(browser.adapter.pending(), 0);
  assert.equal(browser.adapter.trackEvent('search_used'), false);
  await tick();
  assert.equal(browser.requests.length, initial);
});

test('lead telemetry occurs only after the actual lead request resolves', async () => {
  const steps = [];
  const payload = { fullName: 'Private', phone: '0900000000' };
  const result = await withConfirmedLeadTelemetry(async () => {
    steps.push('request_success');
    return { id: 'saved' };
  }, () => steps.push('lead_submitted'));
  assert.deepEqual(result, { id: 'saved' });
  assert.deepEqual(steps, ['request_success', 'lead_submitted']);
  assert.equal(JSON.stringify(steps).includes(payload.phone), false);

  const failed = [];
  await assert.rejects(
    withConfirmedLeadTelemetry(async () => {
      throw new Error('HTTP 500');
    }, () => failed.push('lead_submitted')),
  );
  assert.deepEqual(failed, []);
});


test('consent withdrawal immediately overrides a stale granted choice if storage breaks', () => {
  const root = {
    navigator: { globalPrivacyControl: false, doNotTrack: '0' },
    localStorage: {
      getItem: () => 'granted',
      setItem: () => { throw new Error('storage blocked'); },
    },
  };

  assert.equal(setXHubConsentChoice('denied', root), true);
  assert.equal(isXHubConsentGranted({ root, enabled: true }), false);
  assert.equal(readXHubConsentChoice(root), 'denied');
});
