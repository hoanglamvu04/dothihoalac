const ALLOWED = new Set([
  'newest',
  'oldest',
  'popular',
  'most_commented',
  'price_asc',
  'price_desc',
  'area_asc',
  'area_desc',
]);

export function buildSort(value = 'newest') {
  const sort = ALLOWED.has(value) ? value : 'newest';
  const map = {
    newest: { publishedAt: -1, createdAt: -1 },
    oldest: { publishedAt: 1, createdAt: 1 },
    popular: { viewCount: -1, publishedAt: -1 },
    most_commented: { commentCount: -1, publishedAt: -1 },
    price_asc: { price: 1, createdAt: -1 },
    price_desc: { price: -1, createdAt: -1 },
    area_asc: { landArea: 1, createdAt: -1 },
    area_desc: { landArea: -1, createdAt: -1 },
  };
  return map[sort];
}
