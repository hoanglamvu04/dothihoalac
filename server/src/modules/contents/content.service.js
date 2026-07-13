import Content from './content.model.js';
import ContentBody from './contentBody.model.js';
import ContentRevision from './contentRevision.model.js';
import { createUniqueSlug } from '../../services/slug.service.js';
import { cleanHtml, htmlToPlainText } from '../../utils/sanitizeHtml.js';
import ApiError from '../../utils/ApiError.js';

function calculateBodyStats(bodyText) {
  const words = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;
  return { wordCount: words, readingTime: Math.max(1, Math.ceil(words / 220)) };
}

export async function createContentWithBody({
  authorId,
  contentType,
  title,
  summary = '',
  bodyHtml = '',
  status = 'draft',
  visibility = 'public',
  allowComments = true,
  primaryCategoryId = null,
  primaryAreaId = null,
  categoryIds = [],
  tagIds = [],
  areaIds = [],
  thumbnailMediaId = null,
  isSponsored = false,
}) {
  const sanitizedHtml = cleanHtml(bodyHtml);
  const bodyText = htmlToPlainText(sanitizedHtml);
  const slug = await createUniqueSlug(Content, title);
  const content = await Content.create({
    authorId,
    contentType,
    title,
    slug,
    summary,
    bodyText,
    status,
    visibility,
    allowComments,
    primaryCategoryId,
    primaryAreaId,
    categoryIds,
    tagIds,
    areaIds,
    thumbnailMediaId,
    isSponsored,
  });
  const stats = calculateBodyStats(bodyText);
  try {
    await ContentBody.create({
      contentId: content._id,
      bodyHtml: sanitizedHtml,
      bodyText,
      ...stats,
    });
  } catch (error) {
    await Content.deleteOne({ _id: content._id });
    throw error;
  }
  return content;
}

export async function updateContentWithBody(content, changes, actorId, changeNote = '') {
  const previous = {
    title: content.title,
    summary: content.summary,
    bodyHtml: (await ContentBody.findOne({ contentId: content._id }).lean())?.bodyHtml ?? '',
  };
  const revisionNumber = (await ContentRevision.countDocuments({ contentId: content._id })) + 1;
  await ContentRevision.create({
    contentId: content._id,
    revisionNumber,
    ...previous,
    changedBy: actorId,
    changeNote,
  });

  if (changes.title && changes.title !== content.title) {
    content.title = changes.title;
    content.slug = await createUniqueSlug(Content, changes.title, { excludeId: content._id });
  }
  const allowed = [
    'summary',
    'visibility',
    'allowComments',
    'primaryCategoryId',
    'primaryAreaId',
    'categoryIds',
    'tagIds',
    'areaIds',
    'thumbnailMediaId',
    'isSponsored',
  ];
  for (const key of allowed) if (changes[key] !== undefined) content[key] = changes[key];

  if (changes.bodyHtml !== undefined) {
    const bodyHtml = cleanHtml(changes.bodyHtml);
    const bodyText = htmlToPlainText(bodyHtml);
    const stats = calculateBodyStats(bodyText);
    content.bodyText = bodyText;
    await ContentBody.findOneAndUpdate(
      { contentId: content._id },
      { bodyHtml, bodyText, ...stats },
      { upsert: true },
    );
  }
  await content.save();
  return content;
}

export async function getPublishedContentBySlug(slug, contentType) {
  const content = await Content.findOne({ slug, contentType, status: 'published', deletedAt: null })
    .populate('authorId', 'username displayName emailVerifiedAt phoneVerifiedAt')
    .populate('primaryCategoryId', 'name slug')
    .populate('primaryAreaId', 'name slug areaType')
    .populate('thumbnailMediaId', 'publicUrl altText width height')
    .lean();
  if (!content) throw new ApiError(404, 'Không tìm thấy nội dung.', 'CONTENT_NOT_FOUND');
  const body = await ContentBody.findOne({ contentId: content._id }).lean();
  await Content.updateOne({ _id: content._id }, { $inc: { viewCount: 1 } });
  return { ...content, body, viewCount: content.viewCount + 1 };
}

export async function getOwnedContentOrThrow(id, userId, contentType) {
  const content = await Content.findOne({
    _id: id,
    authorId: userId,
    contentType,
    deletedAt: null,
  });
  if (!content)
    throw new ApiError(
      404,
      'Không tìm thấy nội dung hoặc bạn không có quyền.',
      'CONTENT_NOT_FOUND',
    );
  return content;
}

export function assertEditable(content) {
  if (!['draft', 'needs_revision', 'rejected'].includes(content.status)) {
    throw new ApiError(
      409,
      'Nội dung ở trạng thái hiện tại không thể chỉnh sửa.',
      'CONTENT_NOT_EDITABLE',
    );
  }
}
