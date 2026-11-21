import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import Media from '../media/media.model.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { articleSeoIssues } from './article.seoAudit.js';

const PUBLISHED = {
  contentType: 'article',
  status: 'published',
  visibility: 'public',
  deletedAt: null,
};

function normalizeTitleQuery(value) {
  const q = String(value || '').trim().slice(0, 90);
  // Escape regex metacharacters to treat search as literal title text.
  return q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function articleSeoOverview(options = {}) {
  const { page } = parsePagination(options, { page: 1, limit: 25 });
  // Bound each server request to avoid scanning every article body in memory.
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 25));
  const effectiveSkip = (page - 1) * limit;
  const search = normalizeTitleQuery(options.q);
  const filter = search
    ? { ...PUBLISHED, title: { $regex: search, $options: 'i' } }
    : PUBLISHED;

  const [totalPublished, matchingPublished, articles] = await Promise.all([
    Content.countDocuments(PUBLISHED),
    Content.countDocuments(filter),
    Content.find(filter)
      .select('title slug summary thumbnailMediaId primaryCategoryId publishedAt updatedAt')
      .sort({ publishedAt: -1, _id: -1 })
      .skip(effectiveSkip)
      .limit(limit)
      .lean(),
  ]);

  const bodies = articles.length
    ? await ContentBody.find({
        contentId: { $in: articles.map((item) => item._id) },
      })
        .select('contentId bodyText inlineMediaIds')
        .lean()
    : [];

  const bodyMap = new Map(
    bodies.map((body) => [String(body.contentId), body]),
  );
  const referencedMediaIds = [
    ...articles.map((item) => item.thumbnailMediaId),
    ...bodies.flatMap((body) => body.inlineMediaIds || []),
  ].filter(Boolean);

  const activeMedia = referencedMediaIds.length
    ? await Media.find({
        _id: { $in: referencedMediaIds },
        status: 'active',
        deletedAt: null,
        resourceType: 'image',
      }).select('_id url secureUrl').lean()
    : [];

  const validMediaIds = new Set(
    activeMedia
      .filter((media) => Boolean(media.secureUrl || media.url))
      .map((media) => String(media._id)),
  );

  const items = articles.map((article) => {
    const body = bodyMap.get(String(article._id)) || {};
    const inlineMediaIds = body.inlineMediaIds || [];
    const validInlineCount = inlineMediaIds.filter((id) =>
      validMediaIds.has(String(id))).length;
    const validCover = Boolean(
      article.thumbnailMediaId &&
      validMediaIds.has(String(article.thumbnailMediaId)),
    );
    const issues = articleSeoIssues(article, body, {
      hasImage: validCover || validInlineCount > 0,
      inactiveCover: Boolean(article.thumbnailMediaId && !validCover),
      invalidInlineCount: inlineMediaIds.length - validInlineCount,
    });

    return {
      _id: article._id,
      slug: article.slug,
      title: article.title,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      issues,
      issueCount: issues.length,
    };
  });

  return {
    scanned: items.length,
    totalPublished,
    matchingPublished,
    withIssues: items.filter((item) => item.issueCount > 0).length,
    missingCover: items.filter((item) =>
      item.issues.some((issue) => issue.code === 'missing_cover')).length,
    missingDescription: items.filter((item) =>
      item.issues.some((issue) => issue.code === 'short_description')).length,
    items,
    meta: buildPaginationMeta({ page, limit, total: matchingPublished }),
    generatedAt: new Date().toISOString(),
    note: 'Đánh giá các bài trong trang kết quả hiện tại bằng Media Library; không xác minh URL ảnh qua mạng hay tình trạng lập chỉ mục Search Console.',
  };
}
