import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import { articleSeoIssues } from './article.seoAudit.js';

const PUBLISHED = {
  contentType: 'article',
  status: 'published',
  visibility: 'public',
  deletedAt: null,
};

export async function articleSeoOverview() {
  const [totalPublished, articles] = await Promise.all([
    Content.countDocuments(PUBLISHED),
    Content.find(PUBLISHED)
      .select('title slug summary thumbnailMediaId primaryCategoryId publishedAt updatedAt')
      .sort({ publishedAt: -1, _id: -1 })
      .limit(150)
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

  const items = articles.map((article) => {
    const issues = articleSeoIssues(
      article,
      bodyMap.get(String(article._id)) || {},
    );

    return {
      _id: article._id,
      slug: article.slug,
      title: article.title,
      publishedAt: article.publishedAt,
      issues,
      issueCount: issues.length,
    };
  });

  return {
    scanned: items.length,
    totalPublished,
    withIssues: items.filter((item) => item.issueCount).length,
    missingCover: items.filter((item) =>
      item.issues.some((issue) => issue.code === 'missing_cover')).length,
    missingDescription: items.filter((item) =>
      item.issues.some((issue) => issue.code === 'short_description')).length,
    items,
    generatedAt: new Date().toISOString(),
    note: 'Kiểm tra metadata và cấu trúc của tối đa 150 bài mới nhất, không kiểm tra trạng thái index Google Search Console.',
  };
}
