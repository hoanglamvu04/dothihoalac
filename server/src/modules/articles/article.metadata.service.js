import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import Article from './article.model.js';
import { adminArticleDetail } from './article.admin.detail.service.js';
import ApiError from '../../utils/ApiError.js';

function normalizeText(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function parseOptionalDate(
  value,
  fieldName = 'date',
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      422,
      `${fieldName} không hợp lệ.`,
      'INVALID_DATE',
      {
        field: fieldName,
        value,
      },
    );
  }

  return date;
}

function normalizeNullableId(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  return value;
}

function normalizeIdArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Map(
      values
        .filter(Boolean)
        .map((value) => [String(value), value]),
    ).values(),
  ];
}

function applyArticleChanges(
  article,
  userId,
  data,
) {
  article.editorId = userId;

  if (data.articleType !== undefined) {
    article.articleType = data.articleType;
  }

  if (data.sourceNote !== undefined) {
    article.sourceNote =
      normalizeText(data.sourceNote);
  }

  if (data.coverMode !== undefined) {
    article.coverMode = data.coverMode;
  }

  if (data.factCheckedAt !== undefined) {
    article.factCheckedAt =
      parseOptionalDate(
        data.factCheckedAt,
        'factCheckedAt',
      );
  }

  if (data.factCheckedBy !== undefined) {
    article.factCheckedBy =
      normalizeNullableId(
        data.factCheckedBy,
      );
  }

  if (
    data.originalPublishedAt !== undefined
  ) {
    article.originalPublishedAt =
      parseOptionalDate(
        data.originalPublishedAt,
        'originalPublishedAt',
      );
  }
}

function applyContentChanges(
  content,
  data,
) {
  if (data.primaryCategoryId !== undefined) {
    content.primaryCategoryId =
      normalizeNullableId(
        data.primaryCategoryId,
      );
  }

  if (data.primaryAreaId !== undefined) {
    content.primaryAreaId =
      normalizeNullableId(
        data.primaryAreaId,
      );
  }

  if (data.categoryIds !== undefined) {
    content.categoryIds =
      normalizeIdArray(data.categoryIds);
  }

  if (data.tagIds !== undefined) {
    content.tagIds =
      normalizeIdArray(data.tagIds);
  }

  if (data.areaIds !== undefined) {
    content.areaIds =
      normalizeIdArray(data.areaIds);
  }

  if (data.thumbnailMediaId !== undefined) {
    content.thumbnailMediaId =
      normalizeNullableId(
        data.thumbnailMediaId,
      );
  }

  if (data.visibility !== undefined) {
    content.visibility = data.visibility;
  }

  if (data.allowComments !== undefined) {
    content.allowComments =
      Boolean(data.allowComments);
  }

  if (data.isFeatured !== undefined) {
    content.isFeatured =
      Boolean(data.isFeatured);
  }

  if (data.isSponsored !== undefined) {
    content.isSponsored =
      Boolean(data.isSponsored);
  }

  if (data.status === undefined) {
    return;
  }

  content.status = data.status;

  if (data.status === 'published') {
    content.publishedAt =
      content.publishedAt ||
      new Date();
    content.scheduledAt = null;
    return;
  }

  if (data.status === 'scheduled') {
    if (!data.scheduledAt) {
      throw new ApiError(
        422,
        'Bài lên lịch phải có thời gian xuất bản.',
        'SCHEDULED_AT_REQUIRED',
      );
    }

    content.scheduledAt =
      parseOptionalDate(
        data.scheduledAt,
        'scheduledAt',
      );
    content.publishedAt = null;
    return;
  }

  content.scheduledAt = null;
}

export async function adminUpdateMetadata(
  id,
  userId,
  data = {},
) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(
      400,
      'ID bài viết không hợp lệ.',
      'INVALID_ARTICLE_ID',
    );
  }

  const [content, existingArticle] =
    await Promise.all([
      Content.findOne({
        _id: id,
        contentType: 'article',
        deletedAt: null,
      }),
      Article.findOne({
        contentId: id,
      }),
    ]);

  if (!content) {
    throw new ApiError(
      404,
      'Không tìm thấy bài viết.',
      'ARTICLE_NOT_FOUND',
    );
  }

  const article =
    existingArticle ||
    new Article({
      contentId: content._id,
    });

  /*
   * Validate Article trước khi ghi Content.
   * Nhờ vậy lỗi schema không còn xảy ra sau khi Content đã lưu,
   * tránh tình trạng giao diện báo 500 dù một phần dữ liệu đã thay đổi.
   */
  applyArticleChanges(
    article,
    userId,
    data,
  );
  await article.validate();

  applyContentChanges(content, data);

  /*
   * Không dùng $set + $setOnInsert cho articleType ở đây.
   * MongoDB coi cùng một path xuất hiện ở hai update operator là conflict.
   * Lưu document trực tiếp giúp metadata update idempotent và rõ lỗi hơn.
   */
  await content.save();
  await article.save();

  return adminArticleDetail(
    content._id,
  );
}
