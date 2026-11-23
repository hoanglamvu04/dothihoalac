import test from 'node:test';
import assert from 'node:assert/strict';

import {
  foldVietnamese,
  normalizeSearchQuery,
  normalizedTitleTokens,
  tokenSimilarity,
  vietnameseSearchRegex,
} from '../../src/utils/vietnameseSearch.js';
import { articleRelevance } from '../../src/modules/articles/article.related.service.js';
import { search } from '../../src/modules/search/search.service.js';

test('Vietnamese text is folded and abbreviations expanded deterministically', () => {
  assert.equal(foldVietnamese('Đô Thị Hòa Lạc – Quy Hoạch'), 'do thi hoa lac quy hoach');
  assert.equal(normalizeSearchQuery('BĐS'), 'bat dong san');
  assert.equal(normalizeSearchQuery('ĐHQG'), 'dai hoc quoc gia');
  assert.deepEqual(normalizedTitleTokens('Hòa Lạc Hòa Lạc'), ['hoa', 'lac']);
});

test('Vietnamese query matches both accented and unaccented public titles', () => {
  const expression = vietnameseSearchRegex('hoa lac');
  assert.equal(expression.test('Tin tức Hòa Lạc hôm nay'), true);
  assert.equal(expression.test('HOA LAC'), true);
  assert.equal(expression.test('Tin từ Sóc Sơn'), false);
  assert.equal(vietnameseSearchRegex('   '), null);
});

test('User input cannot inject a wildcard or an unbounded regex', () => {
  const expression = vietnameseSearchRegex('hoa (.*) lac');
  assert.equal(expression.test('Hòa bất kỳ Lạc'), false);
  assert.equal(expression.test('Hòa Lạc'), true);
  assert.ok(expression.source.length <= 1500);
});

test('Similarity is accent-insensitive and does not match unrelated titles', () => {
  assert.equal(tokenSimilarity('Nhà đất Hòa Lạc', 'Nha dat Hoa Lac'), 1);
  assert.equal(tokenSimilarity('Tin tức Thạch Thất', 'Bán đất ở Hòa Lạc') < 0.25, true);
});

test('Related articles favor same region and category over unrelated popular posts', () => {
  const now = Date.now();
  const source = { title: 'Tin mới tại Hòa Lạc', primaryCategoryId: 'cat1', primaryAreaId: 'area1', tagIds: ['t1'] };
  const local = { title: 'Đời sống Hòa Lạc', primaryCategoryId: { _id: 'cat1' }, primaryAreaId: { _id: 'area1' }, tagIds: ['t1'], publishedAt: new Date(now) };
  const remote = { title: 'Giải bóng đá toàn quốc', primaryCategoryId: 'cat2', primaryAreaId: 'area2', tagIds: [], publishedAt: new Date(now), viewCount: 1000000 };
  assert.ok(articleRelevance(source, local, now) > articleRelevance(source, remote, now));
});


test('Punctuation-only searches are rejected instead of returning all public posts', async () => {
  await assert.rejects(() => search({ q: '!!!' }), (error) => error.code === 'SEARCH_QUERY_INVALID');
});
