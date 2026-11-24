import Content from '../contents/content.model.js';
import Area from '../taxonomy/area.model.js';
import ApiError from '../../utils/ApiError.js';
import { foldVietnamese, normalizeSearchQuery, vietnameseSearchRegex } from '../../utils/vietnameseSearch.js';

const TERMS = Object.freeze([
  'Hòa Lạc', 'Thạch Thất', 'Quốc Oai', 'Quy hoạch', 'Bất động sản',
  'Nhà đất', 'Việc làm', 'Khu công nghiệp', 'Đại học Quốc gia', 'Công nghệ cao',
]);
const PATHS = Object.freeze({
  article: 'tin-tuc', property: 'bat-dong-san',
  community: 'cong-dong', job: 'viec-lam',
});

function boundedDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let col = 1; col <= b.length; col += 1) {
      current[col] = Math.min(
        previous[col] + 1, current[col - 1] + 1,
        previous[col - 1] + Number(a[row - 1] !== b[col - 1]),
      );
    }
    if (Math.min(...current) > 2) return 3;
    previous = current;
  }
  return previous[b.length];
}

export function spellingSuggestion(value) {
  const folded = foldVietnamese(value).slice(0, 100);
  if (folded.length < 4) return null;
  if (normalizeSearchQuery(folded) !== folded) return null;
  let best = null;
  for (const term of TERMS) {
    const target = foldVietnamese(term);
    if (target === folded) return null;
    const distance = boundedDistance(folded, target);
    if (distance < 1 || distance > (folded.length >= 7 ? 2 : 1)) continue;
    if (!best || distance < best.distance) best = { term, distance };
  }
  return best?.term || null;
}

export async function suggestSearch(input = '') {
  const q = String(input || '').trim().replace(/\s+/g, ' ');
  if (q.length > 60) throw new ApiError(422, 'Từ khóa gợi ý quá dài.', 'SEARCH_SUGGEST_TOO_LONG');
  if (q.length < 2) return { items: [], correction: null };
  const regex = vietnameseSearchRegex(q);
  if (!regex) return { items: [], correction: null };

  // All suggestions are explicitly projected, public and approved.
  const [areas, contents] = await Promise.all([
    Area.find({ isActive: true, name: regex })
      .select('name slug').sort({ name: 1 }).limit(4).maxTimeMS(2500).lean(),
    Content.find({
      status: 'published', visibility: 'public', deletedAt: null,
      contentType: { $in: Object.keys(PATHS) },
      $or: [{ title: regex }, { summary: regex }],
    })
      .select('title slug contentType')
      .sort({ publishedAt: -1, _id: -1 }).limit(8).maxTimeMS(2500).lean(),
  ]);

  const seen = new Set();
  const items = [];
  function add(item) {
    const key = foldVietnamese(item.label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push(item);
  }
  for (const area of areas) {
    if (!area.slug) continue;
    add({
      label: String(area.name).slice(0, 120),
      type: 'area',
      href: '/khu-vuc/' + encodeURIComponent(area.slug),
    });
  }
  for (const content of contents) {
    const section = PATHS[content.contentType];
    if (!section || !content.slug) continue;
    add({
      label: String(content.title).slice(0, 120),
      type: content.contentType,
      href: '/' + section + '/' + encodeURIComponent(content.slug),
    });
    if (items.length >= 8) break;
  }
  return { items: items.slice(0, 8), correction: spellingSuggestion(q) };
}
