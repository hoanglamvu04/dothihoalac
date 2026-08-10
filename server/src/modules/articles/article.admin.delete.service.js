import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import ApiError from '../../utils/ApiError.js';

function normalizeIds(values = []) {
  return [
    ...new Set(
      values
        .map((value) => String(value || '').trim())
        .filter((value) => mongoose.isValidObjectId(value)),
    ),
  ];
}

export async function adminDeleteArticles(ids = []) {
  const normalizedIds = normalizeIds(ids);

  if (!normalizedIds.length) {
    throw new ApiError(
      400,
      'Chưa chọn bài viết hợp lệ để xóa.',
      'ARTICLE_IDS_REQUIRED',
    );
  }

  const existing = await Content.find({
    _id: { $in: normalizedIds },
    contentType: 'article',
    deletedAt: null,
  })
    .select('_id')
    .lean();

  const existingIds = existing.map((item) => String(item._id));

  if (!existingIds.length) {
    return {
      requestedCount: normalizedIds.length,
      deletedCount: 0,
      ids: [],
    };
  }

  const deletedAt = new Date();

  await Content.updateMany(
    {
      _id: { $in: existingIds },
      contentType: 'article',
      deletedAt: null,
    },
    {
      $set: {
        status: 'deleted',
        deletedAt,
        scheduledAt: null,
      },
    },
  );

  return {
    requestedCount: normalizedIds.length,
    deletedCount: existingIds.length,
    ids: existingIds,
    deletedAt,
  };
}

export async function adminDeleteArticle(id) {
  const result = await adminDeleteArticles([id]);

  if (!result.deletedCount) {
    throw new ApiError(
      404,
      'Không tìm thấy bài viết để xóa.',
      'ARTICLE_NOT_FOUND',
    );
  }

  return result;
}
