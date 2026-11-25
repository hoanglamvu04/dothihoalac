import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchRequestParams } from '../src/utils/searchQueryParams.mjs';

const base = { q: 'Hòa Lạc', area: 'thach-that', type: 'property', sort: 'price_asc', page: 2, limit: 12 };

test('advanced property filters and date are sent to the public search endpoint', () => {
  const url = new URLSearchParams([
    ['days', '30'], ['propertyType', 'land'],
    ['transactionType', 'sale'], ['minPrice', '1000000000'],
    ['maxPrice', '3000000000'], ['minArea', '60'], ['maxArea', '150'],
    ['private', 'never-send'],
  ]);
  assert.deepEqual(buildSearchRequestParams(url, base), {
    ...base, days: '30', propertyType: 'land', transactionType: 'sale',
    minPrice: '1000000000', maxPrice: '3000000000',
    minArea: '60', maxArea: '150',
  });
});

test('article, job and people searches never forward property-only filters', () => {
  const url = new URLSearchParams('days=7&minPrice=100&maxArea=300&propertyType=land');
  for (const type of ['article', 'job', 'user', 'area', 'all']) {
    assert.deepEqual(buildSearchRequestParams(url, { type, page: 1 }), {
      type, page: 1, days: '7',
    });
  }
});

test('empty and unknown URL parameters are excluded from API request', () => {
  const url = new URLSearchParams('days=&minPrice=&maxPrice=+&random=secret');
  assert.deepEqual(buildSearchRequestParams(url, base), base);
});

test('date-only filtering is supported without a query', () => {
  assert.deepEqual(buildSearchRequestParams(
    new URLSearchParams('days=90'),
    { q: '', area: undefined, type: 'all', sort: 'newest', page: 1, limit: 12 },
  ), {
    q: '', area: undefined, type: 'all', sort: 'newest', page: 1, limit: 12, days: '90',
  });
});
