// Analytics is deliberately limited to PUBLIC ROUTE TYPES, never actual
// user/account/admin URLs, user-generated search values or profile slugs.
// A route with a dynamic public slug is reduced to its canonical section.
const PUBLIC_EXACT = new Set([
  '/', '/tin-tuc', '/cong-dong', '/bat-dong-san', '/nha-dat',
  '/viec-lam', '/tim-kiem', '/khu-vuc', '/lien-he', '/tu-van',
  '/tu-van-kien-truc', '/uoc-tinh-chi-phi-xay-dung',
  '/tim-homestay', '/dat-villa', '/gioi-thieu',
  '/dieu-khoan', '/dieu-khoan-su-dung',
  '/chinh-sach-quyen-rieng', '/chinh-sach-quyen-rieng-tu',
  '/quy-dinh-dang-bai',
]);

const PUBLIC_SECTIONS = [
  '/tin-tuc/', '/bat-dong-san/', '/nha-dat/', '/viec-lam/',
  '/cong-dong/', '/khu-vuc/', '/trang/',
];

export function safePublicAnalyticsPath(pathname) {
  if (typeof pathname !== 'string' ||
      !pathname.startsWith('/') ||
      pathname.length > 500 ||
      /[?#@\u0000-\u001f]/.test(pathname)) return null;

  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (PUBLIC_EXACT.has(normalized)) return normalized === '/nha-dat'
    ? '/bat-dong-san' : normalized;

  if (normalized.startsWith('/cong-dong/create/')) return null;
  if (normalized.startsWith('/cong-dong/create')) return null;

  const section = PUBLIC_SECTIONS.find((prefix) =>
    normalized.startsWith(prefix) && normalized.length > prefix.length);
  if (!section) return null;
  if (section === '/nha-dat/') return '/bat-dong-san';
  if (section === '/trang/') return '/trang';
  return section.slice(0, -1);
}

export function publicArticleSlug(slug) {
  return typeof slug === 'string' &&
    /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(slug) &&
    !/\d{9,}/.test(slug)
    ? slug : '';
}

export function privacySignalEnabled(root = globalThis) {
  const navigator = root.navigator;
  return navigator?.globalPrivacyControl === true ||
    navigator?.doNotTrack === '1' ||
    navigator?.msDoNotTrack === '1' ||
    root.doNotTrack === '1';
}

export function isPublicContactHref(href = '') {
  if (typeof href !== 'string') return false;
  const value = href.trim().toLowerCase();
  // Only classify, never send actual numbers, addresses or link URLs.
  return value.startsWith('tel:') ||
    value.startsWith('mailto:') ||
    value === '/lien-he' ||
    value.startsWith('/lien-he?') ||
    value === '/tu-van' ||
    value.startsWith('/tu-van?') ||
    value === '#lead-request-form' ||
    /^https:\/\/(zalo\.me|(?:www\.)?zaloapp\.com)\//.test(value);
}
