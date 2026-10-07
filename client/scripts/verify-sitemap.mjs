import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentFile = fileURLToPath(import.meta.url);
const publicDir = path.resolve(path.dirname(currentFile), '..', 'public');
const siteOrigin = String(process.env.VITE_SITE_URL || 'https://dothihoalac.vn')
  .trim()
  .replace(/\/+$/, '');
const isCi = String(process.env.CI || '').toLowerCase() === 'true';
const isVercel = String(process.env.VERCEL || '').toLowerCase() === '1';
const allowStaticOnly =
  String(process.env.SITEMAP_ALLOW_STATIC_ONLY || '').toLowerCase() === 'true';
const strict =
  !allowStaticOnly &&
  (String(process.env.SEO_SITEMAP_STRICT || '').toLowerCase() === 'true' ||
    ((isCi || isVercel) && siteOrigin === 'https://dothihoalac.vn'));

const diagnosticFiles = [
  'sitemap-pages.xml',
  'sitemap-areas.xml',
  'sitemap-news.xml',
  'sitemap-community.xml',
  'sitemap-properties.xml',
  'sitemap-jobs.xml',
];

const requiredFiles = [
  'sitemap.xml',
  ...diagnosticFiles,
  'sitemap-status.json',
];

for (const file of requiredFiles) {
  const value = await readFile(path.join(publicDir, file), 'utf8');
  if (!value.trim()) throw new Error(`[seo] ${file} is empty.`);
}

const sitemap = await readFile(path.join(publicDir, 'sitemap.xml'), 'utf8');

if (!sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
  throw new Error('[seo] sitemap.xml must start with a UTF-8 XML declaration.');
}

if (!sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
  throw new Error('[seo] sitemap.xml must be a standard sitemap urlset.');
}

if (sitemap.includes('<sitemapindex')) {
  throw new Error('[seo] sitemap.xml must not be a sitemap index for the Google compatibility build.');
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

if (Number(counts.total || 0) < Number(counts.pages || 0) + Number(counts.areas || 0)) {
  throw new Error(`[seo] Combined sitemap total is invalid: ${counts.total || 0}.`);
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

const privatePrefixes = [
  '/quan-tri',
  '/tai-khoan',
  '/studio',
  '/dang-bai',
  '/dang-nhap',
  '/dang-ky',
  '/quen-mat-khau',
  '/dat-lai-mat-khau',
  '/xac-thuc-email',
  '/xac-thuc-so-dien-thoai',
  '/tim-kiem',
  '/cong-dong/create',
];

for (const prefix of privatePrefixes) {
  if (sitemap.includes(`${siteOrigin}${prefix}`)) {
    throw new Error(`[seo] Private/noindex route leaked into sitemap.xml: ${prefix}`);
  }
}

for (const requiredRoute of ['/', '/tin-tuc', '/cong-dong', '/bat-dong-san', '/viec-lam']) {
  const expected = `${siteOrigin}${requiredRoute}`;
  if (!sitemap.includes(`<loc>${expected}</loc>`)) {
    throw new Error(`[seo] sitemap.xml is missing required URL: ${expected}`);
  }
}

for (const file of diagnosticFiles) {
  const xml = await readFile(path.join(publicDir, file), 'utf8');
  if (!xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
    throw new Error(`[seo] ${file} is not a valid urlset.`);
  }
}

console.log(
  `[seo] Single sitemap validation passed${strict ? ' (strict)' : ''}: ${JSON.stringify(counts)}.`,
);
