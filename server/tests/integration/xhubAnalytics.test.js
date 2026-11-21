import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';

import { mountXHubAnalytics } from '../../src/integrations/xhubAnalytics.mount.js';
import { isSafeWa001Batch } from '../../src/integrations/xhub-payload.guard.mjs';

const CONFIG = {
  XHUB_WEB_ANALYTICS_ENABLED: true,
  XHUB_WEB_ANALYTICS_SITE_ID: '11111111-1111-4111-8111-111111111111',
  XHUB_WEB_ANALYTICS_SITE_TOKEN: 'A'.repeat(43),
  XHUB_WEB_ANALYTICS_PUBLIC_HOST: 'dothihoalac.vn',
};
const ORIGIN = 'https://dothihoalac.vn';

function makeBatch(name = 'content_view') {
  const event = {
    eventId: randomUUID(),
    sessionId: randomUUID(),
    name,
    occurredAt: new Date().toISOString(),
    path: '/tin-tuc',
    consent: true,
  };
  if (name === 'content_view') {
    event.entityType = 'article';
    event.entityKey = 'tin-hoa-lac';
  }
  return { schemaVersion: 1, events: [event] };
}

function makeApp({ config = CONFIG, send = async () => ({ status: 202 }), rateLimit = 40 } = {}) {
  const app = express();
  const onDisabledCalls = [];
  const mounted = mountXHubAnalytics(app, config, {
    send,
    rateLimit,
    onDisabled: () => onDisabledCalls.push('disabled'),
  });
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  return { app, mounted, onDisabledCalls };
}

function post(app, body = makeBatch()) {
  return request(app)
    .post('/api/xhub-analytics')
    .set('Origin', ORIGIN)
    .set('Sec-Fetch-Site', 'same-origin')
    .send(body);
}

test('disabled and incomplete X-HUB configuration fail closed without taking down the website', async () => {
  const off = makeApp({
    config: { ...CONFIG, XHUB_WEB_ANALYTICS_ENABLED: false },
  });
  assert.equal(off.mounted, false);
  await request(off.app).get('/health').expect(200);
  await post(off.app).expect(404);

  const incomplete = makeApp({
    config: { ...CONFIG, XHUB_WEB_ANALYTICS_SITE_TOKEN: '' },
  });
  assert.equal(incomplete.mounted, false);
  assert.deepEqual(incomplete.onDisabledCalls, ['disabled']);
  await request(incomplete.app).get('/health').expect(200);
  await post(incomplete.app).expect(404);
});

test('valid consented schemaVersion 1 event is forwarded with server-only bearer', async () => {
  const upstream = [];
  const { app } = makeApp({
    send: async (url, options) => {
      upstream.push({ url, options });
      return { status: 202 };
    },
  });
  const body = makeBatch();
  const result = await post(app, body).expect(202);
  assert.deepEqual(result.body, { accepted: true });

  assert.equal(upstream.length, 1);
  assert.equal(
    upstream[0].url,
    'https://hub.holaspace.vn/api/v1/telemetry/sites/' +
      CONFIG.XHUB_WEB_ANALYTICS_SITE_ID + '/events',
  );
  assert.equal(upstream[0].options.headers.Authorization, 'Bearer ' + CONFIG.XHUB_WEB_ANALYTICS_SITE_TOKEN);
  assert.deepEqual(JSON.parse(upstream[0].options.body), body);
  assert.deepEqual(Object.keys(upstream[0].options.headers).sort(), ['Authorization', 'Content-Type']);
  assert.equal(JSON.stringify(upstream[0]).includes('dthl_access_token'), false);
});

test('foreign Origin, missing Origin and cross-site fetch cannot invoke bearer forwarder', async () => {
  let forwarded = 0;
  const { app } = makeApp({ send: async () => { forwarded += 1; return { status: 202 }; } });

  await request(app).post('/api/xhub-analytics')
    .set('Origin', 'https://attacker.example')
    .send(makeBatch()).expect(403);

  await request(app).post('/api/xhub-analytics')
    .send(makeBatch()).expect(403);

  await request(app).post('/api/xhub-analytics')
    .set('Origin', ORIGIN)
    .set('Sec-Fetch-Site', 'cross-site')
    .send(makeBatch()).expect(403);

  await request(app).post('/api/xhub-analytics')
    .set('Origin', 'http://dothihoalac.vn')
    .send(makeBatch()).expect(403);

  assert.equal(forwarded, 0);
});

test('PII fields, private paths and nonconsented payloads are rejected BEFORE upstream POST', async () => {
  let forwarded = 0;
  const { app } = makeApp({ send: async () => { forwarded += 1; return { status: 202 }; } });

  const invalid = [
    { email: 'visitor@example.com' },
    { phone: '0900000000' },
    { searchQuery: 'private search' },
    { fullUrl: 'https://dothihoalac.vn/tim-kiem?q=secret' },
    { latitude: 21.00, longitude: 105.00 },
    { userId: 'real-account-id' },
    { formData: { fullName: 'Do not forward' } },
    { consent: false },
    { path: '/tim-kiem?q=secret' },
    { path: '/tai-khoan/ho-so' },
    { utmCampaign: '0900000000' },
  ];

  for (const extra of invalid) {
    const payload = makeBatch();
    Object.assign(payload.events[0], extra);
    await post(app, payload).expect(400);
  }

  assert.equal(forwarded, 0);
});

test('batch field allowlist rejects unknown wrapper fields, duplicate IDs and stale events', () => {
  assert.equal(isSafeWa001Batch({ ...makeBatch(), payload: { secret: 'private' } }), false);
  const duplicate = makeBatch();
  duplicate.events.push({ ...duplicate.events[0] });
  assert.equal(isSafeWa001Batch(duplicate), false);

  const old = makeBatch();
  old.events[0].occurredAt = new Date(Date.now() - 25 * 3600_000).toISOString();
  assert.equal(isSafeWa001Batch(old), false);

  assert.equal(isSafeWa001Batch(makeBatch('lead_submitted')), true);
});

test('16KB JSON cap rejects oversized body without making an X-HUB request', async () => {
  let forwarded = 0;
  const { app } = makeApp({ send: async () => { forwarded += 1; return { status: 202 }; } });
  const body = makeBatch();
  body.events[0].comment = 'x'.repeat(18_000);

  await post(app, body).expect(413);
  assert.equal(forwarded, 0);
});

test('rate limiter blocks burst before token-bearing upstream forwarding', async () => {
  let forwarded = 0;
  const { app } = makeApp({
    rateLimit: 2,
    send: async () => { forwarded += 1; return { status: 202 }; },
  });

  await post(app).expect(202);
  await post(app).expect(202);
  await post(app).expect(429);
  assert.equal(forwarded, 2);
});

test('X-HUB upstream failure is sanitized and never exposes bearer information', async () => {
  const { app } = makeApp({
    send: async () => ({ status: 503, text: async () => 'private upstream token' }),
  });
  const result = await post(app).expect(503);
  assert.equal(result.body.error, 'Analytics bridge temporarily unavailable');
  assert.equal(JSON.stringify(result.body).includes(CONFIG.XHUB_WEB_ANALYTICS_SITE_TOKEN), false);
});
