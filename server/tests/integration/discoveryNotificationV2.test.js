import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDiscoveryWindow } from '../../src/modules/system/discoveryOverview.service.js';
import { validateNotificationPreferences } from '../../src/modules/notifications/notification.service.js';

test('discovery quality metrics only permit bounded 7/30/90 day windows', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  assert.equal(parseDiscoveryWindow(undefined, now).days, 30);
  assert.equal(parseDiscoveryWindow('7', now).since.toISOString(), '2026-11-18T12:00:00.000Z');
  assert.equal(parseDiscoveryWindow('90', now).days, 90);
  for (const value of ['365', '0', '7 days', '-1']) {
    assert.throws(() => parseDiscoveryWindow(value, now), (error) =>
      error.statusCode === 422 && error.code === 'DISCOVERY_DAYS_INVALID');
  }
});

test('notification preferences accept only explicit known booleans and cannot set userId', () => {
  const valid = validateNotificationPreferences([
    { notificationType: 'saved_search_match', inAppEnabled: false, userId: 'another-user', _id: 'spoof' },
  ]);
  assert.deepEqual(valid, [{ notificationType: 'saved_search_match', inAppEnabled: false }]);
  for (const items of [
    undefined, {}, [], [{ notificationType: 'not-real', inAppEnabled: false }],
    [{ notificationType: 'saved_search_match', inAppEnabled: 'false' }],
    [{ notificationType: 'saved_search_match', inAppEnabled: false },
      { notificationType: 'saved_search_match', inAppEnabled: true }],
    [{ notificationType: 'saved_search_match' }],
  ]) {
    assert.throws(() => validateNotificationPreferences(items), (error) =>
      error.statusCode === 422 && error.code === 'NOTIFICATION_PREFERENCES_INVALID');
  }
});
