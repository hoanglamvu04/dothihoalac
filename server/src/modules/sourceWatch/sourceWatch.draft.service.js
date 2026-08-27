import { adminCreate as createArticleDraft } from '../articles/article.service.js';
import SourceWatchItem from './sourceWatch.item.model.js';

function cleanText(value = '', max = 4000) {
  return String(value || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function escapeHtml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sourceDateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

function draftSummary(item) {
  const excerpt = cleanText(item?.excerpt, 520);
  if (excerpt) return excerpt;

  const body = cleanText(item?.contentText, 520);
  if (body) return body;

  return cleanText(item?.title, 320);
}

function buildDraftBody({ item, sourceName, summary }) {
  const title = cleanText(item?.title, 300) || 'Thông tin mới từ nguồn theo dõi';
  const sourceUrl = cleanText(item?.url, 4000);
  const publishedLabel = sourceDateLabel(item?.publishedAt || item?.discoveredAt);

  const sourceSentence = publishedLabel
    ? `Nguồn ${sourceName} đăng thông tin này vào ${publishedLabel}.`
    : `Nguồn ${sourceName} vừa đăng thông tin mới được Source Watch phát hiện.`;

  return [
    summary ? `<p><strong>${escapeHtml(summary)}</strong></p>` : '',
    `<p>${escapeHtml(sourceSentence)} Bản nháp này được tạo tự động từ dữ liệu nguồn để biên tập viên tiếp tục kiểm chứng, bổ sung ngữ cảnh địa phương và hoàn thiện trước khi xuất bản.</p>`,
    '<h2>Gợi ý biên tập</h2>',
    '<ul>',
    `<li>Đối chiếu tiêu đề và dữ kiện chính của thông tin “${escapeHtml(title)}”.</li>`,
    '<li>Kiểm tra tên cơ quan, nhân vật, địa điểm, số liệu và mốc thời gian trước khi đăng.</li>',
    '<li>Bổ sung bối cảnh Hòa Lạc/6 xã và ảnh phù hợp nếu nguồn cho phép sử dụng.</li>',
    '</ul>',
    sourceUrl
      ? `<p><strong>Nguồn tham khảo:</strong> <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="nofollow noopener noreferrer">${escapeHtml(sourceName)}</a></p>`
      : `<p><strong>Nguồn tham khảo:</strong> ${escapeHtml(sourceName)}</p>`,
    '<p><em>Ghi chú: bản nháp được Source Watch tạo bằng template, không sử dụng AI và không tự xuất bản.</em></p>',
  ].filter(Boolean).join('\n');
}

export async function createDraftFromSourceItem(itemId, userId) {
  const item = await SourceWatchItem.findById(itemId)
    .populate('sourceId', 'name type url')
    .exec();

  if (!item) {
    const error = new Error('SOURCE_ITEM_NOT_FOUND');
    error.code = 'SOURCE_ITEM_NOT_FOUND';
    throw error;
  }

  const existingDraftId = cleanText(item?.sourceMeta?.draftArticleId, 100);
  if (existingDraftId) {
    return {
      articleId: existingDraftId,
      title: cleanText(item?.sourceMeta?.draftTitle || item.title, 300),
      reused: true,
    };
  }

  const sourceName = cleanText(item?.sourceId?.name, 180) || 'nguồn theo dõi';
  const title = cleanText(item.title, 220) || `Tin mới từ ${sourceName}`;
  const summary = draftSummary(item);
  const bodyHtml = buildDraftBody({ item, sourceName, summary });

  const article = await createArticleDraft(userId, {
    title,
    summary,
    bodyHtml,
    status: 'draft',
    visibility: 'public',
    allowComments: true,
    articleType: 'news',
    sourceNote: [
      'Source Watch - bản nháp tự động không dùng AI.',
      `Nguồn: ${sourceName}`,
      item.url ? `URL: ${item.url}` : '',
    ].filter(Boolean).join('\n'),
    originalPublishedAt: item.publishedAt || null,
  });

  const articleId = String(article?._id || '');
  if (!articleId) {
    throw new Error('SOURCE_DRAFT_ARTICLE_ID_MISSING');
  }

  item.set('sourceMeta', {
    ...(item.sourceMeta && typeof item.sourceMeta === 'object' ? item.sourceMeta : {}),
    draftArticleId: articleId,
    draftTitle: article.title || title,
    draftCreatedAt: new Date().toISOString(),
    draftGenerator: 'rules-v1',
  });
  await item.save();

  return {
    articleId,
    title: article.title || title,
    reused: false,
  };
}
