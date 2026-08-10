import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';

import sanitizeHtml from 'sanitize-html';

const USER_AGENT =
  'Mozilla/5.0 (compatible; DTHL-SourceWatch/1.0; +https://dothihoalac.vn)';
const DEFAULT_TIMEOUT_MS = 20000;
const MAX_BODY_CHARS = 2_000_000;

function text(value = '', max = 30000) {
  return String(value || '').normalize('NFC').trim().slice(0, max);
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function stripMarkup(value = '', max = 30000) {
  return text(
    decodeEntities(
      sanitizeHtml(String(value || ''), {
        allowedTags: [],
        allowedAttributes: {},
      }),
    ).replace(/\s+/g, ' '),
    max,
  );
}

function privateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  );
}

function privateIpv6(ip) {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  );
}

function isPrivateIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return privateIpv4(ip);
  if (version === 6) return privateIpv6(ip);
  return false;
}

export async function assertPublicHttpUrl(value) {
  const raw = text(value, 4000);
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('SOURCE_URL_PROTOCOL_NOT_ALLOWED');
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('SOURCE_URL_PRIVATE_HOST_NOT_ALLOWED');
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('SOURCE_URL_PRIVATE_HOST_NOT_ALLOWED');
    return url;
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('SOURCE_URL_PRIVATE_HOST_NOT_ALLOWED');
  }

  return url;
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(String(value || '').trim(), baseUrl).toString();
  } catch {
    return '';
  }
}

function tagValue(block, names = []) {
  for (const name of names) {
    const match = String(block).match(
      new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'),
    );
    if (match?.[1]) return match[1];
  }
  return '';
}

function atomLink(block) {
  const alternate = String(block).match(
    /<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i,
  );
  if (alternate?.[1]) return alternate[1];

  const any = String(block).match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
  if (any?.[1]) return any[1];

  return stripMarkup(tagValue(block, ['link']), 4000);
}

function safeDate(value) {
  const raw = stripMarkup(value, 200);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rssItems(xml, baseUrl) {
  const blocks = [
    ...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi),
  ].map((match) => ({ type: 'rss', body: match[1] }));

  const atomBlocks = [
    ...String(xml).matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi),
  ].map((match) => ({ type: 'atom', body: match[1] }));

  return [...blocks, ...atomBlocks]
    .slice(0, 80)
    .map(({ type, body }) => {
      const linkRaw = type === 'atom'
        ? atomLink(body)
        : stripMarkup(tagValue(body, ['link']), 4000);
      const url = absoluteUrl(linkRaw, baseUrl);
      const title = stripMarkup(tagValue(body, ['title']), 1000);
      const rawContent = tagValue(body, [
        'content:encoded',
        'content',
        'description',
        'summary',
      ]);
      const cleanHtml = sanitizeHtml(decodeEntities(rawContent), {
        allowedTags: [
          'p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li',
          'blockquote', 'h2', 'h3', 'h4', 'a', 'figure', 'figcaption', 'img',
        ],
        allowedAttributes: {
          a: ['href'],
          img: ['src', 'alt'],
        },
      }).slice(0, 80000);
      const contentText = stripMarkup(rawContent, 30000);
      const externalId = stripMarkup(tagValue(body, ['guid', 'id']), 1000) || url;
      const publishedAt = safeDate(
        tagValue(body, ['pubDate', 'published', 'updated', 'dc:date']),
      );
      const author = stripMarkup(
        tagValue(body, ['author', 'dc:creator', 'name']),
        300,
      );

      const mediaUrls = [];
      for (const match of String(body).matchAll(
        /<(?:media:content|media:thumbnail|enclosure)\b[^>]*(?:url|href)=["']([^"']+)["'][^>]*>/gi,
      )) {
        const mediaUrl = absoluteUrl(match[1], baseUrl);
        if (mediaUrl && !mediaUrls.includes(mediaUrl)) mediaUrls.push(mediaUrl);
      }

      return {
        externalId,
        url,
        title,
        excerpt: contentText.slice(0, 1200),
        contentText,
        contentHtml: cleanHtml,
        mediaUrls: mediaUrls.slice(0, 12),
        author,
        publishedAt,
      };
    })
    .filter((item) => item.url && (item.title || item.contentText));
}

function metaContent(html, names = []) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = String(html).match(pattern);
      if (match?.[1]) return decodeEntities(match[1]);
    }
  }
  return '';
}

function htmlTitle(html) {
  return (
    stripMarkup(metaContent(html, ['og:title', 'twitter:title']), 1000) ||
    stripMarkup(tagValue(html, ['h1']), 1000) ||
    stripMarkup(tagValue(html, ['title']), 1000)
  );
}

function mainHtml(html) {
  const cleaned = String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<(?:nav|footer|form|aside)\b[^>]*>[\s\S]*?<\/(?:nav|footer|form|aside)>/gi, '');

  const article = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  const main = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  return article || main || cleaned;
}

export async function fetchArticleSnapshot(value) {
  const url = await assertPublicHttpUrl(value);
  const response = await fetchWithGuards(url.toString());
  if (response.notModified) return null;

  const html = response.body;
  const body = mainHtml(html);
  const contentHtml = sanitizeHtml(body, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li',
      'blockquote', 'h2', 'h3', 'h4', 'a', 'figure', 'figcaption', 'img',
    ],
    allowedAttributes: {
      a: ['href'],
      img: ['src', 'alt'],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          href: absoluteUrl(attribs.href, url.toString()),
        },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          src: absoluteUrl(attribs.src, url.toString()),
        },
      }),
    },
  }).slice(0, 80000);

  const contentText = stripMarkup(body, 30000);
  const description = stripMarkup(
    metaContent(html, ['description', 'og:description', 'twitter:description']),
    4000,
  );
  const mediaUrls = [];
  const ogImage = absoluteUrl(metaContent(html, ['og:image', 'twitter:image']), url.toString());
  if (ogImage) mediaUrls.push(ogImage);
  for (const match of String(body).matchAll(/<img\b[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const mediaUrl = absoluteUrl(match[1], url.toString());
    if (mediaUrl && !mediaUrls.includes(mediaUrl)) mediaUrls.push(mediaUrl);
  }

  return {
    url: url.toString(),
    title: htmlTitle(html),
    excerpt: description || contentText.slice(0, 1200),
    contentText,
    contentHtml,
    mediaUrls: mediaUrls.slice(0, 20),
    author: stripMarkup(metaContent(html, ['author', 'article:author']), 300),
    publishedAt: safeDate(
      metaContent(html, ['article:published_time', 'datePublished', 'date']),
    ),
  };
}

async function fetchWithGuards(value, { etag = '', lastModified = '' } = {}) {
  const url = await assertPublicHttpUrl(value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers = {
    Accept: 'text/html,application/xhtml+xml,application/xml,text/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.5',
    'User-Agent': USER_AGENT,
  };
  if (etag) headers['If-None-Match'] = etag;
  if (lastModified) headers['If-Modified-Since'] = lastModified;

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers,
      signal: controller.signal,
    });

    if (response.status === 304) {
      return {
        notModified: true,
        body: '',
        etag: response.headers.get('etag') || etag,
        lastModified: response.headers.get('last-modified') || lastModified,
      };
    }

    if (!response.ok) {
      throw new Error(`SOURCE_HTTP_${response.status}`);
    }

    const body = (await response.text()).slice(0, MAX_BODY_CHARS);
    return {
      notModified: false,
      body,
      etag: response.headers.get('etag') || '',
      lastModified: response.headers.get('last-modified') || '',
    };
  } finally {
    clearTimeout(timer);
  }
}

function webLinks(html, source) {
  const base = new URL(source.url);
  const includePath = text(source.includePath, 500);
  const items = [];
  const seen = new Set();

  for (const match of String(html).matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const url = absoluteUrl(match[1], base.toString());
    if (!url || seen.has(url)) continue;

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }

    if (parsed.origin !== base.origin) continue;
    if (parsed.hash) parsed.hash = '';
    if (includePath && !parsed.pathname.includes(includePath)) continue;
    if (/\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mp3)$/i.test(parsed.pathname)) continue;
    if (/\/(?:tag|category|author|search|login|dang-nhap)(?:\/|$)/i.test(parsed.pathname)) continue;

    const title = stripMarkup(match[2], 1000);
    if (title.length < 12 || parsed.pathname.length < 4) continue;

    const normalized = parsed.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    items.push({
      externalId: normalized,
      url: normalized,
      title,
      excerpt: '',
      contentText: '',
      contentHtml: '',
      mediaUrls: [],
      author: '',
      publishedAt: null,
    });

    if (items.length >= 50) break;
  }

  return items;
}

async function fetchRssSource(source) {
  const result = await fetchWithGuards(source.url, {
    etag: source.httpEtag,
    lastModified: source.httpLastModified,
  });
  return {
    items: result.notModified ? [] : rssItems(result.body, source.url),
    notModified: result.notModified,
    etag: result.etag,
    lastModified: result.lastModified,
  };
}

async function fetchWebSource(source) {
  const result = await fetchWithGuards(source.url, {
    etag: source.httpEtag,
    lastModified: source.httpLastModified,
  });
  return {
    items: result.notModified ? [] : webLinks(result.body, source),
    notModified: result.notModified,
    etag: result.etag,
    lastModified: result.lastModified,
  };
}

async function fetchFacebookSource(source) {
  const token = text(process.env.FACEBOOK_GRAPH_ACCESS_TOKEN, 5000);
  if (!token) throw new Error('FACEBOOK_GRAPH_ACCESS_TOKEN_MISSING');
  if (!source.facebookPageId) throw new Error('FACEBOOK_PAGE_ID_MISSING');

  const fields = [
    'id',
    'message',
    'permalink_url',
    'created_time',
    'attachments{media,url}',
  ].join(',');
  const endpoint = new URL(
    `https://graph.facebook.com/${encodeURIComponent(source.facebookPageId)}/posts`,
  );
  endpoint.searchParams.set('fields', fields);
  endpoint.searchParams.set('limit', '25');
  endpoint.searchParams.set('access_token', token);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        text(payload?.error?.message, 1000) || `FACEBOOK_HTTP_${response.status}`,
      );
    }

    const items = (Array.isArray(payload?.data) ? payload.data : [])
      .map((post) => {
        const message = text(post.message, 30000);
        const url = text(post.permalink_url, 4000) || source.url;
        const mediaUrls = [];
        const attachmentData = post?.attachments?.data || [];
        for (const attachment of attachmentData) {
          const image = text(attachment?.media?.image?.src, 4000);
          const target = text(attachment?.url, 4000);
          if (image && !mediaUrls.includes(image)) mediaUrls.push(image);
          if (target && /^https?:\/\//i.test(target) && !mediaUrls.includes(target)) {
            mediaUrls.push(target);
          }
        }
        return {
          externalId: text(post.id, 1000),
          url,
          title: message.split(/\r?\n/).find(Boolean)?.slice(0, 500) || 'Bài đăng Facebook',
          excerpt: message.slice(0, 1200),
          contentText: message,
          contentHtml: '',
          mediaUrls: mediaUrls.slice(0, 20),
          author: source.name,
          publishedAt: safeDate(post.created_time),
        };
      })
      .filter((item) => item.externalId && item.url);

    return {
      items,
      notModified: false,
      etag: '',
      lastModified: '',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSourceCandidates(source) {
  if (source.type === 'rss') return fetchRssSource(source);
  if (source.type === 'web') return fetchWebSource(source);
  if (source.type === 'facebook') return fetchFacebookSource(source);
  throw new Error('SOURCE_TYPE_NOT_SUPPORTED');
}

export function fingerprintFor(source, item) {
  return crypto
    .createHash('sha256')
    .update(`${source._id}|${item.externalId || item.url}`)
    .digest('hex');
}
