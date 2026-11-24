import test from 'node:test';
import assert from 'node:assert/strict';
import { spellingSuggestion, suggestSearch } from '../../src/modules/search/search.suggestions.js';
import { parseSearchFilters } from '../../src/modules/search/search.filters.js';

test('suggestions correct high-confidence Vietnamese typos, never correct known aliases', () => {
  assert.equal(spellingSuggestion('hoa lak'), 'Hòa Lạc');
  assert.equal(spellingSuggestion('Thach That'), null);
  assert.equal(spellingSuggestion('BĐS'), null);
  assert.equal(spellingSuggestion('unrelated long string'), null);
});

test('autocomplete rejects unbounded values and does not access MongoDB for short input', async () => {
  assert.deepEqual(await suggestSearch('a'), { items: [], correction: null });
  await assert.rejects(
    () => suggestSearch('x'.repeat(61)),
    (error) => error.statusCode === 422 && error.code === 'SEARCH_SUGGEST_TOO_LONG',
  );
});

test('search validates dates and property numeric bounds without silently widening filters', () => {
  const now = new Date('2026-11-25T12:00:00.000Z');
  assert.equal(parseSearchFilters({ days: '7' }, now).since.toISOString(),
    '2026-11-18T12:00:00.000Z');
  assert.equal(parseSearchFilters({}).propertyListingFilter, null);
  const { propertyListingFilter: listing } = parseSearchFilters({
    type: 'property', minPrice: '1000000000', maxPrice: '3000000000',
    minArea: '60', maxArea: '150', transactionType: 'sale',
    propertyType: 'land',
  }, now);
  assert.equal(listing.price.$gte, 1e9);
  assert.equal(listing.price.$lte, 3e9);
  assert.equal(listing.priceUnit, 'total');
  assert.equal(listing.landArea.$gte, 60);
  assert.equal(listing.transactionType, 'sale');
  assert.equal(listing.propertyType, 'land');
  assert.equal(listing.expiresAt.$gt.getTime(), now.getTime());

  for (const input of [
    { days: 365 }, { type: 'all', minPrice: 1 },
    { type: 'property', minArea: 'NaN' },
    { type: 'property', minPrice: '200', maxPrice: '100' },
    { type: 'property', propertyType: { $gt: '' } },
    { type: 'property', transactionType: 'admin' },
  ]) {
    assert.throws(() => parseSearchFilters(input), (error) =>
      error.statusCode === 422);
  }
});
