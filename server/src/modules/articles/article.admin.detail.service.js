import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import Article from './article.model.js';
import User from '../users/user.model.js';
import Category from '../taxonomy/category.model.js';
import Area from '../taxonomy/area.model.js';
import Tag from '../taxonomy/tag.model.js';
import Media from '../media/media.model.js';
import ApiError from '../../utils/ApiError.js';

export async function adminArticleDetail(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'ID bài viết không hợp lệ.', 'INVALID_ARTICLE_ID');
  }

  const content = await Content.findOne({
    _id: id,
    contentType: 'article',
    deletedAt: null,
  })
    .populate({ path: 'authorId', model: User, select: 'username displayName email status' })
    .populate({ path: 'primaryCategoryId', model: Category, select: 'name slug contentScope' })
    .populate({ path: 'primaryAreaId', model: Area, select: 'name slug areaType' })
    .populate({ path: 'categoryIds', model: Category, select: 'name slug contentScope' })
    .populate({ path: 'tagIds', model: Tag, select: 'name slug' })
    .populate({ path: 'areaIds', model: Area, select: 'name slug areaType' })
    .populate({
      path: 'thumbnailMediaId',
      model: Media,
      select: 'provider publicId assetId url secureUrl resourceType format width height altText status',
    })
    .lean();

  if (!content) {
    throw new ApiError(404, 'Không tìm thấy bài viết.', 'ARTICLE_NOT_FOUND');
  }

  const [body, article] = await Promise.all([
    ContentBody.findOne({ contentId: content._id }).lean(),
    Article.findOne({ contentId: content._id })
      .populate({ path: 'editorId', model: User, select: 'username displayName' })
      .populate({ path: 'factCheckedBy', model: User, select: 'username displayName' })
      .lean(),
  ]);

  return {
    ...content,
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
