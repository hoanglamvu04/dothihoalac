import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';

import sanitizeHtml from 'sanitize-html';
import sharp from 'sharp';

import { env } from '../../config/env.js';
import {
  deleteCloudinaryAsset,
  uploadImage as uploadTemporaryImage,
} from '../../services/storage.service.js';
import ApiError from '../../utils/ApiError.js';
import Article from './article.model.js';
import { adminDeleteArticle } from './article.admin.delete.service.js';
import * as articleService from './article.service.js';
import { createArticleGoogleDocFast } from '../googleWorkspace/googleWorkspace.document.service.js';
import {
  documentStatusForContent,
  ensureWorkspaceFolders,
  folderIdForDocumentStatus,
  googleDocUrl,
  loadConnectedGoogle,
} from '../googleWorkspace/googleWorkspace.service.js';

const MAX_URL_LENGTH = 2000;
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 120000;
const MAX_REDIRECTS = 5;
const PAGE_TIMEOUT_MS = 15000;
const IMAGE_TIMEOUT_MS = 12000;
const MAX_IMAGE_BYTES = Math.max(
  1,
  Number(env.MAX_IMAGE_SIZE_MB || 10),
) * 1024 * 1024;
const MAX_IMAGES = Math.max(
  1,
  Number(env.MAX_IMAGES_PER_CONTENT || 20),
);

const ARTICLE_TYPES = new Set([
  'article',
  'newsarticle',
  'reportagearticle',
  'blogposting',
]);

const TRACKING_QUERY_KEYS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'mc_cid',
  'mc_eid',
  'igshid',
]);

const NOISE_CLASS_PATTERN =
  /(?:^|[-_\s])(advert|advertisement|banner|breadcrumb|comment|cookie|footer|header|menu|nav|newsletter|popup|promo|recommend|related|share|sidebar|social|subscribe|tracking)(?:$|[-_\s])/i;

function safeText(value = '', max = 1000) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

function escapeHtml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function plainText(value = '', max = MAX_TEXT_CHARS) {
  const text = sanitizeHtml(String(value || ''), {
    allowedTags: [],
    allowedAttributes: {},
  });

  return safeText(text, max);
}

function parseTagAttributes(tag = '') {
  const attrs = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;

  while ((match = pattern.exec(tag))) {
    attrs[String(match[1] || '').toLowerCase()] =
      match[2] ?? match[3] ?? match[4] ?? '';
  }

  return attrs;
}

function extractMeta(html, key) {
  const normalized = String(key || '').toLowerCase();
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const attrs = parseTagAttributes(tag);
    const name = String(
      attrs.property || attrs.name || attrs.itemprop || '',
    ).toLowerCase();

    if (name === normalized && attrs.content) {
      return safeText(attrs.content, 4000);
    }
  }

  return '';
}

function extractCanonicalLink(html) {
  const tags = String(html || '').match(/<link\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const attrs = parseTagAttributes(tag);
    const rel = String(attrs.rel || '').toLowerCase().split(/\s+/);
    if (rel.includes('canonical') && attrs.href) {
      return String(attrs.href).trim();
    }
  }

  return '';
}

function jsonLdNodes(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => jsonLdNodes(item, result));
    return result;
  }

  if (!value || typeof value !== 'object') return result;

  result.push(value);
  if (Array.isArray(value['@graph'])) {
    value['@graph'].forEach((item) => jsonLdNodes(item, result));
  }

  return result;
}

function extractArticleJsonLd(html) {
  const scripts = String(html || '').match(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
  ) || [];

  let best = null;
  let bestScore = -1;

  for (const script of scripts) {
    const raw = script
      .replace(/^<script\b[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .trim();

    if (!raw) continue;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    for (const node of jsonLdNodes(parsed)) {
      const rawTypes = Array.isArray(node['@type'])
        ? node['@type']
        : [node['@type']];
      const types = rawTypes
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      if (!types.some((type) => ARTICLE_TYPES.has(type))) continue;

      const bodyLength = safeText(node.articleBody, MAX_TEXT_CHARS).length;
      const score = bodyLength + (node.headline ? 2000 : 0) + (node.image ? 800 : 0);

      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }
  }

  return best || {};
}

function authorFromJsonLd(author) {
  const values = Array.isArray(author) ? author : [author];
  const names = values
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.name || '';
    })
    .map((name) => safeText(name, 180))
    .filter(Boolean);

  return safeText([...new Set(names)].join(', '), 300);
}

function imageFromJsonLd(image) {
  const values = Array.isArray(image) ? image : [image];

  for (const item of values) {
    if (typeof item === 'string' && item.trim()) return item.trim();
    const url = item?.url || item?.contentUrl;
    if (url) return String(url).trim();
  }

  return '';
}

function isBlockedIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedIp(address) {
  const normalized = String(address || '').toLowerCase().split('%')[0];
  const family = net.isIP(normalized);

  if (family === 4) return isBlockedIpv4(normalized);
  if (family !== 6) return true;

  if (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff')
  ) {
    return true;
  }

  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isBlockedIpv4(mapped[1]) : false;
}

async function assertSafePublicUrl(input) {
  const raw = String(input || '').trim();
  if (!raw || raw.length > MAX_URL_LENGTH) {
    throw new ApiError(422, 'URL bài viết không hợp lệ.', 'ARTICLE_URL_INVALID');
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiError(422, 'URL bài viết không hợp lệ.', 'ARTICLE_URL_INVALID');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ApiError(422, 'Chỉ hỗ trợ URL HTTP hoặc HTTPS.', 'ARTICLE_URL_PROTOCOL_INVALID');
  }

  if (url.username || url.password) {
    throw new ApiError(422, 'URL không được chứa thông tin đăng nhập.', 'ARTICLE_URL_CREDENTIALS_BLOCKED');
  }

  if (url.port && !['80', '443'].includes(url.port)) {
    throw new ApiError(422, 'URL dùng cổng mạng không được hỗ trợ.', 'ARTICLE_URL_PORT_BLOCKED');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new ApiError(422, 'Không thể nhập nội dung từ địa chỉ mạng nội bộ.', 'ARTICLE_URL_PRIVATE_HOST');
  }

  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new ApiError(422, 'Không thể nhập nội dung từ địa chỉ mạng nội bộ.', 'ARTICLE_URL_PRIVATE_IP');
    }
    return url;
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ApiError(422, 'Không phân giải được tên miền của URL.', 'ARTICLE_URL_DNS_FAILED');
  }

  if (!addresses.length || addresses.some((entry) => isBlockedIp(entry.address))) {
    throw new ApiError(422, 'Tên miền trỏ tới địa chỉ mạng không được phép.', 'ARTICLE_URL_DNS_BLOCKED');
  }

  return url;
}

async function readLimitedBody(response, maxBytes) {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) {
    throw new ApiError(413, 'Nội dung nguồn vượt giới hạn cho phép.', 'ARTICLE_URL_RESPONSE_TOO_LARGE');
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new ApiError(413, 'Nội dung nguồn vượt giới hạn cho phép.', 'ARTICLE_URL_RESPONSE_TOO_LARGE');
    }
    return buffer;
  }

  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => null);
      throw new ApiError(413, 'Nội dung nguồn vượt giới hạn cho phép.', 'ARTICLE_URL_RESPONSE_TOO_LARGE');
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, total);
}

async function fetchPublicResource(
  input,
  {
    maxBytes,
    timeoutMs,
    accept,
    referer = '',
  },
) {
  let current = await assertSafePublicUrl(input);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: accept,
          'User-Agent': 'DTHL-Content-Importer/1.0 (+https://dothihoalac.vn)',
          ...(referer ? { Referer: referer } : {}),
        },
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirectCount >= MAX_REDIRECTS) {
          throw new ApiError(502, 'Website nguồn chuyển hướng quá nhiều lần.', 'ARTICLE_URL_TOO_MANY_REDIRECTS');
        }
        current = await assertSafePublicUrl(new URL(location, current).toString());
        continue;
      }

      if (!response.ok) {
        throw new ApiError(
          response.status === 404 ? 404 : 502,
          `Website nguồn trả về HTTP ${response.status}.`,
          'ARTICLE_URL_HTTP_ERROR',
        );
      }

      const buffer = await readLimitedBody(response, maxBytes);
      return {
        buffer,
        contentType: String(response.headers.get('content-type') || '').toLowerCase(),
        finalUrl: current.toString(),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error?.name === 'AbortError') {
        throw new ApiError(504, 'Website nguồn phản hồi quá chậm.', 'ARTICLE_URL_TIMEOUT');
      }
      throw new ApiError(502, 'Không thể kết nối website nguồn.', 'ARTICLE_URL_FETCH_FAILED');
    } finally {
      clearTimeout(timer);
    }
  }

  throw new ApiError(502, 'Không thể tải nội dung từ URL.', 'ARTICLE_URL_FETCH_FAILED');
}

async function fetchArticleHtml(input) {
  const result = await fetchPublicResource(input, {
    maxBytes: MAX_HTML_BYTES,
    timeoutMs: PAGE_TIMEOUT_MS,
    accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
  });

  if (
    result.contentType &&
    !result.contentType.includes('text/html') &&
    !result.contentType.includes('application/xhtml+xml')
  ) {
    throw new ApiError(415, 'URL không trả về một trang HTML.', 'ARTICLE_URL_NOT_HTML');
  }

  return {
    html: result.buffer.toString('utf8'),
    finalUrl: result.finalUrl,
  };
}

function normalizeUrl(raw, baseUrl) {
  if (!raw) return '';
  try {
    const url = new URL(String(raw).trim(), baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function canonicalizeUrl(raw, baseUrl) {
  const normalized = normalizeUrl(raw, baseUrl);
  if (!normalized) return '';

  const url = new URL(normalized);
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.hash = '';
  return url.toString();
}

function stripNoise(html) {
  let cleaned = String(html || '').replace(/<!--[\s\S]*?-->/g, ' ');
  const pairedTags = [
    'script',
    'style',
    'noscript',
    'template',
    'svg',
    'nav',
    'header',
    'footer',
    'aside',
    'form',
    'button',
    'iframe',
    'dialog',
  ];

  for (const tag of pairedTags) {
    const pattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(pattern, ' ');
  }

  cleaned = cleaned.replace(/<(?:input|select|option|textarea)\b[^>]*>/gi, ' ');
  return cleaned;
}

function tagCandidates(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return String(html || '').match(pattern) || [];
}

function candidateScore(candidate) {
  const firstTag = candidate.match(/^<[^>]+>/)?.[0] || '';
  const attrs = parseTagAttributes(firstTag);
  const hint = `${attrs.id || ''} ${attrs.class || ''}`;
  const text = plainText(stripNoise(candidate));
  const paragraphCount = (candidate.match(/<p\b/gi) || []).length;
  const headingCount = (candidate.match(/<h[1-4]\b/gi) || []).length;
  const imageCount = (candidate.match(/<img\b/gi) || []).length;

  let score = text.length + paragraphCount * 220 + headingCount * 120 + imageCount * 60;
  if (/article|content|detail|entry|post|story/i.test(hint)) score += 1800;
  if (NOISE_CLASS_PATTERN.test(hint)) score -= 5000;
  return score;
}

function chooseArticleHtml(html, jsonLd) {
  const articles = tagCandidates(html, 'article');
  if (articles.length) {
    return articles.sort((a, b) => candidateScore(b) - candidateScore(a))[0];
  }

  const mains = tagCandidates(html, 'main');
  if (mains.length) {
    return mains.sort((a, b) => candidateScore(b) - candidateScore(a))[0];
  }

  const body = tagCandidates(html, 'body')[0] || html;
  const cleaned = stripNoise(body);

  if (plainText(cleaned).length >= 500) return cleaned;
  if (jsonLd?.articleBody) return `<p>${escapeHtml(jsonLd.articleBody)}</p>`;
  return cleaned;
}

function chooseSrcset(value = '') {
  const candidates = String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [url, descriptor = ''] = part.split(/\s+/);
      const width = Number(String(descriptor).replace(/w$/i, '')) || 0;
      return { url, width };
    })
    .sort((a, b) => b.width - a.width);

  return candidates[0]?.url || '';
}

function imageSourceFromTag(tag) {
  const attrs = parseTagAttributes(tag);
  return {
    rawUrl:
      attrs['data-original'] ||
      attrs['data-src'] ||
      attrs['data-lazy-src'] ||
      attrs.src ||
      chooseSrcset(attrs.srcset || attrs['data-srcset']),
    alt: safeText(attrs.alt || attrs.title, 300),
    width: Number.parseInt(attrs.width, 10) || 0,
    height: Number.parseInt(attrs.height, 10) || 0,
  };
}

function imageUrlLooksUseful(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (/\.(?:svg)(?:$|[?#])/i.test(lower)) return false;
  if (/(?:avatar|badge|emoji|favicon|icon|logo|pixel|sprite|tracking)/i.test(lower)) return false;
  return true;
}

function markersToBlocks(articleHtml, baseUrl, title) {
  const images = [];
  const imageIndex = new Map();
  let marked = stripNoise(articleHtml);

  marked = marked.replace(/<img\b[^>]*>/gi, (tag) => {
    const source = imageSourceFromTag(tag);
    const url = normalizeUrl(source.rawUrl, baseUrl);
    if (!imageUrlLooksUseful(url)) return ' ';
    if (source.width && source.height && source.width < 120 && source.height < 120) return ' ';

    let index = imageIndex.get(url);
    if (index === undefined) {
      index = images.length;
      imageIndex.set(url, index);
      images.push({
        url,
        alt: source.alt || `${title} - hình minh họa`,
      });
    }

    return `\n[[DTHL_IMAGE_${index}]]\n`;
  });

  marked = marked
    .replace(/<h2\b[^>]*>/gi, '\n[[DTHL_H2]]')
    .replace(/<h3\b[^>]*>/gi, '\n[[DTHL_H3]]')
    .replace(/<h4\b[^>]*>/gi, '\n[[DTHL_H4]]')
    .replace(/<\/h[2-4]>/gi, '[[DTHL_END]]\n')
    .replace(/<blockquote\b[^>]*>/gi, '\n[[DTHL_QUOTE]]')
    .replace(/<\/blockquote>/gi, '[[DTHL_END]]\n')
    .replace(/<li\b[^>]*>/gi, '\n[[DTHL_LI]]')
    .replace(/<\/li>/gi, '[[DTHL_END]]\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|section|figure|figcaption|td|th|tr)>/gi, '\n\n');

  const decoded = sanitizeHtml(marked, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const blocks = [];
  let textBuffer = '';

  const flushText = () => {
    const text = safeText(textBuffer, 12000);
    textBuffer = '';
    if (!text) return;
    blocks.push({ type: 'p', text });
  };

  for (const rawLine of decoded.split(/\n+/)) {
    const line = safeText(rawLine, 12000);
    if (!line) {
      flushText();
      continue;
    }

    const imageMatch = line.match(/^\[\[DTHL_IMAGE_(\d+)\]\]$/);
    if (imageMatch) {
      flushText();
      const image = images[Number(imageMatch[1])];
      if (image) blocks.push({ type: 'image', ...image });
      continue;
    }

    const styledMatch = line.match(/^\[\[DTHL_(H2|H3|H4|QUOTE|LI)\]\](.*?)\[\[DTHL_END\]\]$/);
    if (styledMatch) {
      flushText();
      const text = safeText(styledMatch[2], 12000);
      if (!text) continue;
      const typeMap = { H2: 'h2', H3: 'h3', H4: 'h4', QUOTE: 'quote', LI: 'li' };
      blocks.push({ type: typeMap[styledMatch[1]] || 'p', text });
      continue;
    }

    textBuffer += `${textBuffer ? '\n' : ''}${line}`;
  }

  flushText();
  return { blocks, images };
}

function cleanTitle(value, sourceDomain) {
  let title = safeText(value, 250);
  if (!title) return '';

  if (sourceDomain) {
    const escapedDomain = sourceDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`\\s*[|–—-]\\s*${escapedDomain}\\s*$`, 'i'), '').trim();
  }

  return title.slice(0, 250);
}

function validPublishedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = Date.now();
  if (date.getTime() < Date.UTC(1990, 0, 1) || date.getTime() > now + 86400000) return null;
  return date;
}

function sourceNoteFor(extracted) {
  const lines = [`Nhập từ URL: ${extracted.canonicalUrl}`];
  if (extracted.author) lines.push(`Tác giả nguồn: ${extracted.author}`);
  if (extracted.publishedAt) lines.push(`Ngày đăng nguồn: ${extracted.publishedAt.toISOString()}`);
  return safeText(lines.join('\n'), 2000);
}

function canonicalUrlHash(canonicalUrl) {
  return crypto.createHash('sha256').update(String(canonicalUrl || '')).digest('hex');
}

async function findDuplicate(canonicalUrl) {
  if (!canonicalUrl) return null;

  const article = await Article.findOne({
    sourceUrlHash: canonicalUrlHash(canonicalUrl),
    sourceCanonicalUrl: canonicalUrl,
  })
    .populate({
      path: 'contentId',
      select: 'title slug status',
    })
    .lean();

  if (!article?.contentId) return null;

  return {
    id: String(article.contentId._id || article.contentId),
    title: article.contentId.title || '',
    slug: article.contentId.slug || '',
    status: article.contentId.status || '',
  };
}

async function extractArticle(urlInput) {
  const { html, finalUrl } = await fetchArticleHtml(urlInput);
  const jsonLd = extractArticleJsonLd(html);
  const final = new URL(finalUrl);
  const sourceDomain = final.hostname.replace(/^www\./i, '');
  const canonicalUrl = canonicalizeUrl(
    jsonLd?.mainEntityOfPage?.['@id'] ||
      jsonLd?.mainEntityOfPage ||
      jsonLd?.url ||
      extractCanonicalLink(html) ||
      finalUrl,
    finalUrl,
  ) || canonicalizeUrl(finalUrl, finalUrl);

  const rawTitle =
    jsonLd?.headline ||
    extractMeta(html, 'og:title') ||
    extractMeta(html, 'twitter:title') ||
    plainText(html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || '', 500) ||
    plainText(html.match(/<title\b[^>]*>[\s\S]*?<\/title>/i)?.[0] || '', 500);
  const title = cleanTitle(rawTitle, sourceDomain);

  if (title.length < 5) {
    throw new ApiError(422, 'Không nhận diện được tiêu đề bài viết từ URL.', 'ARTICLE_URL_TITLE_MISSING');
  }

  const summary = safeText(
    jsonLd?.description ||
      extractMeta(html, 'og:description') ||
      extractMeta(html, 'description') ||
      '',
    1000,
  );
  const author = safeText(
    authorFromJsonLd(jsonLd?.author) ||
      extractMeta(html, 'author') ||
      extractMeta(html, 'article:author') ||
      '',
    300,
  );
  const publishedAt = validPublishedAt(
    jsonLd?.datePublished ||
      extractMeta(html, 'article:published_time') ||
      extractMeta(html, 'datePublished') ||
      '',
  );

  const articleHtml = chooseArticleHtml(html, jsonLd);
  let { blocks } = markersToBlocks(articleHtml, finalUrl, title);
  let textLength = blocks
    .filter((block) => block.type !== 'image')
    .reduce((sum, block) => sum + String(block.text || '').length, 0);

  if (textLength < 250 && jsonLd?.articleBody) {
    blocks = safeText(jsonLd.articleBody, MAX_TEXT_CHARS)
      .split(/\n{2,}/)
      .map((text) => safeText(text, 12000))
      .filter(Boolean)
      .map((text) => ({ type: 'p', text }));
    textLength = blocks.reduce((sum, block) => sum + block.text.length, 0);
  }

  const heroImage = normalizeUrl(
    imageFromJsonLd(jsonLd?.image) ||
      extractMeta(html, 'og:image:secure_url') ||
      extractMeta(html, 'og:image') ||
      extractMeta(html, 'twitter:image'),
    finalUrl,
  );

  if (imageUrlLooksUseful(heroImage)) {
    const existingIndex = blocks.findIndex(
      (block) => block.type === 'image' && block.url === heroImage,
    );
    if (existingIndex > 0) {
      const [heroBlock] = blocks.splice(existingIndex, 1);
      blocks.unshift(heroBlock);
    } else if (existingIndex < 0) {
      blocks.unshift({
        type: 'image',
        url: heroImage,
        alt: `${title} - ảnh đại diện nguồn`,
      });
    }
  }

  blocks = blocks.filter((block, index) => {
    if (block.type === 'image') return true;
    const text = safeText(block.text, 12000);
    if (!text) return false;
    if (index < 4 && text.localeCompare(title, 'vi', { sensitivity: 'base' }) === 0) return false;
    if (summary && index < 6 && text.localeCompare(summary, 'vi', { sensitivity: 'base' }) === 0) return false;
    block.text = text;
    return true;
  });

  const seenImages = new Set();
  let keptImages = 0;
  blocks = blocks.filter((block) => {
    if (block.type !== 'image') return true;
    if (!block.url || seenImages.has(block.url) || keptImages >= MAX_IMAGES) return false;
    seenImages.add(block.url);
    keptImages += 1;
    return true;
  });

  const bodyText = blocks
    .filter((block) => block.type !== 'image')
    .map((block) => block.text || '')
    .join('\n');
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  if (bodyText.length < 250) {
    throw new ApiError(422, 'Không trích xuất đủ nội dung bài viết từ URL này.', 'ARTICLE_URL_CONTENT_TOO_SHORT');
  }

  return {
    requestedUrl: String(urlInput).trim(),
    finalUrl,
    canonicalUrl,
    sourceDomain,
    title,
    summary,
    author,
    publishedAt,
    blocks,
    wordCount,
    imageCount: keptImages,
  };
}

function filenameForImage(url, contentType, index) {
  const extensionByType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
  };
  const fallback = extensionByType[contentType] || 'jpg';

  try {
    const base = path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, '-');
    if (/\.[a-z0-9]{2,5}$/i.test(base)) return base.slice(-120);
  } catch {
    // Dùng tên fallback bên dưới.
  }

  return `url-import-${index + 1}.${fallback}`;
}

async function downloadSourceImage(block, referer, index) {
  const result = await fetchPublicResource(block.url, {
    maxBytes: MAX_IMAGE_BYTES,
    timeoutMs: IMAGE_TIMEOUT_MS,
    accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8,*/*;q=0.1',
    referer,
  });

  const contentType = result.contentType.split(';')[0].trim();
  if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') {
    throw new ApiError(415, 'Tài nguyên nguồn không phải ảnh được hỗ trợ.', 'ARTICLE_URL_IMAGE_INVALID');
  }

  const metadata = await sharp(result.buffer, { animated: true }).metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  if (width && height && width * height < 24000) {
    throw new ApiError(422, 'Ảnh nguồn quá nhỏ để dùng trong bài.', 'ARTICLE_URL_IMAGE_TOO_SMALL');
  }

  return {
    buffer: result.buffer,
    size: result.buffer.length,
    originalname: filenameForImage(block.url, contentType, index),
    mimetype: contentType,
  };
}

function cloudinaryDocsImageUrl(uploaded) {
  const url = String(uploaded?.secureUrl || uploaded?.url || '');
  if (!url || uploaded?.format === 'gif') return url;
  return url.replace('/upload/', '/upload/f_jpg,q_auto:good/');
}

async function prepareImageBlocks(extracted, includeImages) {
  if (!includeImages) {
    return { blocks: extracted.blocks.filter((block) => block.type !== 'image'), temporaryAssets: [] };
  }

  const blocks = extracted.blocks.map((block) => ({ ...block }));
  const imageIndexes = blocks
    .map((block, index) => (block.type === 'image' ? index : -1))
    .filter((index) => index >= 0)
    .slice(0, MAX_IMAGES);
  const temporaryAssets = [];

  for (let cursor = 0; cursor < imageIndexes.length; cursor += 3) {
    const batch = imageIndexes.slice(cursor, cursor + 3);
    const prepared = await Promise.all(
      batch.map(async (blockIndex) => {
        const block = blocks[blockIndex];
        try {
          const file = await downloadSourceImage(block, extracted.finalUrl, blockIndex);
          const uploaded = await uploadTemporaryImage(file, {
            folder: 'article-url-import-temp',
            maxWidth: 2400,
            maxHeight: 2400,
          });
          temporaryAssets.push(uploaded);
          return {
            blockIndex,
            imageUri: cloudinaryDocsImageUrl(uploaded),
          };
        } catch (error) {
          console.warn(`[ArticleUrlImport] bỏ qua ảnh ${block.url}: ${error.message}`);
          return { blockIndex, imageUri: '' };
        }
      }),
    );

    for (const item of prepared) {
      blocks[item.blockIndex].imageUri = item.imageUri;
    }
  }

  return {
    blocks: blocks.filter((block) => block.type !== 'image' || block.imageUri),
    temporaryAssets,
  };
}

async function cleanupTemporaryAssets(assets) {
  await Promise.all(
    assets.map((asset) =>
      asset?.publicId
        ? deleteCloudinaryAsset({
            publicId: asset.publicId,
            resourceType: asset.resourceType || 'image',
          }).catch(() => null)
        : null,
    ),
  );
}

function buildDocumentPayload(extracted, blocks) {
  let text = '';
  const paragraphStyles = [];
  const bulletRanges = [];
  const imageRanges = [];

  const append = (value) => {
    const startIndex = text.length + 1;
    text += value;
    return { startIndex, endIndex: text.length + 1 };
  };

  const titleRange = append(`${extracted.title}\n`);
  paragraphStyles.push({ ...titleRange, namedStyleType: 'TITLE' });

  if (extracted.summary) {
    const summaryRange = append(`Sapo: ${extracted.summary}\n`);
    paragraphStyles.push({ ...summaryRange, namedStyleType: 'SUBTITLE' });
  }

  for (const block of blocks) {
    if (block.type === 'image') {
      const token = `[[DTHL_IMAGE_${imageRanges.length}]]`;
      const range = append(`${token}\n`);
      imageRanges.push({
        startIndex: range.startIndex,
        endIndex: range.startIndex + token.length,
        uri: block.imageUri,
      });
      continue;
    }

    const value = safeText(block.text, 12000);
    if (!value) continue;
    const range = append(`${value}\n`);

    if (block.type === 'h2' || block.type === 'h3' || block.type === 'h4') {
      paragraphStyles.push({
        ...range,
        namedStyleType: block.type.toUpperCase().replace('H', 'HEADING_'),
      });
    } else if (block.type === 'li') {
      bulletRanges.push(range);
    }
  }

  return { text, paragraphStyles, bulletRanges, imageRanges };
}

async function populateGoogleDocument(accessToken, documentId, extracted, blocks) {
  const payload = buildDocumentPayload(extracted, blocks);
  const requests = [];

  requests.push({
    insertText: {
      location: { index: 1 },
      text: payload.text,
    },
  });

  for (const style of payload.paragraphStyles) {
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: style.startIndex,
          endIndex: style.endIndex,
        },
        paragraphStyle: {
          namedStyleType: style.namedStyleType,
        },
        fields: 'namedStyleType',
      },
    });
  }

  for (const range of payload.bulletRanges) {
    requests.push({
      createParagraphBullets: {
        range,
        bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
      },
    });
  }

  for (const image of [...payload.imageRanges].sort((a, b) => b.startIndex - a.startIndex)) {
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: image.startIndex,
          endIndex: image.endIndex,
        },
      },
    });
    requests.push({
      insertInlineImage: {
        uri: image.uri,
        location: { index: image.startIndex },
      },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
        signal: controller.signal,
      },
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(
        502,
        String(result?.error?.message || 'Google Docs không nhận được nội dung nhập từ URL.').slice(0, 500),
        'ARTICLE_URL_GOOGLE_DOC_WRITE_FAILED',
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new ApiError(504, 'Google Docs phản hồi quá chậm khi tạo bài từ URL.', 'ARTICLE_URL_GOOGLE_DOC_TIMEOUT');
    }
    throw new ApiError(502, 'Không thể ghi nội dung URL vào Google Docs.', 'ARTICLE_URL_GOOGLE_DOC_NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

export async function previewAdminArticleUrl(url) {
  const extracted = await extractArticle(url);
  const duplicate = await findDuplicate(extracted.canonicalUrl);

  return {
    url: extracted.finalUrl,
    canonicalUrl: extracted.canonicalUrl,
    sourceDomain: extracted.sourceDomain,
    title: extracted.title,
    summary: extracted.summary,
    author: extracted.author,
    publishedAt: extracted.publishedAt?.toISOString() || null,
    wordCount: extracted.wordCount,
    imageCount: extracted.imageCount,
    duplicate,
  };
}

export async function importAdminArticleUrl(
  userId,
  {
    url,
    includeImages = true,
    force = false,
  } = {},
) {
  const extracted = await extractArticle(url);
  const duplicate = await findDuplicate(extracted.canonicalUrl);

  if (duplicate && !force) {
    throw new ApiError(
      409,
      'URL này đã được nhập vào hệ thống.',
      'ARTICLE_URL_DUPLICATE',
      { duplicate },
    );
  }

  const created = await articleService.adminCreate(userId, {
    title: extracted.title,
    summary: extracted.summary,
    bodyHtml: '<p>Nội dung đang được nhập từ URL và đồng bộ qua Google Docs.</p>',
    articleType: 'news',
    status: 'draft',
    sourceNote: sourceNoteFor(extracted),
  });

  let temporaryAssets = [];

  try {
    const { connection, accessToken } = await loadConnectedGoogle();
    const year = new Date().getFullYear();
    const folders = await ensureWorkspaceFolders(connection, accessToken, year);
    const docStatus = documentStatusForContent('draft');
    const targetFolderId = folderIdForDocumentStatus(folders, docStatus);

    const driveFile = await createArticleGoogleDocFast(accessToken, {
      articleId: created._id,
      folderId: targetFolderId,
      fileName: extracted.title,
    });

    const prepared = await prepareImageBlocks(extracted, Boolean(includeImages));
    temporaryAssets = prepared.temporaryAssets;

    await populateGoogleDocument(
      accessToken,
      driveFile.id,
      extracted,
      prepared.blocks,
    );

    const article = await Article.findOne({ contentId: created._id });
    if (!article) {
      throw new ApiError(500, 'Không tìm thấy metadata Article sau khi tạo bài.', 'ARTICLE_URL_METADATA_MISSING');
    }

    article.googleDocId = driveFile.id;
    article.googleDocUrl = driveFile.webViewLink || googleDocUrl(driveFile.id);
    article.googleDocFileName = driveFile.name || extracted.title;
    article.googleDocFolderId = targetFolderId || '';
    article.googleDocStatus = docStatus;
    article.googleDocYear = year;
    article.googleDocSyncedAt = null;
    article.sourceUrl = extracted.finalUrl;
    article.sourceCanonicalUrl = extracted.canonicalUrl;
    article.sourceDomain = extracted.sourceDomain;
    article.sourceUrlHash = canonicalUrlHash(extracted.canonicalUrl);
    article.originalPublishedAt = extracted.publishedAt || null;
    await article.save();

    await cleanupTemporaryAssets(temporaryAssets);
    temporaryAssets = [];

    return {
      postId: String(created._id),
      docId: driveFile.id,
      docUrl: article.googleDocUrl,
      status: 'draft',
      sourceUrl: article.sourceUrl,
      canonicalUrl: article.sourceCanonicalUrl,
      title: extracted.title,
      wordCount: extracted.wordCount,
      imageCount: prepared.blocks.filter((block) => block.type === 'image').length,
      skippedImageCount: Math.max(
        0,
        extracted.imageCount - prepared.blocks.filter((block) => block.type === 'image').length,
      ),
    };
  } catch (error) {
    await cleanupTemporaryAssets(temporaryAssets);
    await adminDeleteArticle(created._id).catch(() => null);
    throw error;
  }
}
