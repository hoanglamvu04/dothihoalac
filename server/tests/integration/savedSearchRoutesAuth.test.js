import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');

test('all saved-search routes require authentication', async () => {
  const app = createApp();
  const base = '/api/v1/saved-searches';
  const id = '507f1f77bcf86cd799439011';
  const cases = [
    request(app).get(base),
    request(app).post(base).send({ query: 'Hòa Lạc' }),
    request(app).patch(base + '/' + id).send({ isActive: false }),
    request(app).delete(base + '/' + id),
  ];
  for (const pending of cases) {
    const response = await pending.expect(401);
    assert.equal(response.body.code, 'AUTH_REQUIRED');
  }
});
