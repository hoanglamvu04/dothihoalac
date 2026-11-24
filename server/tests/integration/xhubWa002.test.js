import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';

import { createXHubSiteAnalyticsRouter } from '../../src/integrations/xhub-site-analytics.mjs';
import {
  validateXHubSiteBatch,
  isSafePublicTelemetryPath,
} from '../../src/integrations/xhub-site-event-validation.mjs';

const SITE_ID = '11111111-1111-4111-8111-111111111111';
const PRIVATE_TOKEN = 'A'.repeat(43);
const ORIGIN = 'https://dothihoalac.vn';

function event(overrides = {}) {
  return {
    eventId: randomUUID(),
    sessionId: randomUUID(),
    name: 'page_view',
    occurredAt: new Date().toISOString(),
    path: '/tin-tuc',
    consent: true,
    ...overrides,
  };
}

function batch(eventOverrides) {
  return { schemaVersion: 1, events: [event(eventOverrides)] };
}

function makeApp(overrides = {}) {
  const sent = [];
  const app = express();
  app.use('/api/xhub-analytics', createXHubSiteAnalyticsRouter({
    enabled: true,
    siteId: SITE_ID,
    siteToken: PRIVATE_TOKEN,
    publicHost: 'dothihoalac.vn',
    send: async (url, options) => {
      sent.push({ url, options });
      return { status: 202 };
    },
    ...overrides,
  }));
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  return { app, sent };
}

const post = (app, payload = batch(), origin = ORIGIN) =>
  request(app).post('/api/xhub-analytics').set('Origin', origin).send(payload);

test('disabled or missing backend credentials fail closed without stopping the website', async () => {
  const disabled = makeApp({ enabled: false });
  await post(disabled.app).expect(404);
  assert.equal(disabled.sent.length, 0);
  await request(disabled.app).get('/health').expect(200);

  const incomplete = makeApp({ siteToken: '' });
  const response = await post(incomplete.app).expect(503);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.ok(!JSON.stringify(response.body).includes(PRIVATE_TOKEN));
  await request(incomplete.app).get('/health').expect(200);
});

test('valid WA-001 request is forwarded using private bearer only in the backend', async () => {
  const { app, sent } = makeApp();
  const response = await post(app).expect(202);
  assert.deepEqual(response.body, { accepted: true });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url,
    'https://hub.holaspace.vn/api/v1/telemetry/sites/' + SITE_ID + '/events');
  assert.equal(sent[0].options.headers.Authorization, 'Bearer ' + PRIVATE_TOKEN);
  assert.ok(!JSON.stringify(response.body).includes(PRIVATE_TOKEN));
  const forwarded = JSON.parse(sent[0].options.body).events[0];
  assert.equal(forwarded.path, '/tin-tuc');
  assert.equal('ip' in forwarded, false);
  assert.equal('email' in forwarded, false);
});

test('foreign/missing Origin, cross-site fetch and plaintext requests are denied', async () => {
  const { app, sent } = makeApp();
  await post(app, batch(), 'https://evil.example').expect(403);
  await request(app).post('/api/xhub-analytics').send(batch()).expect(403);
  await post(app).set('Sec-Fetch-Site', 'cross-site').expect(403);
  await request(app).post('/api/xhub-analytics')
    .set('Origin', ORIGIN)
    .set('Content-Type', 'text/plain')
    .send(JSON.stringify(batch()))
    .expect(400);
  assert.equal(sent.length, 0);
});

test('strict local validation rejects PII fields, private paths and consent:false', async () => {
  const { app, sent } = makeApp();
  await post(app, batch({ email: 'private@example.vn' })).expect(400);
  await post(app, batch({ name: 'search_used', query: 'home address' })).expect(400);
  await post(app, batch({ path: '/tai-khoan/ho-so' })).expect(400);
  await post(app, batch({ path: '/tim-kiem?q=someone' })).expect(400);
  await post(app, batch({ consent: false })).expect(400);
  await post(app, batch({ sessionId: 'phone-number' })).expect(400);
  assert.equal(sent.length, 0);
});

test('16KB request limit and more than 20 events are rejected without upstream calls', async () => {
  const { app, sent } = makeApp();
  const overLimit = batch();
  overLimit.events[0].utmCampaign = 'A'.repeat(17500);
  await post(app, overLimit).expect(413);
  await post(app, { schemaVersion: 1, events: Array.from({ length: 21 }, () => event()) })
    .expect(400);
  assert.equal(sent.length, 0);
});

test('30/minute limiter can be tightened and burst requests get HTTP 429', async () => {
  const { app, sent } = makeApp({ limit: 2 });
  await post(app).expect(202);
  await post(app).expect(202);
  await post(app).expect(429);
  assert.equal(sent.length, 2);
});

test('local validator preserves safe campaign-only metadata and no search text', () => {
  const data = batch({
    name: 'search_used',
    utmSource: 'facebook',
    utmMedium: 'social',
    utmCampaign: 'xspace 2026',
  });
  const clean = validateXHubSiteBatch(data);
  assert.equal(clean.schemaVersion, 1);
  assert.equal(clean.events[0].utmSource, 'facebook');
  assert.equal(JSON.stringify(clean).includes('phone'), false);
  assert.equal(isSafePublicTelemetryPath('/quan-tri/bai-viet'), false);
  assert.equal(isSafePublicTelemetryPath('/thanh-vien/abc'), false);
  assert.equal(isSafePublicTelemetryPath('/tin-tuc'), true);
  assert.equal(isSafePublicTelemetryPath('/tin-tuc/quy-hoach-hoa-lac'), false);
  assert.equal(validateXHubSiteBatch(batch({ entityType: 'article' })), null);
  assert.equal(validateXHubSiteBatch(batch({ utmSource: '0901234567' })), null);
  assert.equal(validateXHubSiteBatch(batch({ referrerHost: '123456789.example.com' })), null);
  assert.equal(validateXHubSiteBatch(batch({ path: '/tin-tuc/public-article' })), null);
});
