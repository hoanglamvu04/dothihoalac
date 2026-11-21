import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import ContentRevision from '../contents/contentRevision.model.js';
import Media from '../media/media.model.js';
import Article from './article.model.js';
import ApiError from '../../utils/ApiError.js';
import { updateContentWithBody } from '../contents/content.service.js';
import { adminArticleDetail } from './article.admin.detail.service.js';
import { articleQualityChecks } from './article.quality.js';

async function getArticleContent(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'ID bài viết không hợp lệ.', 'INVALID_ARTICLE_ID');
  }

  const content = await Content.findOne({
    _id: id,
    contentType: 'article',
    deletedAt: null,
  });

  if (!content) {
    throw new ApiError(404, 'Không tìm thấy bài viết.', 'ARTICLE_NOT_FOUND');
  }
  return content;
}

export async function articleQualityReport(id) {
  const content = await getArticleContent(id);
  const [body, cover] = await Promise.all([
    ContentBody.findOne({ contentId: content._id }).lean(),
    content.thumbnailMediaId
      ? Media.findOne({
          _id: content.thumbnailMediaId,
          deletedAt: null,
          status: 'active',
        }).select('secureUrl url').lean()
      : null,
  ]);

  return articleQualityChecks({
    content,
    body,
    hasCover: Boolean(cover?.secureUrl || cover?.url),
  });
}

export async function listArticleRevisions(id, limit = 25) {
  const content = await getArticleContent(id);
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 25));
  return ContentRevision.find({ contentId: content._id })
    .sort({ revisionNumber: -1 })
    .limit(safeLimit)
    .select('revisionNumber title summary changeNote changedBy createdAt')
    .populate('changedBy', 'displayName username')
    .lean();
}

export async function articleRevisionDetail(id, revisionNumber) {
  const content = await getArticleContent(id);
  const number = Number(revisionNumber);

  if (!Number.isInteger(number) || number < 1) {
    throw new ApiError(400, 'Số phiên bản không hợp lệ.', 'INVALID_REVISION');
  }

  const revision = await ContentRevision.findOne({
    contentId: content._id,
    revisionNumber: number,
  }).lean();

  if (!revision) {
    throw new ApiError(404, 'Không tìm thấy phiên bản.', 'REVISION_NOT_FOUND');
  }

  return revision;
}

/**
 * Only standalone unpublished articles can be rolled back in the CMS.
 * Google Docs remains the source of truth for linked documents; pretending to
 * restore the CMS would be overwritten during the next sync and be misleading.
 * Publish state and permissions are intentionally NOT restored.
 */
export async function restoreArticleRevision(id, revisionNumber, actorId) {
  const content = await getArticleContent(id);
  if (!['draft', 'needs_revision', 'rejected', 'approved'].includes(content.status)) {
    throw new ApiError(
      409,
      'Chỉ có thể khôi phục nội dung của bài chưa xuất bản.',
      'ARTICLE_REVISION_RESTORE_NOT_ALLOWED',
    );
  }

  const doc = await Article.findOne({ contentId: content._id })
    .select('googleDocId')
    .lean();

  if (doc?.googleDocId) {
    throw new ApiError(
      409,
      'Bài liên kết Google Docs phải dùng lịch sử phiên bản trong Google Docs để tránh ghi đè dữ liệu.',
      'ARTICLE_REVISION_GOOGLE_DOCS_SOURCE_OF_TRUTH',
    );
  }

  const revision = await articleRevisionDetail(id, revisionNumber);
  await updateContentWithBody(
    content,
    {
      title: revision.title,
      summary: revision.summary,
      bodyHtml: revision.bodyHtml,
    },
    actorId,
    'Khôi phục nội dung từ phiên bản #' + revision.revisionNumber,
  );

  return adminArticleDetail(content._id);
}
