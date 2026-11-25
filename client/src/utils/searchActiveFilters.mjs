// Pure URL filter helpers for the public search page. Do not forward unknown
// parameters, and do not expose property filters in unrelated search tabs.
export const PROPERTY_FILTER_KEYS = Object.freeze([
  'transactionType', 'propertyType', 'minPrice',
  'maxPrice', 'minArea', 'maxArea',
]);
export const ADVANCED_FILTER_KEYS = Object.freeze(['days', ...PROPERTY_FILTER_KEYS]);

const dayLabels = { '7': '7 ngày gần đây', '30': '30 ngày gần đây', '90': '90 ngày gần đây' };
const transactionLabels = { sale: 'Bán', rent: 'Cho thuê' };
const typeLabels = {
  land: 'Đất', residential_land: 'Đất ở', house: 'Nhà ở',
  apartment: 'Căn hộ', room: 'Phòng trọ',
};
const formatNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

function validNonnegativeNumber(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function moneyLabel(value) {
  const amount = validNonnegativeNumber(value);
  if (amount === null) return '';
  if (amount >= 1e9) return formatNumber.format(amount / 1e9) + ' tỷ ₫';
  return formatNumber.format(amount / 1e6) + ' triệu ₫';
}

export function listActiveSearchFilters(params, type = 'all') {
  const active = [];
  const days = params?.get?.('days') || '';
  if (dayLabels[days]) active.push({ key: 'days', label: dayLabels[days] });
  if (type !== 'property') return active;
  const transaction = params?.get?.('transactionType') || '';
  const propertyType = params?.get?.('propertyType') || '';
  if (transactionLabels[transaction]) {
    active.push({ key: 'transactionType', label: transactionLabels[transaction] });
  }
  if (typeLabels[propertyType]) {
    active.push({ key: 'propertyType', label: typeLabels[propertyType] });
  }
  for (const key of ['minPrice', 'maxPrice']) {
    const label = moneyLabel(params?.get?.(key));
    if (label) active.push({
      key,
      label: (key === 'minPrice' ? 'Giá từ ' : 'Giá đến ') + label,
    });
  }
  for (const key of ['minArea', 'maxArea']) {
    const n = validNonnegativeNumber(params?.get?.(key));
    if (n !== null) active.push({
      key,
      label: (key === 'minArea' ? 'Diện tích từ ' : 'Diện tích đến ') +
        formatNumber.format(n) + ' m²',
    });
  }
  return active;
}

export function removeSearchFilter(params, key) {
  const next = new URLSearchParams(params?.toString?.() || '');
  if (ADVANCED_FILTER_KEYS.includes(key)) {
    next.delete(key);
    next.delete('page'); // Removing a filter changes the result set.
  }
  return next;
}

export function clearAdvancedSearchFilters(params) {
  const next = new URLSearchParams(params?.toString?.() || '');
  for (const field of ADVANCED_FILTER_KEYS) next.delete(field);
  next.delete('page');
  return next;
}

// Prices are entered in millions of VND. Return a safe atomic result so the
// page never writes partial or inverted price/area ranges into the URL.
export function validatePropertyFilterForm(form = {}) {
  const values = {};
  const transaction = String(form.transactionType || '');
  const propertyType = String(form.propertyType || '');
  if (transaction && !transactionLabels[transaction]) {
    return { values: null, error: 'Loại giao dịch không hợp lệ.' };
  }
  if (propertyType && !typeLabels[propertyType]) {
    return { values: null, error: 'Loại hình bất động sản không hợp lệ.' };
  }
  if (transaction) values.transactionType = transaction;
  if (propertyType) values.propertyType = propertyType;

  const parsed = {};
  for (const key of ['minPrice', 'maxPrice', 'minArea', 'maxArea']) {
    const raw = String(form[key] ?? '').trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 1e9) {
      return { values: null, error: 'Giá và diện tích phải là số không âm hợp lệ.' };
    }
    parsed[key] = n;
    values[key] = key.endsWith('Price')
      ? String(n * 1e6)
      : String(n);
  }
  if (parsed.minPrice !== undefined && parsed.maxPrice !== undefined &&
      parsed.minPrice > parsed.maxPrice) {
    return { values: null, error: 'Giá từ không được lớn hơn giá đến.' };
  }
  if (parsed.minArea !== undefined && parsed.maxArea !== undefined &&
      parsed.minArea > parsed.maxArea) {
    return { values: null, error: 'Diện tích từ không được lớn hơn diện tích đến.' };
  }
  return { values, error: '' };
}
