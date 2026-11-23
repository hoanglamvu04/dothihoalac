import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSavedSearchInput } from '../../src/modules/savedSearches/savedSearch.service.js';
import { buildSavedSearchContentFilter } from '../../src/jobs/savedSearchAlerts.job.js';

test('Saved search input is normalized and not allowed without query or area', () => {
  assert.deepEqual(parseSavedSearchInput({ query: ' Hòa Lạc ', contentType: 'property' }), {
    query: 'Hòa Lạc', queryNormalized: 'hoa lac', contentType: 'property', area: '',
  });
  assert.throws(() => parseSavedSearchInput({}), (error) => error.code === 'SAVED_SEARCH_EMPTY');
  assert.throws(() => parseSavedSearchInput({ query: 'a' }), (error) => error.code === 'SAVED_SEARCH_QUERY_SHORT');
  assert.throws(() => parseSavedSearchInput({ query: 'abc', contentType: 'user' }), (error) => error.code === 'SAVED_SEARCH_INVALID');
  assert.deepEqual(parseSavedSearchInput({ area: 'thach-that' }).query, '');
});

test('Alert query never reads nonpublic, older or cross-type content', () => {
  const from = new Date('2026-11-20T00:00:00Z');
  const filter = buildSavedSearchContentFilter({
    queryNormalized: 'hoa lac', contentType: 'job', areaId: 'area1', lastScannedAt: from,
  }, new Date('2026-11-21T00:00:00Z'));
  assert.equal(filter.status, 'published');
  assert.equal(filter.visibility, 'public');
  assert.equal(filter.deletedAt, null);
  assert.equal(filter.contentType, 'job');
  assert.equal(filter.primaryAreaId, 'area1');
  assert.ok(filter.$and[0].publishedAt.$gt);
  assert.equal(filter.$and[1].$or[0].title.test('Việc làm Hòa Lạc'), true);
});

test('Cursor for tied timestamps has id tie-breaker and survives backlogs', () => {
  const filter = buildSavedSearchContentFilter({
    queryNormalized: '', contentType: 'all', areaId: null,
    lastScannedAt: new Date('2026-11-20T00:00:00Z'),
    lastScannedContentId: '507f1f77bcf86cd799439011',
  }, new Date('2026-11-21T00:00:00Z'));
  assert.equal(filter.$and[0].$or.length, 2);
  assert.deepEqual(filter.$and[0].$or[1]._id, { $gt: '507f1f77bcf86cd799439011' });
});
