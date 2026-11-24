import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';

import {
  buildPullSummary, createXHubPullAnalyticsRouter, verifyPullKey,
} from '../../src/integrations/xhub-pull-analytics.mjs';
import {
  recordConsentedMetricEvents, vietnamCalendarDay,
} from '../../src/integrations/xhub-consented-metrics.mjs';
import { createXHubSiteAnalyticsRouter } from '../../src/integrations/xhub-site-analytics.mjs';

const KEY = 'a'.repeat(64);
const NOW = new Date('2026-11-22T17:30:00.000Z'); // 00:30 on Nov 23 in Vietnam
const safeEvent = (name = 'page_view', values = {}) => ({
  eventId: randomUUID(),
  sessionId: randomUUID(),
  name,
  occurredAt: new Date().toISOString(),
  path: '/tin-tuc',
  consent: true,
  ...values,
});
function appFor({ enabled = true, sourceReady = true, key = KEY, readDaily, limit } = {}) {
  const app = express();
  app.use('/api/xhub/v1/analytics/summary', createXHubPullAnalyticsRouter({
    enabled, sourceReady, key, readDaily, now: () => NOW, limit,
  }));
  return app;
}
function get(app, days = 7, key = KEY) {
  const req = request(app).get('/api/xhub/v1/analytics/summary?days=' + days);
  if (key !== null) req.set('X-XHub-Analytics-Key', key);
  return req;
}

test('WA-005 refuses absent, malformed or wrong keys using constant-time verifier', async () => {
  const app = appFor({ readDaily: async () => [] });
  assert.equal(verifyPullKey(KEY, KEY), true);
  assert.equal(verifyPullKey('z'.repeat(64), KEY), false);
  assert.equal(verifyPullKey('', KEY), false);
  await get(app, 7, null).expect(401);
  await get(app, 7, 'f'.repeat(64)).expect(401);
  await get(app, 7, 'invalid').expect(401);
  await get(app).expect(200);
});

test('WA-005 blocks browsers, preflights, cookie auth and invalid windows', async () => {
  const app = appFor({ readDaily: async () => [] });
  const endpoint = '/api/xhub/v1/analytics/summary?days=7';
  const rejected = await request(app).get(endpoint)
    .set('Origin', 'https://dothihoalac.vn')
    .set('X-XHub-Analytics-Key', KEY).expect(403);
  assert.equal(rejected.headers['access-control-allow-origin'], undefined);
  await request(app).options(endpoint)
    .set('Origin', 'https://dothihoalac.vn')
    .set('Access-Control-Request-Method', 'GET').expect(403);
  await request(app).get(endpoint).set('Sec-Fetch-Site', 'same-origin')
    .set('X-XHub-Analytics-Key', KEY).expect(403);
  await request(app).get(endpoint).set('Cookie', 'access=abc').expect(401);
  for (const bad of ['1', '8', '365', '07', '30%26siteId%3Dx', '']) {
    await get(app, bad).expect(400);
  }
  assert.equal((await get(app).expect(200)).headers['cache-control'], 'private, no-store');
});

test('disabled/unapproved source or unavailable Mongo return 503, never invented zero totals', async () => {
  await get(appFor({ enabled: false }), 7).expect(503);
  await get(appFor({ key: '' }), 7).expect(503);
  await get(appFor({ sourceReady: false }), 7).expect(503);
  await get(appFor({ readDaily: async () => { throw new Error('DB disconnected'); } }), 7).expect(503);
});

test('schemaVersion=1, days 7/30/90 and calendar boundaries use Vietnam timezone', async () => {
  const rows = [
    { day: '2026-11-23', name: 'page_view', count: 5 },
    { day: '2026-11-22', name: 'contact_click', count: 2 },
    { day: '2026-11-22', name: 'lead_submitted', count: 1 },
    { day: '2026-11-17', name: 'page_view', count: 3 },
    { day: '2026-10-30', name: 'page_view', count: 7 },
    { day: '2026-08-24', name: 'lead_submitted', count: 9 },
  ];
  const ranges = [];
  const app = appFor({ readDaily: async (range) => { ranges.push(range); return rows; } });
  for (const [days, views] of [[7, 8], [30, 15], [90, 15]]) {
    const body = (await get(app, days).expect(200)).body;
    assert.deepEqual(Object.keys(body), [
      'schemaVersion', 'siteCode', 'siteHost', 'period',
      'generatedAt', 'privacy', 'metrics', 'daily',
    ]);
    assert.equal(body.schemaVersion, 1);
    assert.equal(body.siteCode, 'dothihoalac');
    assert.equal(body.siteHost, 'dothihoalac.vn');
    assert.deepEqual(body.period, { days, timezone: 'Asia/Ho_Chi_Minh' });
    assert.deepEqual(body.privacy, {
      consent: 'explicit_opt_in', granularity: 'aggregate_only',
    });
    assert.equal(body.generatedAt, NOW.toISOString());
    assert.deepEqual(body.metrics, {
      pageViews: views, contactClicks: 2, leadSubmissions: 1,
    });
    assert.deepEqual(Object.keys(body.daily[0]),
      ['day', 'pageViews', 'contactClicks', 'leadSubmissions']);
    assert.equal(body.daily.reduce((sum, day) => sum + day.pageViews, 0), views);
    assert.equal(body.daily.reduce((sum, day) => sum + day.contactClicks, 0), 2);
    assert.equal(body.daily.reduce((sum, day) => sum + day.leadSubmissions, 0), 1);
    assert.equal(JSON.stringify(body).includes('sessionId'), false);
    assert.equal(JSON.stringify(body).includes('ip'), false);
    assert.equal(JSON.stringify(body).includes('email'), false);
  }
  assert.deepEqual(ranges, [
    { startDay: '2026-11-17', endDay: '2026-11-23' },
    { startDay: '2026-10-25', endDay: '2026-11-23' },
    { startDay: '2026-08-26', endDay: '2026-11-23' },
  ]);
  assert.equal(vietnamCalendarDay(NOW), '2026-11-23');
  assert.equal(vietnamCalendarDay('2026-11-22T16:59:59.000Z'), '2026-11-22');
});

test('local Mongo writer persists ONLY consented counts, not UUID/session/path/PII', async () => {
  const operations = [];
  const model = {
    init: async () => {},
    bulkWrite: async (ops) => {
      operations.push(...ops);
      return { upsertedCount: ops.length };
    },
  };
  const events = [
    safeEvent('page_view', { phone: '0900000000', utmCampaign: 'private' }),
    safeEvent('contact_click'),
    safeEvent('lead_submitted'),
    safeEvent('search_used'),
    safeEvent('page_view', { consent: false }),
  ];
  const inserted = await recordConsentedMetricEvents(events, {
    model, isReady: () => {},
  });
  assert.equal(inserted, 3);
  assert.equal(operations.length, 3);
  for (const operation of operations) {
    const text = JSON.stringify(operation);
    assert.equal(/sessionId|phone|utm|path|eventId|0900000000/.test(text), false);
    assert.match(operation.updateOne.filter.eventHash, /^[0-9a-f]{64}$/);
    assert.equal(operation.updateOne.update.$setOnInsert.consent, true);
  }
});

test('local consented WA-002 ingestion bypasses X-HUB push and denies opt-out/GPC/DNT', async () => {
  const saved = [];
  const app = express();
  app.use('/api/xhub-analytics', createXHubSiteAnalyticsRouter({
    enabled: true, mode: 'local',
    publicHost: 'dothihoalac.vn',
    storeBatch: async (events) => { saved.push(...events); },
    send: async () => { throw new Error('must not push to X-HUB in local mode'); },
  }));
  const post = (payload) => request(app).post('/api/xhub-analytics')
    .set('Origin', 'https://dothihoalac.vn')
    .send({ schemaVersion: 1, events: [payload] });
  await post(safeEvent()).expect(202);
  await post(safeEvent('contact_click')).expect(202);
  await post(safeEvent('lead_submitted')).expect(202);
  await post(safeEvent('page_view', { consent: false })).expect(400);
  await post(safeEvent('page_view')).set('DNT', '1').expect(403);
  await post(safeEvent('page_view')).set('Sec-GPC', '1').expect(403);
  assert.deepEqual(saved.map((event) => event.name),
    ['page_view', 'contact_click', 'lead_submitted']);
});

test('malformed aggregate numbers fail closed, never expose raw records', () => {
  assert.throws(() => buildPullSummary({
    days: 7,
    rows: [{ day: '2026-11-23', name: 'page_view', count: -1 }],
    generatedAt: NOW,
  }));
});
