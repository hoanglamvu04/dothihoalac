import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDiscoveryIndexes } from '../../scripts/verify-discovery-indexes.mjs';

const saved = [{
  name: 'saved_search_per_user_unique',
  key: { userId: 1, queryNormalized: 1, contentType: 1, areaId: 1 },
  unique: true,
}];
const notification = [{
  name: 'unique_notification_dedupe',
  key: { recipientId: 1, dedupeKey: 1 },
  unique: true,
  partialFilterExpression: { dedupeKey: { $type: 'string' } },
}];

test('release index audit accepts exact partial and compound unique indexes', () => {
  assert.deepEqual(verifyDiscoveryIndexes(saved, notification), {
    savedSearchUnique: true,
    notificationDedupeUnique: true,
    pass: true,
  });
});
test('release index audit fails closed on missing or nonunique indexes', () => {
  assert.equal(verifyDiscoveryIndexes([], notification).pass, false);
  assert.equal(verifyDiscoveryIndexes(saved, [{ ...notification[0], unique: false }]).pass, false);
  assert.equal(verifyDiscoveryIndexes(saved, [{
    ...notification[0], partialFilterExpression: {},
  }]).pass, false);
});
