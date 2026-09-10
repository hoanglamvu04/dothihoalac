import test from 'node:test';
import assert from 'node:assert/strict';

import { assertDemoSeedAllowed } from '../../src/seeds/seedSafety.js';

test('demo seed guard allows non-production environments', () => {
  assert.doesNotThrow(() => assertDemoSeedAllowed('test demo seed', 'development'));
  assert.doesNotThrow(() => assertDemoSeedAllowed('test demo seed', 'test'));
});

test('demo seed guard rejects production', () => {
  assert.throws(
    () => assertDemoSeedAllowed('test demo seed', 'production'),
    /Refusing to run test demo seed in production/,
  );
});
