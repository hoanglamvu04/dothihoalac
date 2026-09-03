import { CONTENT_TYPES } from './constants';

const CONTENT_SECTIONS = {
  article: 'tin-tuc',
  community: 'cong-dong',
  property: 'bat-dong-san',
  job: 'viec-lam',
};

const EDITOR_SECTIONS = {
  community: '/cong-dong/create',
  property: '/studio/bat-dong-san',
  job: '/studio/viec-lam',
  article: '/quan-tri/bai-viet',
  news_tip: '/gui-tin',
};

export function contentId(item) {
  if (!item) return '';

  if (typeof item === 'string') {
    return item;
  }

  return String(item._id || item.id || '');
}

export function isPersistedContentId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || ''));
}

// Giữ helper này cho các URL cũ trong thời gian chuyển tiếp. Content Studio V2
// không dùng session id làm định danh chính nữa; URL editor dùng Content._id thật.
export function createEditorSessionId(prefix = 'draft') {
  const safePrefix = String(prefix || 'draft')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'draft';

  if (globalThis.crypto?.randomUUID) {
    return `${safePrefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${safePrefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function editorBasePath(type) {
  return EDITOR_SECTIONS[type] || '/dang-bai';
}

export function editorPath(item) {
  const id = contentId(item);
  const base = editorBasePath(item?.contentType);

  if (!id || base === '/dang-bai') {
    return base;
  }

  return `${base}/${encodeURIComponent(id)}`;
}

export function contentPath(item) {
  const type = item?.contentType;
  const slug = String(item?.slug || '').trim();
  const section = CONTENT_SECTIONS[type];

  if (!section || !slug) {
    return '#';
  }

  const encodedSlug = encodeURIComponent(slug);

  if (type === 'community') {
    const username = String(
      item?.authorId?.username ||
        item?.author?.username ||
        item?.username ||
        '',
    ).trim();

    if (username) {
      return `/${section}/${encodeURIComponent(username)}/${encodedSlug}`;
    }
  }

  // URL công khai canonical không chứa MongoDB id. Các route id/slug cũ vẫn
  // được giữ trong router để backlink không gãy nhưng link mới luôn dùng slug.
  return `/${section}/${encodedSlug}`;
}

export function contentTypeLabel(type) {
  return CONTENT_TYPES[type] || 'Nội dung';
}

export function getAuthor(item) {
  return item?.authorId || item?.author || null;
}
