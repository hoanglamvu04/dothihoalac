import mongoose from 'mongoose';
import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import Media from '../media/media.model.js';
import Article from './article.model.js';
import ApiError from '../../utils/ApiError.js';

export async function getAdminArticleDetail(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(
      400,
      'ID bài viết không hợp lệ.',
      'INVALID_ARTICLE_ID',
    );
  }

  const content = await Content.findOne({
    _id: id,
    contentType: 'article',
    deletedAt: null,
  }).lean();

  if (!content) {
    throw new ApiError(
      404,
      'Không tìm thấy bài viết.',
      'ARTICLE_NOT_FOUND',
    );
  }

  const [body, article, thumbnail] = await Promise.all([
    ContentBody.findOne({ contentId: content._id }).lean(),
    Article.findOne({ contentId: content._id }).lean(),
    content.thumbnailMediaId
      ? Media.findOne({
          _id: content.thumbnailMediaId,
          deletedAt: null,
        }).lean()
      : null,
  ]);

  return {
    ...content,
    thumbnailMediaId: thumbnail || content.thumbnailMediaId || null,
    body: body || {
      contentId: content._id,
      bodyHtml: '',
      bodyText: content.bodyText || '',
      readingTime: 1,
      wordCount: 0,
      inlineMediaIds: [],
    },
    article: article || null,
  };
}
