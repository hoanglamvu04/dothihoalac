import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDiscoveryIndexes } from '../../src/modules/savedSearches/discoveryReadiness.js';
import SavedSearch from '../../src/modules/savedSearches/savedSearch.model.js';

const SAVED = [
  {
    name: 'saved_search_per_user_unique', unique: true,
    key: { userId: 1, queryNormalized: 1, contentType: 1, areaId: 1 },
  },
  {
    name: 'saved_search_fair_scan_order',
    key: { isActive: 1, lastScanAttemptAt: 1, _id: 1 },
  },
];
const NOTIFICATIONS = [{
  name: 'unique_notification_dedupe', unique: true,
  key: { recipientId: 1, dedupeKey: 1 },
  partialFilterExpression: { dedupeKey: { $type: 'string' } },
}];

test('required indexes include the physical fair scan order index', () => {
  assert.deepEqual(verifyDiscoveryIndexes(SAVED, NOTIFICATIONS), {
    savedSearchUnique: true,
    notificationDedupeUnique: true,
    savedSearchFairScanIndex: true,
    pass: true,
  });
  const result = verifyDiscoveryIndexes([SAVED[0]], NOTIFICATIONS);
  assert.equal(result.savedSearchUnique, true);
  assert.equal(result.notificationDedupeUnique, true);
  assert.equal(result.savedSearchFairScanIndex, false);
  assert.equal(result.pass, false);
});

test('index audit rejects extra compound keys that defeat uniqueness', () => {
  const invalidSaved = [
    { ...SAVED[0], key: { ...SAVED[0].key, other: 1 } },
    SAVED[1],
  ];
  assert.equal(verifyDiscoveryIndexes(invalidSaved, NOTIFICATIONS).pass, false);
  const invalidNotifications = [{
    ...NOTIFICATIONS[0],
    key: { recipientId: 1, dedupeKey: 1, contentId: 1 },
  }];
  assert.equal(verifyDiscoveryIndexes(SAVED, invalidNotifications).pass, false);
});

test('index audit rejects weakened partial index and wrong scheduler sort', () => {
  const badPartial = [
    {
      ...NOTIFICATIONS[0],
      partialFilterExpression: {
        dedupeKey: { $type: 'string' },
        deletedAt: null,
      },
    },
  ];
  assert.equal(verifyDiscoveryIndexes(SAVED, badPartial).pass, false);
  const badOrder = [
    SAVED[0],
    { ...SAVED[1], key: { lastScanAttemptAt: 1, isActive: 1, _id: 1 } },
  ];
  assert.equal(verifyDiscoveryIndexes(badOrder, NOTIFICATIONS).pass, false);
  assert.equal(verifyDiscoveryIndexes(
    [SAVED[0], { ...SAVED[1], hidden: true }], NOTIFICATIONS,
  ).pass, false);
  assert.equal(verifyDiscoveryIndexes(
    [{ ...SAVED[0], sparse: true }, SAVED[1]], NOTIFICATIONS,
  ).pass, false);
});

test('fairness field is internal and has a correctly ordered schema index', () => {
  const field = SavedSearch.schema.path('lastScanAttemptAt');
  assert.ok(field);
  assert.equal(field.options.select, false);
  assert.equal(field.options.default, null);
  assert.deepEqual(
    SavedSearch.schema.indexes().find(([, opts]) =>
      opts.name === 'saved_search_fair_scan_order')?.[0],
    { isActive: 1, lastScanAttemptAt: 1, _id: 1 },
  );
});
