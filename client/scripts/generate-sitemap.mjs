import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SITE_ORIGIN = String(process.env.VITE_SITE_URL || 'https://dothihoalac.vn')
  .trim()
  .replace(/\/+$/, '');
const API_PATH = '/api/v1';
const DEFAULT_PRODUCTION_API = 'https://api.dothihoalac.vn/api/v1';

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/tin-tuc', priority: '0.9', changefreq: 'hourly' },
  { path: '/cong-dong', priority: '0.9', changefreq: 'hourly' },
  { path: '/bat-dong-san', priority: '0.9', changefreq: 'hourly' },
  { path: '/viec-lam', priority: '0.9', changefreq: 'hourly' },
  { path: '/gioi-thieu', priority: '0.7', changefreq: 'monthly' },
  { path: '/lien-he', priority: '0.6', changefreq: 'monthly' },
  { path: '/tu-van-kien-truc', priority: '0.6', changefreq: 'monthly' },
  { path: '/uoc-tinh-chi-phi-xay-dung', priority: '0.6', changefreq: 'monthly' },
  { path: '/tim-homestay', priority: '0.5', changefreq: 'monthly' },
  { path: '/dat-villa', priority: '0.5', changefreq: 'monthly' },
  { path: '/dieu-khoan-su-dung', priority: '0.2', changefreq: 'yearly' },
  { path: '/chinh-sach-quyen-rieng-tu', priority: '0.2', changefreq: 'yearly' },
  { path: '/quy-dinh-dang-bai', priority: '0.2', changefreq: 'yearly' },
];

const CORE_AREAS = [
  { slug: 'hoa-lac', name: 'Hòa Lạc' },
  { slug: 'ha-bang', name: 'Hạ Bằng' },
  { slug: 'phu-cat', name: 'Phú Cát' },
  { slug: 'thach-that', name: 'Thạch Thất' },
  { slug: 'tay-phuong', name: 'Tây Phương' },
  { slug: 'yen-xuan', name: 'Yên Xuân' },
];

const SITEMAP_GROUPS = [
  'pages',
  'areas',
  'news',
  'community',
  'properties',
  'jobs',
];

function normalizeApiBase() {
  const explicitApi = String(process.env.VITE_API_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (explicitApi) return explicitApi;

  const server = String(process.env.VITE_SERVER_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (server) return `${server}${API_PATH}`;

  return SITE_ORIGIN === 'https://dothihoalac.vn'
    ? DEFAULT_PRODUCTION_API
    : '';
}

function xmlEscape(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function absoluteUrl(routePath) {
  const normalized = routePath === '/'
    ? '/'
    : `/${String(routePath || '').replace(/^\/+|\/+$/g, '')}`;
  return `${SITE_ORIGIN}${normalized}`;
}

function safeIso(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function normalizeListPayload(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) return { items: data, meta: payload?.meta || {} };
  if (Array.isArray(data?.items)) {
    return { items: data.items, meta: data.meta || payload?.meta || {} };
  }
  return { items: [], meta: payload?.meta || data?.meta || {} };
}

async function fetchJson(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DTHL-Sitemap-Generator/2.0',
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

async function fetchPublicItems(apiBase, endpoint) {
  if (!apiBase) return [];

  const items = [];
  const seen = new Set();
  let page = 1;
  let totalPages = 1;

  do {
    const separator = endpoint.includes('?') ? '&' : '?';
    const payload = await fetchJson(
      `${apiBase}${endpoint}${separator}page=${page}&limit=100`,
    );
    const normalized = normalizeListPayload(payload);

    normalized.items.forEach((item) => {
      const slug = String(item?.slug || '').trim();
      if (!slug || seen.has(slug)) return;
      seen.add(slug);
      items.push(item);
    });

    totalPages = Math.min(
      100,
      Math.max(
        1,
        Number(normalized.meta?.totalPages || normalized.meta?.pages || 1) || 1,
      ),
    );
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function fetchAreas(apiBase) {
  if (!apiBase) return CORE_AREAS;

  try {
    const payload = await fetchJson(`${apiBase}/taxonomy/bootstrap`);
    const areas = Array.isArray(payload?.data?.areas)
      ? payload.data.areas
      : Array.isArray(payload?.areas)
        ? payload.areas
        : [];

    const active = areas.filter(
      (item) => item?.isActive !== false && String(item?.slug || '').trim(),
    );

    const map = new Map(
      CORE_AREAS.map((item) => [item.slug, item]),
    );
    active.forEach((item) => map.set(item.slug, item));
    return [...map.values()];
  } catch (error) {
    console.warn(`[sitemap] Area fetch failed, using core areas: ${error.message}`);
    return CORE_AREAS;
  }
}

function dynamicEntry(prefix, item, priority = '0.7') {
  return {
    path: `${prefix}/${encodeURIComponent(item.slug)}`,
    priority,
    changefreq: 'weekly',
    lastmod: item.updatedAt || item.publishedAt || item.createdAt || '',
  };
}

function renderUrlEntry(entry) {
  const lastmod = safeIso(entry.lastmod);
  return [
    '  <url>',
    `    <loc>${xmlEscape(absoluteUrl(entry.path))}</loc>`,
    ...(lastmod ? [`    <lastmod>${xmlEscape(lastmod)}</lastmod>`] : []),
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function renderUrlSet(entries) {
  const unique = new Map();
  entries.forEach((entry) => unique.set(entry.path, entry));

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...unique.values()]
    .map(renderUrlEntry)
    .join('\n')}\n</urlset>\n`;
}

function renderSitemapIndex(lastmod) {
  const items = SITEMAP_GROUPS.map((group) => [
    '  <sitemap>',
    `    <loc>${xmlEscape(`${SITE_ORIGIN}/sitemap-${group}.xml`)}</loc>`,
    `    <lastmod>${xmlEscape(lastmod)}</lastmod>`,
    '  </sitemap>',
  ].join('\n'));

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>\n`;
}

async function safeCollection(apiBase, endpoint, label) {
  try {
    const items = await fetchPublicItems(apiBase, endpoint);
    console.log(`[sitemap] ${label}: ${items.length} URLs from API.`);
    return items;
  } catch (error) {
    console.warn(`[sitemap] ${label} fetch failed: ${error.message}`);
    return [];
  }
}

const apiBase = normalizeApiBase();
console.log(`[sitemap] Site: ${SITE_ORIGIN}`);
console.log(`[sitemap] API: ${apiBase || 'disabled'}`);

const [articles, community, properties, jobs, areas] = await Promise.all([
  safeCollection(apiBase, '/articles', 'news'),
  safeCollection(apiBase, '/community', 'community'),
  safeCollection(apiBase, '/properties', 'properties'),
  safeCollection(apiBase, '/jobs', 'jobs'),
  fetchAreas(apiBase),
]);

const sitemapSets = {
  pages: STATIC_ROUTES,
  areas: areas.map((item) => ({
    path: `/khu-vuc/${encodeURIComponent(item.slug)}`,
    priority: CORE_AREAS.some((area) => area.slug === item.slug) ? '0.8' : '0.6',
    changefreq: 'daily',
    lastmod: item.updatedAt || '',
  })),
  news: articles.map((item) => dynamicEntry('/tin-tuc', item, '0.8')),
  community: community.map((item) => dynamicEntry('/cong-dong', item, '0.7')),
  properties: properties.map((item) => dynamicEntry('/bat-dong-san', item, '0.8')),
  jobs: jobs.map((item) => dynamicEntry('/viec-lam', item, '0.8')),
};

const currentFile = fileURLToPath(import.meta.url);
const publicDir = path.resolve(path.dirname(currentFile), '..', 'public');
await mkdir(publicDir, { recursive: true });

for (const [group, entries] of Object.entries(sitemapSets)) {
  await writeFile(
    path.join(publicDir, `sitemap-${group}.xml`),
    renderUrlSet(entries),
    'utf8',
  );
}

const generatedAt = new Date().toISOString();
await writeFile(
  path.join(publicDir, 'sitemap.xml'),
  renderSitemapIndex(generatedAt),
  'utf8',
);

const counts = Object.fromEntries(
  Object.entries(sitemapSets).map(([group, entries]) => [group, entries.length]),
);
await writeFile(
  path.join(publicDir, 'sitemap-status.json'),
  `${JSON.stringify({ generatedAt, apiBase, counts }, null, 2)}\n`,
  'utf8',
);

console.log(`[sitemap] Generated sitemap index: ${JSON.stringify(counts)}.`);
