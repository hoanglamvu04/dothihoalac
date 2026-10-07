import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const SITE_ORIGIN = String(
  import.meta.env.VITE_SITE_URL || 'https://dothihoalac.vn',
)
  .trim()
  .replace(/\/+$/, '');

function areaSeoOverrides(title, description) {
  if (typeof window === 'undefined') return null;

  const path = window.location.pathname || '';
  if (!path.startsWith('/khu-vuc/')) return null;

  const missingArea = title === 'Không tìm thấy khu vực';
  if (missingArea) {
    return {
      title,
      description,
      canonical: path,
      noindex: true,
      jsonLd: null,
    };
  }

  const resolvedTitle = `${title} – Tin tức, BĐS & cộng đồng`;
  const resolvedDescription =
    description ||
    `Tin tức, cộng đồng, việc làm và thị trường bất động sản tại ${title}, Hòa Lạc – Thạch Thất, Hà Nội.`;
  const canonicalUrl = `${SITE_ORIGIN}${path}`;

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    canonical: path,
    noindex: false,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#webpage`,
        name: resolvedTitle,
        description: resolvedDescription,
        url: canonicalUrl,
        inLanguage: 'vi-VN',
        about: {
          '@type': 'Place',
          name: title,
          address: {
            '@type': 'PostalAddress',
            addressLocality: title,
            addressRegion: 'Hà Nội',
            addressCountry: 'VN',
          },
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Trang chủ',
            item: `${SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };
}

export default function Seo({
  title,
  description = '',
  canonical = '',
  image = '',
  type = 'website',
  noindex = false,
  jsonLd = null,
}) {
  const area = areaSeoOverrides(title, description);

  useDocumentTitle(area?.title || title, area?.description || description, {
    canonical: area?.canonical || canonical,
    image,
    type,
    noindex: Boolean(noindex || area?.noindex),
    jsonLd: area?.jsonLd || jsonLd,
  });

  return null;
}
