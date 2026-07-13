import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isVietnamesePhone } from '../../src/utils/normalizePhone.js';
test('normalizes Vietnamese country code', () => {
  assert.equal(normalizePhone('+84 912 345 678'), '0912345678');
  assert.equal(isVietnamesePhone('0912345678'), true);
});
