const IMPORT_ARTIFACT = /\[\[DTHL_(?:H[234]|END|LI|QUOTE|IMAGE_\d+)\]\]/i;
const UNSAFE_IMAGE = /<img\b[^>]*\bsrc\s*=\s*["'](?:blob:|data:)/i;

export function articleQualityChecks({
  content = {},
  body = {},
  hasCover = false,
  validInlineCount = null,
  invalidInlineCount = 0,
} = {}) {
  const title = String(content.title || '').trim();
  const summary = String(content.summary || '').trim();
  const bodyText = String(body.bodyText || content.bodyText || '').trim();
  const html = String(body.bodyHtml || '');
  const imageCount = Array.isArray(body.inlineMediaIds) ? body.inlineMediaIds.length : 0;
  const usableInlineCount = validInlineCount === null ? imageCount : validInlineCount;
  const checks = [];

  const add = (code, level, message) => checks.push({ code, level, message });

  if (title.length < 15) add('title', 'block', 'Tiêu đề quá ngắn hoặc còn trống.');
  else if (title.length > 110) add('title', 'warn', 'Tiêu đề dài hơn 110 ký tự; nên rút gọn.');
  else add('title', 'pass', 'Tiêu đề đạt độ dài phù hợp.');

  if (!summary) add('summary', 'warn', 'Bài chưa có sapo tóm tắt.');
  else if (summary.length < 60 || summary.length > 240) {
    add('summary', 'warn', 'Sapo nên có khoảng 60–240 ký tự.');
  } else add('summary', 'pass', 'Đã có sapo.');

  if (bodyText.length < 50) add('body', 'block', 'Nội dung quá ngắn hoặc chưa đồng bộ.');
  else if (bodyText.length < 200) add('body', 'warn', 'Bài rất ngắn, nên kiểm tra đủ thông tin.');
  else add('body', 'pass', 'Nội dung đã đồng bộ.');

  if (IMPORT_ARTIFACT.test(html) || IMPORT_ARTIFACT.test(bodyText)) {
    add('import_artifacts', 'block', 'Còn mã kỹ thuật từ công cụ nhập URL trong bài.');
  }

  if (UNSAFE_IMAGE.test(html)) {
    add('temporary_images', 'block', 'Ảnh tạm blob:/data: không thể lưu làm ảnh công khai.');
  }

  if (invalidInlineCount > 0) {
    add(
      'invalid_inline_images',
      'block',
      'Có ' + invalidInlineCount + ' ảnh nội dung bị xóa, bị chặn hoặc thiếu URL trong Media Library.',
    );
  }

  if (content.thumbnailMediaId && !hasCover) {
    add('inactive_cover', 'warn', 'Ảnh bìa đã chọn không còn khả dụng trong Media Library.');
  }

  if (!hasCover && usableInlineCount === 0) {
    add('images', 'warn', 'Chưa có ảnh bìa hoặc ảnh nội dung còn hoạt động.');
  } else if (!hasCover) {
    add('images', 'warn', 'Có ảnh nội dung hợp lệ nhưng chưa chọn ảnh bìa riêng.');
  } else {
    add('images', 'pass', 'Đã có ảnh đại diện còn hoạt động.');
  }

  if (!content.primaryCategoryId) {
    add('category', 'warn', 'Chưa chọn chuyên mục cho bài báo.');
  } else add('category', 'pass', 'Đã phân loại chuyên mục.');

  if (content.status === 'scheduled') {
    const planned = new Date(content.scheduledAt || '');
    if (!Number.isFinite(planned.getTime()) || planned.getTime() <= Date.now()) {
      add('schedule', 'block', 'Thời gian đặt lịch không hợp lệ hoặc đã qua.');
    } else add('schedule', 'pass', 'Đã có lịch đăng trong tương lai.');
  }

  if (content.visibility !== 'public') {
    add('visibility', 'warn', 'Bài không ở chế độ công khai.');
  }

  return {
    ready: !checks.some((check) => check.level === 'block'),
    blockers: checks.filter((check) => check.level === 'block').length,
    warnings: checks.filter((check) => check.level === 'warn').length,
    imageCount,
    checks,
  };
}
