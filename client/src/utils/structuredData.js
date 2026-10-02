const SITE_ORIGIN = String(
  import.meta.env.VITE_SITE_URL ||
    'https://dothihoalac.vn',
)
  .trim()
  .replace(/\/+$/, '');

const PUBLISHER = {
  '@type': 'Organization',
  name: 'Đô Thị Hòa Lạc',
  url: SITE_ORIGIN,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_ORIGIN}/Logo2.png`,
  },
};

function absoluteUrl(path = '/') {
  try {
    return new URL(path, SITE_ORIGIN).toString();
  } catch {
    return SITE_ORIGIN;
  }
}

function compact(value) {
  if (Array.isArray(value)) {
    return value
      .map(compact)
      .filter(Boolean);
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([, item]) =>
            item !== undefined &&
            item !== null &&
            item !== '',
        )
        .map(([key, item]) => [
          key,
          compact(item),
        ]),
    );
  }

  return value;
}

function breadcrumbs(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(
      (item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      }),
    ),
  };
}

function safeIso(value) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString();
}

function salaryUnitText(unit) {
  const values = {
    month: 'MONTH',
    monthly: 'MONTH',
    hour: 'HOUR',
    hourly: 'HOUR',
    day: 'DAY',
    daily: 'DAY',
    project: 'PROJECT',
    year: 'YEAR',
    yearly: 'YEAR',
  };

  return values[unit] || undefined;
}

function employmentType(value) {
  const values = {
    full_time: 'FULL_TIME',
    part_time: 'PART_TIME',
    internship: 'INTERN',
    temporary: 'TEMPORARY',
    student: 'PART_TIME',
    construction: 'FULL_TIME',
    service: 'FULL_TIME',
  };

  return values[value] || undefined;
}

export function buildNewsArticleJsonLd({
  item,
  title,
  description,
  imageUrl,
  authorName,
  publishedAt,
  updatedAt,
}) {
  const slug = String(
    item?.slug || '',
  ).trim();

  const url = absoluteUrl(
    slug
      ? `/tin-tuc/${encodeURIComponent(slug)}`
      : '/tin-tuc',
  );

  return compact([
    {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: title,
      description,
      image: imageUrl
        ? [imageUrl]
        : undefined,
      datePublished: safeIso(publishedAt),
      dateModified:
        safeIso(updatedAt) ||
        safeIso(publishedAt),
      author: {
        '@type': authorName
          ? 'Person'
          : 'Organization',
        name:
          authorName ||
          'Ban biên tập Đô Thị Hòa Lạc',
      },
      publisher: PUBLISHER,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url,
      },
      url,
    },
    breadcrumbs([
      {
        name: 'Trang chủ',
        path: '/',
      },
      {
        name: 'Tin tức',
        path: '/tin-tuc',
      },
      {
        name: title,
        path: slug
          ? `/tin-tuc/${encodeURIComponent(slug)}`
          : '/tin-tuc',
      },
    ]),
  ]);
}

export function buildJobPostingJsonLd({
  item,
  job,
  description,
  companyName,
  workLocation,
  imageUrl,
}) {
  const slug = String(
    item?.slug || '',
  ).trim();

  const url = absoluteUrl(
    slug
      ? `/viec-lam/${encodeURIComponent(slug)}`
      : '/viec-lam',
  );

  const salaryMin = Number(
    job?.salaryMin,
  );
  const salaryMax = Number(
    job?.salaryMax,
  );

  const hasSalary =
    Number.isFinite(salaryMin) &&
    salaryMin > 0 ||
    Number.isFinite(salaryMax) &&
    salaryMax > 0;

  const salaryValue = hasSalary
    ? {
        '@type': 'QuantitativeValue',
        minValue:
          Number.isFinite(salaryMin) &&
          salaryMin > 0
            ? salaryMin
            : undefined,
        maxValue:
          Number.isFinite(salaryMax) &&
          salaryMax > 0
            ? salaryMax
            : undefined,
        unitText:
          salaryUnitText(
            job?.salaryUnit,
          ),
      }
    : undefined;

  return compact([
    {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: item?.title,
      description:
        description ||
        item?.title,
      identifier: item?._id
        ? {
            '@type':
              'PropertyValue',
            name: 'Đô Thị Hòa Lạc',
            value: String(item._id),
          }
        : undefined,
      datePosted: safeIso(
        item?.publishedAt ||
          item?.createdAt,
      ),
      validThrough:
        safeIso(job?.deadline),
      employmentType:
        employmentType(
          job?.jobType,
        ),
      hiringOrganization: {
        '@type': 'Organization',
        name:
          companyName ||
          job?.companyName ||
          'Nhà tuyển dụng',
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type':
            'PostalAddress',
          addressLocality:
            workLocation ||
            item?.primaryAreaId?.name ||
            'Hòa Lạc',
          addressRegion: 'Hà Nội',
          addressCountry: 'VN',
        },
      },
      baseSalary:
        salaryValue
          ? {
              '@type':
                'MonetaryAmount',
              currency: 'VND',
              value: salaryValue,
            }
          : undefined,
      image: imageUrl || undefined,
      url,
    },
    breadcrumbs([
      {
        name: 'Trang chủ',
        path: '/',
      },
      {
        name: 'Việc làm',
        path: '/viec-lam',
      },
      {
        name: item?.title,
        path: slug
          ? `/viec-lam/${encodeURIComponent(slug)}`
          : '/viec-lam',
      },
    ]),
  ]);
}

export function buildRealEstateListingJsonLd({
  item,
  property,
  description,
  address,
  imageUrl,
}) {
  const slug = String(
    item?.slug || '',
  ).trim();

  const url = absoluteUrl(
    slug
      ? `/bat-dong-san/${encodeURIComponent(slug)}`
      : '/bat-dong-san',
  );

  const price = Number(
    property?.price,
  );

  const hasPrice =
    Number.isFinite(price) &&
    price > 0 &&
    property?.priceUnit !==
      'negotiable';

  const businessFunction =
    property?.transactionType === 'rent' ||
    property?.transactionType ===
      'wanted_rent'
      ? 'http://purl.org/goodrelations/v1#LeaseOut'
      : property?.transactionType ===
            'sale' ||
          property?.transactionType ===
            'transfer'
        ? 'http://purl.org/goodrelations/v1#Sell'
        : undefined;

  const unitText = {
    total: 'TOTAL',
    per_m2: 'SQUARE_METER',
    per_month: 'MONTH',
  }[property?.priceUnit];

  return compact([
    {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: item?.title,
      description:
        description ||
        item?.title,
      url,
      datePosted: safeIso(
        item?.publishedAt ||
          item?.createdAt,
      ),
      expires:
        safeIso(
          property?.expiresAt,
        ),
      image: imageUrl || undefined,
      publisher: PUBLISHER,
      contentLocation: {
        '@type': 'Place',
        name:
          item?.primaryAreaId?.name ||
          'Hòa Lạc',
        address: {
          '@type':
            'PostalAddress',
          streetAddress:
            address || undefined,
          addressLocality:
            item?.primaryAreaId?.name ||
            'Hòa Lạc',
          addressRegion: 'Hà Nội',
          addressCountry: 'VN',
        },
      },
      offers: hasPrice
        ? {
            '@type': 'Offer',
            priceCurrency: 'VND',
            price,
            businessFunction,
            priceSpecification:
              unitText
                ? {
                    '@type':
                      'UnitPriceSpecification',
                    priceCurrency:
                      'VND',
                    price,
                    unitText,
                  }
                : undefined,
          }
        : undefined,
    },
    breadcrumbs([
      {
        name: 'Trang chủ',
        path: '/',
      },
      {
        name: 'Bất động sản',
        path: '/bat-dong-san',
      },
      {
        name: item?.title,
        path: slug
          ? `/bat-dong-san/${encodeURIComponent(slug)}`
          : '/bat-dong-san',
      },
    ]),
  ]);
}
