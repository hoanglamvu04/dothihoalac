// Normalize only for comparison in the UI. The server remains the authority
// for creating subscriptions and resolving area IDs.
const SEARCH_ALIASES = new Map([
  ['bds', 'bat dong san'],
  ['nha dat', 'bat dong san'],
  ['dhqg', 'dai hoc quoc gia'],
  ['kcn', 'khu cong nghiep'],
  ['kdt', 'khu do thi'],
  ['qhoach', 'quy hoach'],
]);

export function normalizedSavedSearchQuery(value = '') {
  const folded = String(value || '')
    .toLocaleLowerCase('vi-VN')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return SEARCH_ALIASES.get(folded) || folded;
}

function normalizeArea(value) {
  const raw = typeof value === 'object' && value !== null
    ? value._id || value.id || value.toString?.() || ''
    : value;
  return String(raw || '').trim().toLowerCase();
}

/**
 * Match both area slugs and ObjectIds. Area pages pass an ObjectId while
 * saved-search read APIs return areaSlug and areaId independently.
 */
export function findSavedSearch(items = [], { query = '', contentType = 'all', area = '' } = {}) {
  if (!Array.isArray(items)) return null;

  const wantedQuery = normalizedSavedSearchQuery(query);
  const wantedArea = normalizeArea(area);
  return items.find((item) => {
    if (item?.contentType !== contentType) return false;
    const storedQuery = item.queryNormalized || item.query;
    if (normalizedSavedSearchQuery(storedQuery) !== wantedQuery) return false;

    const savedAreaId = normalizeArea(item.areaId);
    const savedAreaSlug = normalizeArea(item.areaSlug);
    return wantedArea
      ? savedAreaId === wantedArea || savedAreaSlug === wantedArea
      : !savedAreaId && !savedAreaSlug;
  }) || null;
}
