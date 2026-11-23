import Content from '../contents/content.model.js';
import ApiError from '../../utils/ApiError.js';
import { tokenSimilarity } from '../../utils/vietnameseSearch.js';

function id(value) {
  return String(value?._id || value || '');
}

export function articleRelevance(source, candidate, now = Date.now()) {
  const category = id(source.primaryCategoryId) && id(source.primaryCategoryId) === id(candidate.primaryCategoryId) ? 5 : 0;
  const area = id(source.primaryAreaId) && id(source.primaryAreaId) === id(candidate.primaryAreaId) ? 4 : 0;
  const sourceTags = new Set((source.tagIds || []).map(id));
  const overlap = (candidate.tagIds || []).filter((tag) => sourceTags.has(id(tag))).length;
  const title = tokenSimilarity(source.title, candidate.title) * 3;
  const days = Math.max(0, (now - new Date(candidate.publishedAt || 0).getTime()) / 86_400_000);
  const freshness = 2 / (1 + days / 14);
  return category + area + Math.min(overlap, 3) * 2 + title + freshness;
}

export async function relatedArticles(slug) {
  const publicFilter = {
    contentType: 'article',
    status: 'published',
    visibility: 'public',
    deletedAt: null,
  };
  const source = await Content.findOne({ ...publicFilter, slug })
    .select('title primaryCategoryId primaryAreaId tagIds').lean();
  if (!source) throw new ApiError(404, 'Không tìm thấy bài viết.', 'ARTICLE_NOT_FOUND');

  const candidates = await Content.find({
    ...publicFilter,
    _id: { $ne: source._id },
  })
    .select('title slug summary primaryCategoryId primaryAreaId tagIds thumbnailMediaId publishedAt viewCount isSponsored')
    .sort({ publishedAt: -1, _id: -1 })
    .limit(120)
    .populate('primaryCategoryId', 'name slug')
    .populate('primaryAreaId', 'name slug')
    .populate('thumbnailMediaId', 'url secureUrl altText width height')
    .lean();

  return candidates
    .map((candidate) => ({
      candidate,
      score: articleRelevance(source, candidate),
    }))
    .sort((a, b) =>
      b.score - a.score ||
      new Date(b.candidate.publishedAt || 0).getTime() - new Date(a.candidate.publishedAt || 0).getTime(),
    )
    .slice(0, 8)
    .map(({ candidate }) => candidate);
}
