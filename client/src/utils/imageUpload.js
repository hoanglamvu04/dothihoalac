import { api, apiErrorMessage } from '../api/http';

export const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_IMAGE_SIZE_MB = 10;
const UPLOAD_TIMEOUT_MS = 120000;

/**
 * A clipboard image is sometimes a nameless Blob rather than a File.
 * Give it a predictable filename so Multer/Cloudinary receive a real image.
 */
export function normalizeImageFile(file) {
  if (!file) return null;
  if (file.name && file.name.trim()) return file;

  const type = String(file.type || '').toLowerCase();
  const extension = ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  })[type] || 'png';

  return new File([file], `anh-dan.${extension}`, {
    type: type || 'image/png',
    lastModified: Date.now(),
  });
}

export function clipboardImageFiles(clipboardData) {
  const items = Array.from(clipboardData?.items || []);
  const fromItems = items
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => normalizeImageFile(item.getAsFile()))
    .filter(Boolean);

  if (fromItems.length) return fromItems;

  return Array.from(clipboardData?.files || [])
    .filter((file) => String(file?.type || '').startsWith('image/'))
    .map(normalizeImageFile)
    .filter(Boolean);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

/**
 * Reduce large screenshots/photos before sending through the production proxy.
 * This is best effort; it never changes GIF animations, and it keeps the
 * original when canvas/WebP encoding is unsupported or produces a larger file.
 */
export async function prepareImageForUpload(input) {
  const file = normalizeImageFile(input);
  if (!file || file.size < 1_200_000 || file.type === 'image/gif') {
    return file;
  }

  if (
    typeof document === 'undefined' ||
    typeof createImageBitmap !== 'function' ||
    !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)
  ) {
    return file;
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let best = null;
    for (const quality of [0.86, 0.76, 0.66]) {
      const blob = await canvasToBlob(canvas, 'image/webp', quality);
      if (!blob || blob.type !== 'image/webp') break;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= 1_200_000) break;
    }

    if (!best || best.size >= file.size) return file;

    const name = String(file.name || 'anh-dan.png').replace(/\.[^.]+$/, '');
    return new File([best], `${name}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    // Browser canvas/CSP/decoder may be unavailable. Keep the original.
    return file;
  } finally {
    bitmap?.close?.();
  }
}

export function imageUploadErrorMessage(error, fallback = 'Không thể tải ảnh lên.') {
  const status = Number(error?.response?.status || 0);
  const requestId = error?.response?.data?.requestId;
  const reference = requestId ? ` Mã yêu cầu: ${requestId}.` : '';

  if (status === 413) {
    return `Ảnh vượt giới hạn upload của máy chủ hoặc proxy (HTTP 413). Hãy thử ảnh nhỏ hơn và kiểm tra client_max_body_size trên Nginx.${reference}`;
  }
  if (status === 415) {
    return `Định dạng ảnh không được hỗ trợ (HTTP 415). Hãy dùng JPG, PNG, WEBP, GIF hoặc AVIF.${reference}`;
  }
  if (status === 401) {
    return `Phiên đăng nhập đã hết hạn (HTTP 401). Hãy đăng nhập lại rồi tải ảnh.${reference}`;
  }
  if (status === 403) {
    return `Máy chủ từ chối quyền tải ảnh (HTTP 403). Hãy kiểm tra tài khoản, cookie và cấu hình CORS.${reference}`;
  }
  if (status === 429) {
    return `Tải ảnh quá nhanh (HTTP 429). Vui lòng thử lại sau.${reference}`;
  }
  if ([502, 503, 504].includes(status)) {
    return `Máy chủ upload hoặc dịch vụ lưu trữ ảnh đang lỗi (HTTP ${status}). Hãy thử lại sau.${reference}`;
  }
  if (status >= 500) {
    return `Máy chủ gặp lỗi khi lưu ảnh (HTTP ${status}).${reference}`;
  }
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'Tải ảnh quá thời gian cho phép. Kiểm tra mạng và thử lại bằng ảnh nhỏ hơn.';
  }
  if (!error?.response && error?.code === 'ERR_NETWORK') {
    return 'Không kết nối được đến API upload ảnh. Hãy kiểm tra mạng, HTTPS, CORS và địa chỉ API trên web thật.';
  }

  return apiErrorMessage(error, fallback);
}

export async function uploadImageFile(
  input,
  { folder = 'general', altText = '', onProgress, maxImageSizeMb = MAX_IMAGE_SIZE_MB } = {},
) {
  const original = normalizeImageFile(input);
  if (!original || !SUPPORTED_IMAGE_TYPES.has(original.type)) {
    throw new Error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF hoặc AVIF.');
  }

  const file = await prepareImageForUpload(original);
  if (!file?.size) {
    throw new Error('Ảnh trống hoặc không đọc được từ bộ nhớ tạm.');
  }
  if (file.size > maxImageSizeMb * 1024 * 1024) {
    throw new Error(`Ảnh vượt quá ${maxImageSizeMb} MB, kể cả sau khi tối ưu. Hãy chọn ảnh nhỏ hơn.`);
  }

  const formData = new FormData();
  formData.append('image', file, file.name);
  formData.append('folder', folder);
  formData.append('altText', altText);

  let response;
  try {
    response = await api.post('/media/images', formData, {
      timeout: UPLOAD_TIMEOUT_MS,
      onUploadProgress(event) {
        if (!event.total) return;
        onProgress?.(Math.max(0, Math.min(100, Math.round(event.loaded * 100 / event.total))));
      },
    });
  } catch (error) {
    throw new Error(imageUploadErrorMessage(error));
  }

  const media = response?.data?.data;
  if (!media?._id && !media?.id) {
    throw new Error('API upload ảnh không trả về Media ID. Ảnh chưa được chèn vào bài.');
  }
  if (!media?.secureUrl && !media?.url) {
    throw new Error('API upload ảnh không trả về URL. Ảnh chưa được chèn vào bài.');
  }
  return media;
}
