import { CONTENT_TYPES } from './constants';

const CONTENT_SECTIONS = {
  article: 'tin-tuc',
  community: 'cong-dong',
  property: 'nha-dat',
  job: 'viec-lam',
};

const EDITOR_SECTIONS = {
  community: '/dang-bai/cong-dong',
  property: '/dang-bai/nha-dat',
  job: '/dang-bai/viec-lam',
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
  const id = contentId(item);
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

    return `/${section}/${encodedSlug}`;
  }

  if (id) {
    return `/${section}/${encodeURIComponent(id)}/${encodedSlug}`;
  }

  return `/${section}/${encodedSlug}`;
}

export function contentTypeLabel(type) {
  return CONTENT_TYPES[type] || 'Nội dung';
}

export function getAuthor(item) {
  return item?.authorId || item?.author || null;
}
