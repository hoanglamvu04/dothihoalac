import test from 'node:test';
import assert from 'node:assert/strict';
import { findSavedSearch, normalizedSavedSearchQuery } from '../src/utils/savedSearchMatch.mjs';

const areaId = '507f1f77bcf86cd799439011';

test('saved search UI matches the same area by Mongo ObjectId or slug', () => {
  const saved = {
    _id: 'search1', contentType: 'all',
    query: '', queryNormalized: '', areaId, areaSlug: 'thach-that', isActive: true,
  };
  assert.equal(findSavedSearch([saved], { area: areaId }), saved);
  assert.equal(findSavedSearch([saved], { area: 'THACH-THAT' }), saved);
  assert.equal(findSavedSearch([saved], { area: 'other' }), null);
});

test('Vietnamese query comparisons handle accents and common abbreviations', () => {
  const saved = {
    _id: 'search2', queryNormalized: 'bat dong san', query: 'BĐS',
    contentType: 'property', areaId: null, areaSlug: '',
  };
  assert.equal(findSavedSearch([saved], { query: 'Nhà Đất', contentType: 'property' }), saved);
  assert.equal(normalizedSavedSearchQuery('ĐHQG'), 'dai hoc quoc gia');
});

test('UI never accidentally matches a search from a different category or area', () => {
  const saved = {
    queryNormalized: 'hoa lac', contentType: 'job', areaId, areaSlug: 'thach-that',
  };
  assert.equal(findSavedSearch([saved], { query: 'Hòa Lạc', contentType: 'property', area: areaId }), null);
  assert.equal(findSavedSearch([saved], { query: 'Hòa Lạc', contentType: 'job' }), null);
  assert.equal(findSavedSearch([saved], { query: 'Hòa Lạc', contentType: 'job', area: areaId }), saved);
});

test('empty subscriptions, non-list input and inactive items are handled predictably', () => {
  assert.equal(findSavedSearch(null, { query: 'hoa lac' }), null);
  const saved = { contentType: 'all', queryNormalized: 'hoa lac', areaId: null, isActive: false };
  assert.equal(findSavedSearch([saved], { query: 'Hòa Lạc' }), saved);
});
