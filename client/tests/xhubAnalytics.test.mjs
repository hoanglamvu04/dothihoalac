import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createXHubIntelligence } from '../src/utils/xhub-intelligence.mjs';
import {
  isPublicContactHref,
  safePublicAnalyticsPath,
} from '../src/utils/xhub-analytics-policy.mjs';

const settle = () => new Promise((resolve) => setTimeout(resolve, 8));

function createBrowser() {
  const storage = new Map();
  const received = [];
  const root = {
    crypto: { randomUUID },
    AbortController: globalThis.AbortController,
    Event: class { constructor(type) { this.type = type; } },
    dispatchEvent() {},
    navigator: { globalPrivacyControl: false, doNotTrack: '0' },
    document: { referrer: 'https://www.facebook.com/marketing?email=secret@example.com' },
    location: {
      pathname: '/',
      search: '?utm_source=facebook&utm_medium=social&utm_campaign=hoa-lac-2026&q=PII-SECRET',
      hash: '#private',
    },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
  };

  const send = async (endpoint, options) => {
    received.push({ endpoint, options, payload: JSON.parse(options.body) });
    return { ok: true, status: 202 };
  };
  return { root, received, storage, send };
}

test('unapproved WA-002 integration never sends events even when user opts in', async () => {
  const { root, received, send } = createBrowser();
  const analytics = createXHubIntelligence({ root, send, enabled: false });
  assert.equal(analytics.setConsent(true), false);
  assert.equal(analytics.recordNavigation('/'), false);
  assert.equal(analytics.searchUsed(), false);
  assert.equal(analytics.leadSubmitted(), false);
  await settle();
  assert.equal(received.length, 0);
});

test('explicit consent is required; opt-out and refusal send zero requests', async () => {
  const { root, received, send } = createBrowser();
  const analytics = createXHubIntelligence({ root, send, enabled: true });
  assert.equal(analytics.preference(), 'unset');
  analytics.recordNavigation('/');
  analytics.searchUsed();
  analytics.filterUsed();
  analytics.leadSubmitted();
  assert.equal(analytics.setConsent(false), false);
  await settle();
  assert.equal(received.length, 0);
  assert.equal(analytics.pending(), 0);
});

test('opt-in sends schemaVersion 1, canonical paths and no query/form/phone', async () => {
  const { root, received, send } = createBrowser();
  const analytics = createXHubIntelligence({ root, send, enabled: true });

  assert.equal(analytics.setConsent(true), true);
  assert.equal(analytics.recordNavigation('/'), false, 'no duplicate rerender event');

  root.location.pathname = '/tim-kiem';
  assert.equal(analytics.recordNavigation('/tim-kiem'), true);
  assert.equal(analytics.searchUsed(), true);
  assert.equal(analytics.filterUsed(), true);
  assert.equal(analytics.onLinkClick('tel:0966709790'), true);

  root.location.pathname = '/tin-tuc/nha-pho-hoa-lac';
  assert.equal(analytics.recordNavigation(root.location.pathname), true);
  assert.equal(analytics.recordArticleView('nha-pho-hoa-lac'), true);
  assert.equal(analytics.recordArticleView('nha-pho-hoa-lac'), false);
  await settle();

  const events = received.flatMap((item) => item.payload.events);
  assert.ok(events.length >= 7);
  assert.ok(received.every((item) => item.endpoint === '/api/xhub-analytics'));
  assert.ok(received.every((item) => item.payload.schemaVersion === 1));
  assert.ok(received.every((item) => !('Authorization' in item.options.headers)));

  const names = events.map((event) => event.name);
  assert.deepEqual(names, [
    'page_view', 'page_view', 'search_used', 'filter_used',
    'contact_click', 'page_view', 'content_view',
  ]);

  const article = events.find((event) => event.name === 'content_view');
  assert.equal(article.path, '/tin-tuc');
  assert.equal(article.entityType, 'article');
  assert.equal(article.entityKey, 'nha-pho-hoa-lac');
  assert.ok(events.every((event) => event.consent === true));
  assert.equal(new Set(events.map((event) => event.sessionId)).size, 1);
  assert.equal(events[0].utmSource, 'facebook');

  const serialized = JSON.stringify(received);
  for (const forbidden of [
    'PII-SECRET', '0966709790', 'secret@example.com',
    'q=', '#private', 'tel:',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test('DNT and GPC override even a previously accepted choice', async () => {
  for (const privacy of [
    { globalPrivacyControl: true, doNotTrack: '0' },
    { globalPrivacyControl: false, doNotTrack: '1' },
  ]) {
    const { root, received, send } = createBrowser();
    const analytics = createXHubIntelligence({ root, send, enabled: true });
    assert.equal(analytics.setConsent(true), true);
    await settle();
    const prior = received.length;
    Object.assign(root.navigator, privacy);
    assert.equal(analytics.preference(), 'blocked');
    assert.equal(analytics.recordNavigation('/tin-tuc'), false);
    assert.equal(analytics.leadSubmitted(), false);
    assert.equal(analytics.setConsent(true), false);
    await settle();
    assert.equal(received.length, prior);
  }
});

test('withdrawal removes pending events and blocks new requests', async () => {
  const { root, received, send } = createBrowser();
  const analytics = createXHubIntelligence({ root, send, enabled: true });
  analytics.setConsent(true);
  await settle();
  const prior = received.length;
  assert.equal(analytics.setConsent(false), false);
  root.location.pathname = '/tim-kiem';
  assert.equal(analytics.recordNavigation(root.location.pathname), false);
  assert.equal(analytics.searchUsed(), false);
  await settle();
  assert.equal(received.length, prior);
  assert.equal(analytics.pending(), 0);
});

test('sensitive routes and user-generated slugs are not sent as paths', () => {
  for (const pathname of [
    '/quan-tri', '/quan-tri/bai-viet', '/tai-khoan/ho-so',
    '/dang-nhap', '/dat-lai-mat-khau/secret-token',
    '/thanh-vien/john', '/gui-tin/secret-editor',
    '/studio/bat-dong-san', '/cong-dong/create',
    '/tin-tuc/contact@example.com?private=1',
  ]) {
    assert.equal(safePublicAnalyticsPath(pathname), null, pathname);
  }
  assert.equal(safePublicAnalyticsPath('/tin-tuc/public-headline'), '/tin-tuc');
  assert.equal(safePublicAnalyticsPath('/khu-vuc/hoa-lac'), '/khu-vuc');
  assert.equal(safePublicAnalyticsPath('/bat-dong-san/private-slug'), '/bat-dong-san');
  assert.equal(isPublicContactHref('tel:+84123456789'), true);
  assert.equal(safePublicAnalyticsPath('/tai-khoan/nguoi-dung'), null);
  assert.equal(isPublicContactHref('https://zalo.me/secret'), true);
  assert.equal(isPublicContactHref('https://attacker.example/'), false);
});
