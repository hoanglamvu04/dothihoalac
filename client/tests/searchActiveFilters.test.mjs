import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADVANCED_FILTER_KEYS, listActiveSearchFilters, removeSearchFilter,
  clearAdvancedSearchFilters, validatePropertyFilterForm,
} from '../src/utils/searchActiveFilters.mjs';

test('active filter chips describe URL criteria in Vietnamese, preserving zero', () => {
  const url = new URLSearchParams(
    'q=thach-that&type=property&days=30&transactionType=sale&propertyType=land' +
    '&minPrice=1000000000&maxPrice=3000000000&minArea=0&maxArea=150',
  );
  const fields = listActiveSearchFilters(url, 'property');
  assert.deepEqual(fields.map((item) => item.key), ADVANCED_FILTER_KEYS);
  assert.ok(fields.some((item) => item.label.includes('1 tỷ')));
  assert.ok(fields.some((item) => item.label.includes('0 m²')));
  assert.ok(fields.every((item) => !item.label.includes('undefined')));
});

test('non-property tabs ignore dormant real estate params', () => {
  const url = new URLSearchParams('type=article&days=7&minPrice=3000000000&propertyType=land');
  assert.deepEqual(listActiveSearchFilters(url, 'article'), [
    { key: 'days', label: '7 ngày gần đây' },
  ]);
  assert.deepEqual(listActiveSearchFilters(new URLSearchParams('days=hack'), 'article'), []);
});

test('removing one chip preserves keyword, type, area, sort and resets pagination', () => {
  const source = new URLSearchParams('q=hoa+lac&type=property&area=thach-that&sort=newest&page=3&days=7&minPrice=100');
  const without = removeSearchFilter(source, 'minPrice');
  assert.equal(without.get('q'), 'hoa lac');
  assert.equal(without.get('area'), 'thach-that');
  assert.equal(without.get('sort'), 'newest');
  assert.equal(without.get('minPrice'), null);
  assert.equal(without.get('days'), '7');
  assert.equal(without.get('page'), null);
  assert.equal(source.get('page'), '3', 'original params remain unchanged');
});

test('clearing all chips keeps keyword and area but removes filters and page', () => {
  const url = new URLSearchParams('q=quy+hoach&area=thach-that&type=property&page=9&days=7&minArea=80&maxPrice=300');
  const cleared = clearAdvancedSearchFilters(url);
  assert.equal(cleared.get('q'), 'quy hoach');
  assert.equal(cleared.get('area'), 'thach-that');
  assert.equal(cleared.get('type'), 'property');
  assert.equal(cleared.get('page'), null);
  assert.ok(ADVANCED_FILTER_KEYS.every((key) => !cleared.has(key)));
});

test('valid property price ranges are transformed from million VND to VND', () => {
  assert.deepEqual(validatePropertyFilterForm({
    transactionType: 'sale', propertyType: 'land',
    minPrice: '1200', maxPrice: '3000',
    minArea: '0', maxArea: '120.5',
  }), {
    error: '',
    values: {
      transactionType: 'sale', propertyType: 'land',
      minPrice: '1200000000', maxPrice: '3000000000',
      minArea: '0', maxArea: '120.5',
    },
  });
});

test('invalid and inverted ranges do not yield a partial filter', () => {
  const cases = [
    [{ minPrice: '500', maxPrice: '300' }, 'Giá từ'],
    [{ minArea: '150', maxArea: '120' }, 'Diện tích từ'],
    [{ minPrice: '-10' }, 'số không âm'],
    [{ maxArea: 'Infinity' }, 'số không âm'],
    [{ minPrice: 'NaN' }, 'số không âm'],
    [{ propertyType: 'unknown' }, 'Loại hình'],
  ];
  for (const [form, message] of cases) {
    const result = validatePropertyFilterForm(form);
    assert.equal(result.values, null);
    assert.match(result.error, new RegExp(message));
  }
});
