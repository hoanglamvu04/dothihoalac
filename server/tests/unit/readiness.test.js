import test from 'node:test';
import assert from 'node:assert/strict';

import { checkDatabaseReadiness } from '../../src/modules/health/readiness.service.js';

test('readiness refuses to mark disconnected database healthy', async () => {
  let touched = false;
  const result = await checkDatabaseReadiness({
    databaseState: 'disconnected',
    ping: async () => { touched = true; },
  });

  assert.equal(result.status, 'degraded');
  assert.equal(result.database, 'disconnected');
  assert.equal(touched, false);
});

test('readiness returns healthy when MongoDB ping succeeds', async () => {
  const result = await checkDatabaseReadiness({
    databaseState: 'connected',
    ping: async () => {},
  });
  assert.deepEqual(result, { status: 'ok', database: 'connected' });
});

test('readiness returns degraded if MongoDB ping rejects', async () => {
  const result = await checkDatabaseReadiness({
    databaseState: 'connected',
    ping: async () => { throw new Error('selection timed out'); },
  });
  assert.deepEqual(result, { status: 'degraded', database: 'unavailable' });
});

test('readiness times out a hung ping rather than hanging HTTP forever', async () => {
  let aborted = false;
  const start = Date.now();
  const result = await checkDatabaseReadiness({
    databaseState: 'connected',
    timeoutMs: 25,
    ping: (signal) => new Promise(() => {
      signal.addEventListener('abort', () => { aborted = true; }, { once: true });
    }),
  });

  assert.equal(result.status, 'degraded');
  assert.ok(aborted);
  assert.ok(Date.now() - start < 1000);
});
