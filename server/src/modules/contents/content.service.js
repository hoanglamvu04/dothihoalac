import mongoose from 'mongoose';

import Content from './content.model.js';
import ContentBody from './contentBody.model.js';
import ContentRevision from './contentRevision.model.js';
import ContentMedia from '../media/contentMedia.model.js';

import User from '../users/user.model.js';
import Category from '../taxonomy/category.model.js';
import Area from '../taxonomy/area.model.js';
import Tag from '../taxonomy/tag.model.js';
import Media from '../media/media.model.js';

import { createUniqueSlug } from '../../services/slug.service.js';
import {
  cleanHtml,
  htmlToPlainText,
} from '../../utils/sanitizeHtml.js';

import ApiError from '../../utils/ApiError.js';
import {
  syncInlineMediaLinks,
  validateInlineMediaHtml,
} from '../media/inlineMedia.service.js';

const WORDS_PER_MINUTE = 220;

function normalizeText(value, fallback = '') {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value).trim();
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

  const map = new Map();

  for (const value of values) {
    if (!value) {
      continue;
    }

    map.set(String(value), value);
  }

  return [...map.values()];
}

function calculateBodyStats(bodyText = '') {
  const normalizedText = normalizeText(bodyText);

  const wordCount = normalizedText
    ? normalizedText
        .split(/\s+/)
        .filter(Boolean)
        .length
    : 0;

  return {
    wordCount,
    readingTime: Math.max(
      1,
      Math.ceil(wordCount / WORDS_PER_MINUTE),
    ),
  };
}

function sanitizeBody(bodyHtml = '') {
  const sourceHtml = String(bodyHtml || '');

  if (/src\s*=\s*["']data:image\//i.test(sourceHtml)) {
    throw new ApiError(
      422,
      'Không được nhúng ảnh base64 vào nội dung. Hãy tải ảnh lên thư viện Media.',
      'BASE64_IMAGE_NOT_ALLOWED',
    );
  }

  const sanitizedHtml = cleanHtml(sourceHtml);

  const bodyText =
    htmlToPlainText(sanitizedHtml);

  return {
    bodyHtml: sanitizedHtml,
    bodyText,
    ...calculateBodyStats(bodyText),
  };
}

function defaultBody(contentId = null) {
  return {
    contentId,
    bodyHtml: '',
    bodyText: '',
    readingTime: 1,
    wordCount: 0,
    inlineMediaIds: [],
  };
}

async function createContentRevision({
  content,
  bodyHtml,
  actorId,
  changeNote,
}) {
  if (!actorId) {
    return null;
  }

  /*
   * Thử lại khi có hai yêu cầu sửa bài đồng thời
   * cùng tạo một revisionNumber.
   */
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latestRevision =
      await ContentRevision.findOne({
        contentId: content._id,
      })
        .sort({ revisionNumber: -1 })
        .select('revisionNumber')
        .lean();

    const revisionNumber =
      Number(latestRevision?.revisionNumber || 0) + 1;

    try {
      return await ContentRevision.create({
        contentId: content._id,
        revisionNumber,
        title: content.title,
        summary: content.summary || '',
        bodyHtml: bodyHtml || '',
        changedBy: actorId,
        changeNote: normalizeText(changeNote),
      });
    } catch (error) {
      const isDuplicateRevision =
        error?.code === 11000 &&
        error?.keyPattern?.contentId &&
        error?.keyPattern?.revisionNumber;

      if (!isDuplicateRevision || attempt === 2) {
        throw error;
      }
    }
  }

  return null;
}

function populateContentQuery(query) {
  return query
    .populate({
      path: 'authorId',
      model: User,
      select:
        'username displayName emailVerifiedAt phoneVerifiedAt status',
    })
    .populate({
      path: 'primaryCategoryId',
      model: Category,
      select:
        'name slug contentScope description',
    })
    .populate({
      path: 'primaryAreaId',
      model: Area,
      select:
        'name slug areaType description',
    })
    .populate({
      path: 'categoryIds',
      model: Category,
      select: 'name slug contentScope',
    })
    .populate({
      path: 'tagIds',
      model: Tag,
      select: 'name slug',
    })
    .populate({
      path: 'areaIds',
      model: Area,
      select: 'name slug areaType',
    })
    .populate({
      path: 'thumbnailMediaId',
      model: Media,
      select: [
        'provider',
        'publicId',
        'assetId',
        'url',
        'secureUrl',
        'resourceType',
        'format',
        'width',
        'height',
        'altText',
        'status',
      ].join(' '),
    });
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
  isFeatured = false,
  isSponsored = false,
}) {
  if (!authorId) {
    throw new ApiError(
      422,
      'Thiếu tác giả nội dung.',
      'AUTHOR_REQUIRED',
    );
  }

  const normalizedTitle = normalizeText(title);

  if (!normalizedTitle) {
    throw new ApiError(
      422,
      'Tiêu đề nội dung không được để trống.',
      'CONTENT_TITLE_REQUIRED',
    );
  }

  if (!contentType) {
    throw new ApiError(
      422,
      'Thiếu loại nội dung.',
      'CONTENT_TYPE_REQUIRED',
    );
  }

  const body = sanitizeBody(bodyHtml);

  const inlineMedia =
    contentType === 'article'
      ? await validateInlineMediaHtml(body.bodyHtml)
      : [];

  const inlineMediaIds = inlineMedia.map(
    (item) => item.mediaId,
  );

  const slug = await createUniqueSlug(
    Content,
    normalizedTitle,
  );

  let content;

  try {
    content = await Content.create({
      authorId,
      contentType,

      title: normalizedTitle,
      slug,
      summary: normalizeText(summary),

      /*
       * bodyText được lưu trong Content để phục vụ
       * text index và tìm kiếm nhanh.
       */
      bodyText: body.bodyText,

      status,
      visibility,
      allowComments: Boolean(allowComments),

      primaryCategoryId:
        normalizeNullableId(primaryCategoryId),

      primaryAreaId:
        normalizeNullableId(primaryAreaId),

      categoryIds:
        normalizeIdArray(categoryIds),

      tagIds:
        normalizeIdArray(tagIds),

      areaIds:
        normalizeIdArray(areaIds),

      thumbnailMediaId:
        normalizeNullableId(thumbnailMediaId),

      isFeatured: Boolean(isFeatured),
      isSponsored: Boolean(isSponsored),
    });

    await ContentBody.create({
      contentId: content._id,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText,
      wordCount: body.wordCount,
      readingTime: body.readingTime,
      inlineMediaIds,
    });

    if (contentType === 'article') {
      await syncInlineMediaLinks(
        content._id,
        inlineMedia,
      );
    }

    return content;
  } catch (error) {
    /*
     * Nếu Content đã được tạo nhưng ContentBody lỗi,
     * xóa Content để tránh dữ liệu mồ côi.
     */
    if (content?._id) {
      await Promise.allSettled([
        ContentMedia.deleteMany({
          contentId: content._id,
        }),
        ContentBody.deleteMany({
          contentId: content._id,
        }),
        Content.deleteOne({
          _id: content._id,
        }),
      ]);
    }

    throw error;
  }
}

export async function updateContentWithBody(
  content,
  changes = {},
  actorId,
  changeNote = '',
) {
  if (!content?._id) {
    throw new ApiError(
      404,
      'Không tìm thấy nội dung cần cập nhật.',
      'CONTENT_NOT_FOUND',
    );
  }

  const existingBody =
    await ContentBody.findOne({
      contentId: content._id,
    }).lean();

  let nextBody = null;
  let inlineMedia = null;

  if (changes.bodyHtml !== undefined) {
    nextBody = sanitizeBody(changes.bodyHtml);

    if (content.contentType === 'article') {
      inlineMedia = await validateInlineMediaHtml(
        nextBody.bodyHtml,
      );

      nextBody.inlineMediaIds = inlineMedia.map(
        (item) => item.mediaId,
      );
    } else {
      nextBody.inlineMediaIds = [];
    }
  }

  await createContentRevision({
    content,
    bodyHtml: existingBody?.bodyHtml || '',
    actorId,
    changeNote,
  });

  if (
    changes.title !== undefined &&
    normalizeText(changes.title) !== content.title
  ) {
    const nextTitle =
      normalizeText(changes.title);

    if (!nextTitle) {
      throw new ApiError(
        422,
        'Tiêu đề nội dung không được để trống.',
        'CONTENT_TITLE_REQUIRED',
      );
    }

    content.title = nextTitle;

    content.slug = await createUniqueSlug(
      Content,
      nextTitle,
      {
        excludeId: content._id,
      },
    );
  }

  if (changes.summary !== undefined) {
    content.summary =
      normalizeText(changes.summary);
  }

  if (changes.visibility !== undefined) {
    content.visibility = changes.visibility;
  }

  if (changes.allowComments !== undefined) {
    content.allowComments =
      Boolean(changes.allowComments);
  }

  if (changes.primaryCategoryId !== undefined) {
    content.primaryCategoryId =
      normalizeNullableId(
        changes.primaryCategoryId,
      );
  }

  if (changes.primaryAreaId !== undefined) {
    content.primaryAreaId =
      normalizeNullableId(
        changes.primaryAreaId,
      );
  }

  if (changes.categoryIds !== undefined) {
    content.categoryIds =
      normalizeIdArray(changes.categoryIds);
  }

  if (changes.tagIds !== undefined) {
    content.tagIds =
      normalizeIdArray(changes.tagIds);
  }

  if (changes.areaIds !== undefined) {
    content.areaIds =
      normalizeIdArray(changes.areaIds);
  }

  if (changes.thumbnailMediaId !== undefined) {
    content.thumbnailMediaId =
      normalizeNullableId(
        changes.thumbnailMediaId,
      );
  }

  if (changes.isFeatured !== undefined) {
    content.isFeatured =
      Boolean(changes.isFeatured);
  }

  if (changes.isSponsored !== undefined) {
    content.isSponsored =
      Boolean(changes.isSponsored);
  }

  if (nextBody) {
    /*
     * Đồng bộ bodyText trong Content để text index
     * luôn có dữ liệu mới nhất.
     */
    content.bodyText = nextBody.bodyText;
  }

  await content.save();

  if (nextBody) {
    await ContentBody.findOneAndUpdate(
      {
        contentId: content._id,
      },
      {
        $set: {
          bodyHtml: nextBody.bodyHtml,
          bodyText: nextBody.bodyText,
          wordCount: nextBody.wordCount,
          readingTime: nextBody.readingTime,
          inlineMediaIds:
            nextBody.inlineMediaIds || [],
        },

        $setOnInsert: {
          contentId: content._id,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    if (content.contentType === 'article') {
      await syncInlineMediaLinks(
        content._id,
        inlineMedia || [],
      );
    }
  }

  return content;
}

export async function getPublishedContentBySlug(
  slug,
  contentType,
) {
  const normalizedSlug = normalizeText(slug)
    .toLowerCase();

  if (!normalizedSlug) {
    throw new ApiError(
      400,
      'Slug nội dung không hợp lệ.',
      'INVALID_CONTENT_SLUG',
    );
  }

  if (!contentType) {
    throw new ApiError(
      400,
      'Loại nội dung không hợp lệ.',
      'INVALID_CONTENT_TYPE',
    );
  }

  /*
   * Vừa lấy bài vừa tăng viewCount trong một truy vấn.
   * new: true trả về dữ liệu sau khi tăng lượt xem.
   */
  const query = Content.findOneAndUpdate(
    {
      slug: normalizedSlug,
      contentType,
      status: 'published',
      visibility: 'public',
      deletedAt: null,
    },
    {
      $inc: {
        viewCount: 1,
      },
    },
    {
      new: true,
      runValidators: false,
    },
  );

  const content =
    await populateContentQuery(query).lean();

  if (!content) {
    throw new ApiError(
      404,
      'Không tìm thấy nội dung.',
      'CONTENT_NOT_FOUND',
    );
  }

  const body =
    await ContentBody.findOne({
      contentId: content._id,
    }).lean();

  return {
    ...content,
    body:
      body ||
      defaultBody(content._id),
  };
}

export async function getOwnedContentOrThrow(
  id,
  userId,
  contentType,
) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(
      400,
      'ID nội dung không hợp lệ.',
      'INVALID_CONTENT_ID',
    );
  }

  if (!userId) {
    throw new ApiError(
      401,
      'Bạn cần đăng nhập.',
      'AUTH_REQUIRED',
    );
  }

  const filter = {
    _id: id,
    authorId: userId,
    deletedAt: null,
  };

  if (contentType) {
    filter.contentType = contentType;
  }

  const content =
    await Content.findOne(filter);

  if (!content) {
    throw new ApiError(
      404,
      'Không tìm thấy nội dung hoặc bạn không có quyền.',
      'CONTENT_NOT_FOUND',
    );
  }

  return content;
}

export function assertEditable(content) {
  if (!content) {
    throw new ApiError(
      404,
      'Không tìm thấy nội dung.',
      'CONTENT_NOT_FOUND',
    );
  }

  const editableStatuses = [
    'draft',
    'needs_revision',
    'rejected',
  ];

  if (
    !editableStatuses.includes(content.status)
  ) {
    throw new ApiError(
      409,
      'Nội dung ở trạng thái hiện tại không thể chỉnh sửa.',
      'CONTENT_NOT_EDITABLE',
      {
        currentStatus: content.status,
        editableStatuses,
      },
    );
  }
}