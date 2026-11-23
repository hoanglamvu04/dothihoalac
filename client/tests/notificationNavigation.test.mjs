import test from 'node:test';
import assert from 'node:assert/strict';
import { safeNotificationDestination } from '../src/utils/notificationNavigation.mjs';

test('notification links keep internal story and account destinations', () => {
  assert.equal(safeNotificationDestination('/tin-tuc/hoa-lac-2026'), '/tin-tuc/hoa-lac-2026');
  assert.equal(safeNotificationDestination('/tai-khoan/tim-kiem-da-luu'), '/tai-khoan/tim-kiem-da-luu');
});
test('notification links reject external URLs, unsafe schemes and controls', () => {
  for (const value of ['https://bad.example', '//bad.example', 'javascript:alert(1)', '/\\bad', '/a\nb', '', null]) {
    assert.equal(safeNotificationDestination(value), '/tai-khoan/thong-bao');
  }
});
