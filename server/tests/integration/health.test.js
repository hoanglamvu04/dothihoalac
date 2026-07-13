import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
test('GET /api/v1/health returns standard payload', async () => {
  const response = await request(createApp()).get('/api/v1/health').expect(200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.service, 'dothihoalac-api');
  assert.equal(response.body.data.status, 'ok');
});
test('unknown endpoint returns JSON 404', async () => {
  const response = await request(createApp()).get('/api/v1/does-not-exist').expect(404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'ROUTE_NOT_FOUND');
});
