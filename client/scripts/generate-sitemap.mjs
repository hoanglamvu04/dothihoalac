import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SITE_ORIGIN = String(process.env.VITE_SITE_URL || 'https://dothihoalac.vn')
  .trim()
  .replace(/\/+$/, '');
const API_PATH = '/api/v1';

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/tin-tuc', priority: '0.9', changefreq: 'hourly' },
  { path: '/cong-dong', priority: '0.9', changefreq: 'hourly' },
  { path: '/bat-dong-san', priority: '0.9', changefreq: 'hourly' },
  { path: '/viec-lam', priority: '0.9', changefreq: 'hourly' },
  { path: '/lien-he', priority: '0.6', changefreq: 'monthly' },
  { path: '/gioi-thieu', priority: '0.6', changefreq: 'monthly' },
  { path: '/gui-tin', priority: '0.6', changefreq: 'monthly' },
  { path: '/dieu-khoan', priority: '0.3', changefreq: 'yearly' },
  { path: '/chinh-sach-quyen-rieng', priority: '0.3', changefreq: 'yearly' },
  { path: '/quy-dinh-dang-bai', priority: '0.3', changefreq: 'yearly' },
];

function normalizeApiBase() {
  const explicitApi = String(process.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (explicitApi) return explicitApi;

  const server = String(process.env.VITE_SERVER_URL || '').trim().replace(/\/+$/, '');
  return server ? `${server}${API_PATH}` : '';
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
  const normalized = routePath === '/' ? '/' : `/${String(routePath || '').replace(/^\/+|\/+$/g, '')}`;
  return `${SITE_ORIGIN}${normalized}`;
}

function normalizeListPayload(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) return { items: data, meta: payload?.meta || {} };
  if (Array.isArray(data?.items)) return { items: data.items, meta: data.meta || payload?.meta || {} };
  return { items: [], meta: payload?.meta || data?.meta || {} };
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPublicItems(apiBase, endpoint) {
  if (!apiBase) return [];

  const items = [];
  const seen = new Set();
  let page = 1;
  let totalPages = 1;

  do {
    const separator = endpoint.includes('?') ? '&' : '?';
    const payload = await fetchJson(`${apiBase}${endpoint}${separator}page=${page}&limit=100`);
    const normalized = normalizeListPayload(payload);

    normalized.items.forEach((item) => {
      const slug = String(item?.slug || '').trim();
      if (!slug || seen.has(slug)) return;
      seen.add(slug);
      items.push(item);
    });

    totalPages = Math.min(
      20,
      Math.max(1, Number(normalized.meta?.totalPages || normalized.meta?.pages || 1) || 1),
    );
    page += 1;
  } while (page <= totalPages);

  return items;
}

function dynamicEntry(prefix, item, priority = '0.7') {
  return {
    path: `${prefix}/${encodeURIComponent(item.slug)}`,
    priority,
    changefreq: 'weekly',
    lastmod: item.updatedAt || item.publishedAt || item.createdAt || '',
  };
}

async function collectDynamicRoutes() {
  const apiBase = normalizeApiBase();
  if (!apiBase) return [];

  try {
    const [articles, community, properties, jobs] = await Promise.all([
      fetchPublicItems(apiBase, '/articles'),
      fetchPublicItems(apiBase, '/community'),
      fetchPublicItems(apiBase, '/properties'),
      fetchPublicItems(apiBase, '/jobs'),
    ]);

    return [
      ...articles.map((item) => dynamicEntry('/tin-tuc', item, '0.8')),
      ...community.map((item) => dynamicEntry('/cong-dong', item, '0.7')),
      ...properties.map((item) => dynamicEntry('/bat-dong-san', item, '0.8')),
      ...jobs.map((item) => dynamicEntry('/viec-lam', item, '0.8')),
    ];
  } catch (error) {
    console.warn(`[sitemap] Dynamic API fetch skipped: ${error.message}`);
    return [];
  }
}

function renderEntry(entry) {
  const lastmod = entry.lastmod ? `\n    <lastmod>${xmlEscape(new Date(entry.lastmod).toISOString())}</lastmod>` : '';

  return `  <url>\n    <loc>${xmlEscape(absoluteUrl(entry.path))}</loc>${lastmod}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`;
}

const dynamicRoutes = await collectDynamicRoutes();
const uniqueEntries = new Map();

[...STATIC_ROUTES, ...dynamicRoutes].forEach((entry) => {
  uniqueEntries.set(entry.path, entry);
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...uniqueEntries.values()].map(renderEntry).join('\n')}\n</urlset>\n`;

const currentFile = fileURLToPath(import.meta.url);
const publicDir = path.resolve(path.dirname(currentFile), '..', 'public');
await mkdir(publicDir, { recursive: true });
await writeFile(path.join(publicDir, 'sitemap.xml'), xml, 'utf8');

console.log(`[sitemap] Generated ${uniqueEntries.size} URLs.`);
