import { useEffect } from 'react';

const SITE_ORIGIN = String(
  import.meta.env.VITE_SITE_URL || 'https://dothihoalac.vn',
)
  .trim()
  .replace(/\/+$/, '');
const SITE_NAME = 'Đô Thị Hòa Lạc';
const DEFAULT_DESCRIPTION =
  'Thông tin, cộng đồng, bất động sản và việc làm tại khu vực Hòa Lạc.';
const DEFAULT_SOCIAL_IMAGE = `${SITE_ORIGIN}/Logo2.png`;
const PRIVATE_PATH_PREFIXES = [
  '/tai-khoan',
  '/admin',
  '/studio',
  '/dang-bai',
  '/dang-nhap',
  '/dang-ky',
  '/quen-mat-khau',
  '/dat-lai-mat-khau',
  '/xac-thuc-email',
  '/xac-thuc-so-dien-thoai',
];

function absoluteUrl(value = '') {
  const input = String(value || '').trim();
  if (!input) return '';

  try {
    return new URL(input, SITE_ORIGIN).toString();
  } catch {
    return '';
  }
}

function normalizeCanonicalPath(pathname = '/') {
  let path = String(pathname || '/').replace(/\/{2,}/g, '/');
  if (!path.startsWith('/')) path = `/${path}`;

  if (path === '/nha-dat' || path.startsWith('/nha-dat/')) {
    path = `/bat-dong-san${path.slice('/nha-dat'.length)}`;
  }

  const articleAlias = path.match(/^\/tin-tuc\/[^/]+\/([^/]+)\/?$/);
  if (articleAlias?.[1]) {
    path = `/tin-tuc/${articleAlias[1]}`;
  }

  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

function shouldNoindexPath(pathname = '') {
  const normalized = String(pathname || '');
  if (normalized === '/tim-kiem' || normalized.startsWith('/tim-kiem/')) return true;

  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function inferOpenGraphType(pathname, requestedType) {
  if (requestedType && requestedType !== 'website') return requestedType;
  return /^\/tin-tuc\/[^/]+/.test(String(pathname || '')) ? 'article' : 'website';
}

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
}

function setNamedMeta(name, content) {
  ensureMeta(`meta[name="${name}"]`, { name, content });
}

function setPropertyMeta(property, content) {
  ensureMeta(`meta[property="${property}"]`, { property, content });
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = href;
}

function compactJsonLd(value) {
  if (!value || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    return value.map(compactJsonLd).filter(Boolean);
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && item !== null && item !== '')
      .map(([key, item]) => [
        key,
        typeof item === 'object' ? compactJsonLd(item) : item,
      ]),
  );
}

function defaultStructuredData({ title, description, canonicalUrl, currentPath }) {
  const isArticle = /^\/tin-tuc\/[^/]+/.test(currentPath);

  return {
    '@context': 'https://schema.org',
    '@type': isArticle ? 'Article' : 'WebPage',
    name: title,
    headline: isArticle ? title : undefined,
    description,
    url: canonicalUrl,
    mainEntityOfPage: isArticle
      ? { '@type': 'WebPage', '@id': canonicalUrl }
      : undefined,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_SOCIAL_IMAGE,
      },
    },
  };
}

export function useDocumentTitle(
  title,
  description = '',
  {
    canonical = '',
    image = '',
    type = 'website',
    noindex = false,
    jsonLd = null,
  } = {},
) {
  useEffect(() => {
    const plainTitle = String(title || SITE_NAME).trim() || SITE_NAME;
    const fullTitle = plainTitle === SITE_NAME
      ? SITE_NAME
      : `${plainTitle} | ${SITE_NAME}`;
    const resolvedDescription = String(description || DEFAULT_DESCRIPTION).trim();
    const currentPath = typeof window !== 'undefined'
      ? window.location.pathname || '/'
      : '/';
    const canonicalPath = normalizeCanonicalPath(currentPath);
    const canonicalUrl = absoluteUrl(canonical || canonicalPath) || SITE_ORIGIN;
    const customImageUrl = absoluteUrl(image);
    const imageUrl = customImageUrl || DEFAULT_SOCIAL_IMAGE;
    const effectiveNoindex = Boolean(noindex || shouldNoindexPath(currentPath));
    const openGraphType = inferOpenGraphType(currentPath, type);

    document.title = fullTitle;
    setNamedMeta('description', resolvedDescription);
    setNamedMeta(
      'robots',
      effectiveNoindex
        ? 'noindex,nofollow'
        : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    );

    setCanonical(canonicalUrl);

    setPropertyMeta('og:locale', 'vi_VN');
    setPropertyMeta('og:site_name', SITE_NAME);
    setPropertyMeta('og:type', openGraphType);
    setPropertyMeta('og:title', fullTitle);
    setPropertyMeta('og:description', resolvedDescription);
    setPropertyMeta('og:url', canonicalUrl);
    setPropertyMeta('og:image', imageUrl);

    setNamedMeta('twitter:card', customImageUrl ? 'summary_large_image' : 'summary');
    setNamedMeta('twitter:title', fullTitle);
    setNamedMeta('twitter:description', resolvedDescription);
    setNamedMeta('twitter:image', imageUrl);

    const structuredData = compactJsonLd(
      jsonLd ||
        defaultStructuredData({
          title: plainTitle,
          description: resolvedDescription,
          canonicalUrl,
          currentPath,
        }),
    );

    let script = document.head.querySelector('script[data-dthl-seo-jsonld="true"]');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.dthlSeoJsonld = 'true';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
  }, [canonical, description, image, jsonLd, noindex, title, type]);
}
