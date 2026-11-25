/**
 * The public search screen stores advanced filters in the URL. Always pass
 * these values to the API; otherwise the UI displays selected filters while
 * the backend returns unfiltered results. Unknown params never reach search.
 */
const PROPERTY_FIELDS = Object.freeze([
  'propertyType', 'transactionType',
  'minPrice', 'maxPrice', 'minArea', 'maxArea',
]);

export function buildSearchRequestParams(searchParams, base = {}) {
  const result = { ...base };
  const fields = base.type === 'property'
    ? ['days', ...PROPERTY_FIELDS]
    : ['days'];
  for (const field of fields) {
    const value = searchParams?.get?.(field);
    if (typeof value === 'string' && value.trim()) result[field] = value.trim();
  }
  return result;
}
