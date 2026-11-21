import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');

test('GET /health returns lightweight uptime payload', async () => {
  const response = await request(createApp()).get('/health').expect(200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'dothihoalac-api');
  assert.equal(typeof response.body.uptimeSeconds, 'number');
});

test('GET /api/v1/health returns standard payload', async () => {
  const response = await request(createApp()).get('/api/v1/health').expect(200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.service, 'dothihoalac-api');
  assert.equal(response.body.data.status, 'ok');
});

test('GET /api/v1/health/ready returns 503 when MongoDB is disconnected', async () => {
  const response = await request(createApp()).get('/api/v1/health/ready').expect(503);
  assert.equal(response.body.success, false);
  assert.equal(response.body.data.status, 'degraded');
  assert.equal(response.body.data.database, 'disconnected');
  assert.match(String(response.headers['cache-control']), /no-store/);
});

test('unknown endpoint returns JSON 404', async () => {
  const response = await request(createApp()).get('/api/v1/does-not-exist').expect(404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'ROUTE_NOT_FOUND');
});
