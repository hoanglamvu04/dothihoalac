import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentFile = fileURLToPath(import.meta.url);
const publicDir = path.resolve(path.dirname(currentFile), '..', 'public');
const siteOrigin = String(process.env.VITE_SITE_URL || 'https://dothihoalac.vn')
  .trim()
  .replace(/\/+$/, '');
const isCi = String(process.env.CI || '').toLowerCase() === 'true';
const strict =
  String(process.env.SEO_SITEMAP_STRICT || '').toLowerCase() === 'true' ||
  (isCi && siteOrigin === 'https://dothihoalac.vn');

const requiredFiles = [
  'sitemap.xml',
  'sitemap-pages.xml',
  'sitemap-areas.xml',
  'sitemap-news.xml',
  'sitemap-community.xml',
  'sitemap-properties.xml',
  'sitemap-jobs.xml',
  'sitemap-status.json',
];

for (const file of requiredFiles) {
  const value = await readFile(path.join(publicDir, file), 'utf8');
  if (!value.trim()) throw new Error(`[seo] ${file} is empty.`);
}

const index = await readFile(path.join(publicDir, 'sitemap.xml'), 'utf8');
if (!index.includes('<sitemapindex')) {
  throw new Error('[seo] sitemap.xml must be a sitemap index.');
}

const status = JSON.parse(
  await readFile(path.join(publicDir, 'sitemap-status.json'), 'utf8'),
);
const counts = status?.counts || {};

if (Number(counts.pages || 0) < 8) {
  throw new Error(`[seo] Too few static pages in sitemap: ${counts.pages || 0}.`);
}

if (Number(counts.areas || 0) < 6) {
  throw new Error(`[seo] Core area sitemap is incomplete: ${counts.areas || 0}.`);
}

if (strict) {
  for (const key of ['news', 'community', 'properties', 'jobs']) {
    if (Number(counts[key] || 0) < 1) {
      throw new Error(
        `[seo] Strict sitemap validation failed: ${key} has no dynamic URLs.`,
      );
    }
  }
}

console.log(
  `[seo] Sitemap validation passed${strict ? ' (strict)' : ''}: ${JSON.stringify(counts)}.`,
);
