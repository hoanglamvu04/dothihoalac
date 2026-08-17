import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';
import { htmlToPlainText } from '../../utils/sanitizeHtml.js';

import Media from './media.model.js';
import ContentMedia from './contentMedia.model.js';

const FIGURE_PATTERN = /<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi;
const IMAGE_PATTERN = /<img\b([^>]*)\/?\s*>/i;
const CAPTION_PATTERN = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i;
const ATTRIBUTE_PATTERN =
  /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

function parseAttributes(source = '') {
  const attributes = {};
  let match;

  ATTRIBUTE_PATTERN.lastIndex = 0;

  while ((match = ATTRIBUTE_PATTERN.exec(String(source))) !== null) {
    const name = String(match[1] || '').toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';

    if (name) {
      attributes[name] = value;
    }
  }

  return attributes;
}

function normalizeUrl(value = '') {
  const source = String(value || '').trim();

  if (!source) {
    return '';
  }

  try {
    const parsed = new URL(source);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function countImages(bodyHtml = '') {
  return (String(bodyHtml).match(/<img\b/gi) || []).length;
}

function inlineMediaError(message, code, details) {
  return new ApiError(422, message, code, details);
}

/**
 * Đọc các ảnh nội dung từ HTML đã được sanitize.
 *
 * Cấu trúc hợp lệ:
 * <figure data-media-id="..." data-caption-optional="true">
 *   <img src="..." alt="..." />
 *   <figcaption>...</figcaption> // tùy chọn khi figure cho phép
 * </figure>
 */
export function extractInlineMediaFigures(bodyHtml = '') {
  const html = String(bodyHtml || '');
  const items = [];
  let match;

  FIGURE_PATTERN.lastIndex = 0;

  while ((match = FIGURE_PATTERN.exec(html)) !== null) {
    const figureAttributes = parseAttributes(match[1]);
    const figureHtml = match[2] || '';
    const imageMatch = figureHtml.match(IMAGE_PATTERN);

    if (!imageMatch) {
      continue;
    }

    const imageAttributes = parseAttributes(imageMatch[1]);
    const figureMediaId = figureAttributes['data-media-id'];
    const imageMediaId = imageAttributes['data-media-id'];

    if (
      figureMediaId &&
      imageMediaId &&
      String(figureMediaId) !== String(imageMediaId)
    ) {
      throw inlineMediaError(
        'ID ảnh trong thẻ figure và img không trùng nhau.',
        'INLINE_MEDIA_ID_MISMATCH',
      );
    }

    const mediaId = figureMediaId || imageMediaId || '';
    const captionMatch = figureHtml.match(CAPTION_PATTERN);
    const caption = captionMatch
      ? htmlToPlainText(captionMatch[1]).trim()
      : '';
    const captionOptional =
      String(figureAttributes['data-caption-optional'] || '')
        .trim()
        .toLowerCase() === 'true';

    items.push({
      mediaId: String(mediaId).trim(),
      src: String(imageAttributes.src || '').trim(),
      alt: String(imageAttributes.alt || '').trim(),
      title: String(imageAttributes.title || '').trim(),
      caption,
      captionOptional,
      displayOrder: items.length,
    });
  }

  return items;
}

/**
 * Kiểm tra toàn bộ ảnh trong nội dung.
 *
 * ALT luôn bắt buộc. Với workflow yêu cầu caption, ảnh cũ vẫn phải có
 * chú thích; ảnh được editor mới đánh dấu data-caption-optional="true"
 * có thể bỏ trống caption mà vẫn hợp lệ.
 */
export async function validateInlineMediaHtml(
  bodyHtml = '',
  { requireCaption = true } = {},
) {
  const html = String(bodyHtml || '');
  const totalImages = countImages(html);

  if (!totalImages) {
    return [];
  }

  const items = extractInlineMediaFigures(html);

  if (items.length !== totalImages) {
    throw inlineMediaError(
      'Mọi ảnh trong nội dung phải nằm trong thẻ figure và được liên kết với thư viện Media.',
      'INLINE_MEDIA_FIGURE_REQUIRED',
      {
        totalImages,
        linkedImages: items.length,
      },
    );
  }

  if (items.length > Number(env.MAX_IMAGES_PER_CONTENT || 20)) {
    throw inlineMediaError(
      `Mỗi bài chỉ được chèn tối đa ${env.MAX_IMAGES_PER_CONTENT} ảnh.`,
      'INLINE_MEDIA_LIMIT_EXCEEDED',
      {
        limit: Number(env.MAX_IMAGES_PER_CONTENT || 20),
        received: items.length,
      },
    );
  }

  const seenIds = new Set();

  for (const [index, item] of items.entries()) {
    if (!mongoose.isValidObjectId(item.mediaId)) {
      throw inlineMediaError(
        `Ảnh thứ ${index + 1} có Media ID không hợp lệ.`,
        'INVALID_INLINE_MEDIA_ID',
        {
          index,
          mediaId: item.mediaId,
        },
      );
    }

    if (seenIds.has(item.mediaId)) {
      throw inlineMediaError(
        'Một ảnh không được chèn lặp lại nhiều lần trong cùng bài viết.',
        'DUPLICATE_INLINE_MEDIA',
        {
          mediaId: item.mediaId,
        },
      );
    }

    seenIds.add(item.mediaId);

    if (!normalizeUrl(item.src)) {
      throw inlineMediaError(
        `Ảnh thứ ${index + 1} không có URL HTTP/HTTPS hợp lệ.`,
        'INVALID_INLINE_MEDIA_URL',
        {
          index,
          mediaId: item.mediaId,
        },
      );
    }

    if (!item.alt) {
      throw inlineMediaError(
        `Ảnh thứ ${index + 1} phải có văn bản thay thế (alt).`,
        'INLINE_MEDIA_ALT_REQUIRED',
        {
          index,
          mediaId: item.mediaId,
        },
      );
    }

    if (item.alt.length > 300) {
      throw inlineMediaError(
        `Văn bản thay thế của ảnh thứ ${index + 1} không được vượt quá 300 ký tự.`,
        'INLINE_MEDIA_ALT_TOO_LONG',
        {
          index,
          mediaId: item.mediaId,
        },
      );
    }

    if (requireCaption && !item.caption && !item.captionOptional) {
      throw inlineMediaError(
        `Ảnh thứ ${index + 1} phải có chú thích.`,
        'INLINE_MEDIA_CAPTION_REQUIRED',
        {
          index,
          mediaId: item.mediaId,
        },
      );
    }

    if (item.caption.length > 500) {
      throw inlineMediaError(
        `Chú thích của ảnh thứ ${index + 1} không được vượt quá 500 ký tự.`,
        'INLINE_MEDIA_CAPTION_TOO_LONG',
        {
          index,
          mediaId: item.mediaId,
        },
      );
    }
  }

  const mediaDocuments = await Media.find({
    _id: {
      $in: items.map((item) => item.mediaId),
    },
    resourceType: 'image',
    status: 'active',
    deletedAt: null,
  })
    .select('_id url secureUrl width height altText status')
    .lean();

  const mediaMap = new Map(
    mediaDocuments.map((media) => [String(media._id), media]),
  );

  for (const [index, item] of items.entries()) {
    const media = mediaMap.get(item.mediaId);

    if (!media) {
      throw inlineMediaError(
        `Ảnh thứ ${index + 1} không tồn tại hoặc không còn hoạt động.`,
        'INLINE_MEDIA_NOT_FOUND',
        {
          index,
          mediaId: item.mediaId,
        },
      );
    }

    const actualUrl = normalizeUrl(item.src);
    const allowedUrls = new Set(
      [media.secureUrl, media.url]
        .map(normalizeUrl)
        .filter(Boolean),
    );

    if (!allowedUrls.has(actualUrl)) {
      throw inlineMediaError(
        `URL của ảnh thứ ${index + 1} không khớp với ảnh đã tải lên hệ thống.`,
        'INLINE_MEDIA_URL_MISMATCH',
        {
          index,
          mediaId: item.mediaId,
        },
      );
    }
  }

  return items.map((item) => ({
    ...item,
    mediaId: new mongoose.Types.ObjectId(item.mediaId),
  }));
}

export async function syncInlineMediaLinks(
  contentId,
  inlineMedia = [],
) {
  if (!mongoose.isValidObjectId(contentId)) {
    throw new ApiError(
      400,
      'Content ID không hợp lệ khi đồng bộ ảnh nội dung.',
      'INVALID_CONTENT_ID',
    );
  }

  const items = Array.isArray(inlineMedia) ? inlineMedia : [];

  if (!items.length) {
    await ContentMedia.deleteMany({
      contentId,
      mediaRole: 'inline',
    });

    return [];
  }

  const mediaIds = items.map((item) => item.mediaId);

  await ContentMedia.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: {
          contentId,
          mediaId: item.mediaId,
          mediaRole: 'inline',
        },
        update: {
          $set: {
            displayOrder: item.displayOrder,
            caption: item.caption,
          },
          $setOnInsert: {
            contentId,
            mediaId: item.mediaId,
            mediaRole: 'inline',
          },
        },
        upsert: true,
      },
    })),
    {
      ordered: true,
    },
  );

  await ContentMedia.deleteMany({
    contentId,
    mediaRole: 'inline',
    mediaId: {
      $nin: mediaIds,
    },
  });

  return ContentMedia.find({
    contentId,
    mediaRole: 'inline',
  })
    .sort({ displayOrder: 1, _id: 1 })
    .lean();
}
