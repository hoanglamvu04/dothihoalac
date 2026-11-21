/**
 * Cheap, deterministic editorial checks. External image URLs and Search Console
 * indexing are not verified here. The service provides actual active-Media
 * counts for reporting; default arguments preserve use in unit tests.
 */
export function articleSeoIssues(item = {}, body = {}, media = {}) {
  const issues = [];
  const title = String(item.title || '').trim();
  const summary = String(item.summary || '').trim();
  const text = String(body.bodyText || item.bodyText || '').trim();

  if (title.length < 30) {
    issues.push({ code: 'short_title', label: 'Tiêu đề quá ngắn cho SEO' });
  } else if (title.length > 75) {
    issues.push({ code: 'long_title', label: 'Tiêu đề dài, có nguy cơ bị cắt' });
  }

  if (summary.length < 70) {
    issues.push({ code: 'short_description', label: 'Thiếu mô tả ngắn đủ thông tin' });
  } else if (summary.length > 190) {
    issues.push({ code: 'long_description', label: 'Mô tả có thể bị rút gọn trên kết quả tìm kiếm' });
  }

  const hasImage = media.hasImage ??
    Boolean(item.thumbnailMediaId || body.inlineMediaIds?.length);
  if (!hasImage) {
    issues.push({
      code: 'missing_cover',
      label: 'Chưa có ảnh đại diện hoặc ảnh nội dung còn hoạt động',
    });
  }

  if (media.inactiveCover) {
    issues.push({
      code: 'inactive_cover',
      label: 'Ảnh đại diện đã bị xóa, chặn hoặc thiếu URL trong Media Library',
    });
  }

  if (Number(media.invalidInlineCount || 0) > 0) {
    issues.push({
      code: 'invalid_inline_images',
      label: 'Có ' + media.invalidInlineCount + ' ảnh nội dung không còn hoạt động trong Media Library',
    });
  }

  if (!item.primaryCategoryId) {
    issues.push({ code: 'missing_category', label: 'Chưa phân loại chuyên mục' });
  }

  if (text.length < 250) {
    issues.push({ code: 'short_content', label: 'Nội dung ngắn hoặc chưa đồng bộ đủ' });
  }

  if (!String(item.slug || '').trim()) {
    issues.push({ code: 'missing_slug', label: 'Bài thiếu đường dẫn URL' });
  }

  return issues;
}
