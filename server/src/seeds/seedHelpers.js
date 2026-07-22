import mongoose from 'mongoose';
import Content from '../modules/contents/content.model.js';
import ContentBody from '../modules/contents/contentBody.model.js';
import ContentMedia from '../modules/media/contentMedia.model.js';
import { cleanHtml, htmlToPlainText } from '../utils/sanitizeHtml.js';

export const DEMO_PASSWORD = process.env.SEED_USER_PASSWORD || 'Demo@123456';
export const SEED_NOW = new Date('2026-07-14T07:00:00.000Z');

export function daysFromSeed(days, hours = 0) {
  return new Date(SEED_NOW.getTime() + (days * 24 + hours) * 60 * 60 * 1000);
}

export function makeBody(title, paragraphs = []) {
  const blocks = paragraphs.length
    ? paragraphs
    : [
        `${title} là nội dung mẫu được tạo để kiểm thử đầy đủ giao diện và API của Đô Thị Hòa Lạc.`,
        'Dữ liệu seed phục vụ môi trường phát triển, có thể chạy lại nhiều lần mà không tạo bản ghi trùng.',
      ];
  return `<h2>${title}</h2>${blocks.map((item) => `<p>${item}</p>`).join('')}`;
}

export function bodyStats(bodyHtml = '') {
  const sanitized = cleanHtml(bodyHtml);
  const bodyText = htmlToPlainText(sanitized);
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;
  return {
    bodyHtml: sanitized,
    bodyText,
    wordCount,
    readingTime: Math.max(1, Math.ceil(wordCount / 220)),
  };
}

export function makeSvgDataUrl({
  title,
  subtitle = 'Đô Thị Hòa Lạc',
  width = 1200,
  height = 675,
  accent = '#e84b24',
  background = '#0d2f3b',
}) {
  const escape = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${background}"/>
      <stop offset="1" stop-color="#173f4d"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.2)}" r="${Math.round(height * 0.22)}" fill="${accent}" opacity="0.22"/>
  <path d="M0 ${Math.round(height * 0.76)} L${Math.round(width * 0.32)} ${Math.round(height * 0.46)} L${Math.round(width * 0.55)} ${Math.round(height * 0.68)} L${width} ${Math.round(height * 0.33)} L${width} ${height} L0 ${height} Z" fill="${accent}" opacity="0.18"/>
  <rect x="${Math.round(width * 0.07)}" y="${Math.round(height * 0.12)}" width="10" height="${Math.round(height * 0.52)}" rx="5" fill="${accent}"/>
  <text x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.36)}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${Math.round(height * 0.085)}" font-weight="700">${escape(title)}</text>
  <text x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.48)}" fill="#dce9ed" font-family="Arial, sans-serif" font-size="${Math.round(height * 0.042)}">${escape(subtitle)}</text>
  <text x="${Math.round(width * 0.11)}" y="${Math.round(height * 0.84)}" fill="#ffffff" opacity="0.72" font-family="Arial, sans-serif" font-size="${Math.round(height * 0.03)}">dothihoalac.vn • XSpace / Media Space</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export async function upsertContent({
  slug,
  contentType,
  authorId,
  title,
  summary = '',
  bodyHtml = '',
  thumbnailMediaId = null,
  primaryCategoryId = null,
  primaryAreaId = null,
  categoryIds = [],
  tagIds = [],
  areaIds = [],
  status = 'published',
  visibility = 'public',
  allowComments = true,
  isFeatured = false,
  isSponsored = false,
  publishedAt = SEED_NOW,
  scheduledAt = null,
  viewCount = 0,
}) {
  const stats = bodyStats(bodyHtml);
  const content = await Content.findOneAndUpdate(
    { slug },
    {
      $set: {
        contentType,
        authorId,
        title,
        summary,
        bodyText: stats.bodyText,
        thumbnailMediaId,
        primaryCategoryId,
        primaryAreaId,
        categoryIds,
        tagIds,
        areaIds,
        status,
        visibility,
        allowComments,
        isFeatured,
        isSponsored,
        publishedAt: status === 'published' ? publishedAt : null,
        scheduledAt: status === 'scheduled' ? scheduledAt : null,
        viewCount,
        deletedAt: null,
      },
      $setOnInsert: {
        slug,
        commentCount: 0,
        reactionCount: 0,
        bookmarkCount: 0,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await ContentBody.findOneAndUpdate(
    { contentId: content._id },
    {
      $set: {
        bodyHtml: stats.bodyHtml,
        bodyText: stats.bodyText,
        wordCount: stats.wordCount,
        readingTime: stats.readingTime,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  if (thumbnailMediaId) {
    await ContentMedia.findOneAndUpdate(
      { contentId: content._id, mediaId: thumbnailMediaId, mediaRole: 'thumbnail' },
      {
        $setOnInsert: {
          contentId: content._id,
          mediaId: thumbnailMediaId,
          mediaRole: 'thumbnail',
          displayOrder: 0,
          caption: title,
        },
      },
      { upsert: true, new: true },
    );
  }

  return content;
}

export function ensureObjectId(value) {
  return value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);
}

export function mapBy(items, key = 'slug') {
  return Object.fromEntries(items.map((item) => [item[key], item]));
}
