import { useEffect } from 'react';

const SITE_ORIGIN = 'https://dothihoalac.vn';
const SITE_NAME = 'Đô Thị Hòa Lạc';
const DEFAULT_DESCRIPTION =
  'Thông tin, cộng đồng, bất động sản và việc làm tại khu vực Hòa Lạc.';

function absoluteUrl(value = '') {
  const input = String(value || '').trim();
  if (!input) return '';

  try {
    return new URL(input, SITE_ORIGIN).toString();
  } catch {
    return '';
  }
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

function defaultStructuredData({ title, description, canonicalUrl }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonicalUrl,
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
        url: `${SITE_ORIGIN}/Logo2.png`,
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
    const pathCanonical = typeof window !== 'undefined'
      ? `${window.location.pathname || '/'}${window.location.pathname === '/' ? '' : ''}`
      : '/';
    const canonicalUrl = absoluteUrl(canonical || pathCanonical) || SITE_ORIGIN;
    const imageUrl = absoluteUrl(image);

    document.title = fullTitle;
    setNamedMeta('description', resolvedDescription);
    setNamedMeta(
      'robots',
      noindex
        ? 'noindex,nofollow'
        : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    );

    setCanonical(canonicalUrl);

    setPropertyMeta('og:locale', 'vi_VN');
    setPropertyMeta('og:site_name', SITE_NAME);
    setPropertyMeta('og:type', type || 'website');
    setPropertyMeta('og:title', fullTitle);
    setPropertyMeta('og:description', resolvedDescription);
    setPropertyMeta('og:url', canonicalUrl);

    setNamedMeta('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    setNamedMeta('twitter:title', fullTitle);
    setNamedMeta('twitter:description', resolvedDescription);

    if (imageUrl) {
      setPropertyMeta('og:image', imageUrl);
      setNamedMeta('twitter:image', imageUrl);
    } else {
      document.head.querySelector('meta[property="og:image"]')?.remove();
      document.head.querySelector('meta[name="twitter:image"]')?.remove();
    }

    const structuredData = compactJsonLd(
      jsonLd ||
        defaultStructuredData({
          title: plainTitle,
          description: resolvedDescription,
          canonicalUrl,
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
