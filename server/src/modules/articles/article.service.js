import Content from '../contents/content.model.js';
import Article from './article.model.js';
import NewsTip from './newsTip.model.js';
import {
  createContentWithBody,
  getPublishedContentBySlug,
  updateContentWithBody,
} from '../contents/content.service.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { escapeRegex } from '../../utils/escapeRegex.js';
import ApiError from '../../utils/ApiError.js';
export async function list(query) {
  const { page, limit, skip } = parsePagination(query);
  const f = { contentType: 'article', status: 'published', deletedAt: null };
  if (query.category) f.primaryCategoryId = query.category;
  if (query.area) f.primaryAreaId = query.area;
  if (query.tag) f.tagIds = query.tag;
  if (query.q)
    f.$or = [
      { title: new RegExp(escapeRegex(query.q), 'i') },
      { summary: new RegExp(escapeRegex(query.q), 'i') },
    ];
  const [items, total] = await Promise.all([
    Content.find(f)
      .populate('authorId', 'username displayName')
      .populate('primaryCategoryId', 'name slug')
      .populate('primaryAreaId', 'name slug')
      .populate('thumbnailMediaId', 'publicUrl altText')
      .sort(query.sort === 'popular' ? { viewCount: -1, publishedAt: -1 } : { publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(f),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
export async function detail(slug) {
  const base = await getPublishedContentBySlug(slug, 'article');
  const article = await Article.findOne({ contentId: base._id })
    .populate('editorId', 'username displayName')
    .lean();
  return { ...base, article };
}
export async function submitTip(userId, data) {
  return NewsTip.create({ ...data, userId });
}
export async function adminCreate(userId, data) {
  const status = data.status ?? 'draft';
  const content = await createContentWithBody({
    authorId: userId,
    contentType: 'article',
    ...data,
    status,
  });
  if (status === 'published') content.publishedAt = new Date();
  if (status === 'scheduled') content.scheduledAt = data.scheduledAt;
  await content.save();
  await Article.create({
    contentId: content._id,
    articleType: data.articleType,
    editorId: userId,
    sourceNote: data.sourceNote,
  });
  return content;
}
export async function adminUpdate(id, userId, data) {
  const content = await Content.findOne({ _id: id, contentType: 'article', deletedAt: null });
  if (!content) throw new ApiError(404, 'Không tìm thấy bài viết.', 'ARTICLE_NOT_FOUND');
  await updateContentWithBody(content, data, userId, 'Admin update');
  await Article.findOneAndUpdate(
    { contentId: id },
    { articleType: data.articleType, sourceNote: data.sourceNote, editorId: userId },
    { upsert: true },
  );
  return content;
}
export async function adminList(query) {
  const { page, limit, skip } = parsePagination(query);
  const f = { contentType: 'article', deletedAt: null };
  if (query.status) f.status = query.status;
  const [items, total] = await Promise.all([
    Content.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Content.countDocuments(f),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
