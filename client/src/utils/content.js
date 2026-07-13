import { CONTENT_TYPES } from './constants';

export function contentPath(item) {
  const type = item?.contentType;
  const slug = item?.slug;
  if (!slug) return '#';
  if (type === 'article') return `/tin-tuc/${slug}`;
  if (type === 'community') return `/cong-dong/${slug}`;
  if (type === 'property') return `/nha-dat/${slug}`;
  if (type === 'job') return `/viec-lam/${slug}`;
  return `/noi-dung/${slug}`;
}

export function contentTypeLabel(type) {
  return CONTENT_TYPES[type] || 'Nội dung';
}

export function getAuthor(item) {
  return item?.authorId || item?.author || null;
}
