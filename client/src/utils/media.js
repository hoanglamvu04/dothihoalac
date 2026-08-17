import { getResolvedServerBaseUrl } from '../api/runtime.js';

export function mediaUrl(value) {
  const url =
    typeof value === 'string'
      ? value
      : value?.secureUrl ||
        value?.url ||
        value?.publicUrl ||
        value?.storagePath ||
        '';

  if (!url) {
    return '';
  }

  const cleanUrl = String(url).trim();

  // Một ObjectId chỉ là mã media, không phải đường dẫn ảnh. Nếu đưa thẳng
  // ObjectId vào src, trình duyệt sẽ gọi /<object-id> và hiện biểu tượng ảnh lỗi.
  if (/^[a-f0-9]{24}$/i.test(cleanUrl)) {
    return '';
  }

  if (
    /^https?:\/\//i.test(cleanUrl) ||
    cleanUrl.startsWith('data:') ||
    cleanUrl.startsWith('blob:')
  ) {
    return cleanUrl;
  }

  const serverUrl = getResolvedServerBaseUrl();
  return `${serverUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
}
