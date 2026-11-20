function parseTagAttributes(tag = '') {
  const attrs = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;

  while ((match = pattern.exec(String(tag || '')))) {
    attrs[String(match[1] || '').toLowerCase()] =
      match[2] ?? match[3] ?? match[4] ?? '';
  }

  return attrs;
}

function decodeHtmlEntities(value = '') {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, (match, hex, decimal) => {
      const point = hex ? Number.parseInt(hex, 16) : Number.parseInt(decimal, 10);
      if (!Number.isInteger(point) || point < 32 || point > 0x10ffff) return match;
      try { return String.fromCodePoint(point); } catch { return match; }
    });
}

function candidateUrl(value = '') {
  const url = decodeHtmlEntities(value).trim();
  if (!url || /^(?:data|blob|javascript|file):/i.test(url) || url.startsWith('#')) return '';
  return url;
}

/**
 * Select a real high-resolution URL rather than the common transparent
 * placeholder in the img src attribute. Data attributes and srcset variants
 * are used by many news sites for lazy-loaded article photographs.
 */
export function bestSrcsetUrl(value = '') {
  const candidates = String(value || '')
    .split(',')
    .map((candidate) => {
      const [rawUrl = '', descriptor = ''] = candidate.trim().split(/\s+/);
      const url = candidateUrl(rawUrl);
      const width = descriptor.endsWith('w')
        ? Number(descriptor.slice(0, -1))
        : descriptor.endsWith('x')
          ? Number(descriptor.slice(0, -1)) * 1000
          : 0;
      return { url, width };
    })
    .filter((candidate) => candidate.url)
    .sort((left, right) => right.width - left.width);

  return candidates[0]?.url || '';
}

export function extractArticleImageSource(imgTag = '', pictureHtml = '') {
  const attrs = parseTagAttributes(imgTag);
  const sources = Array.from(String(pictureHtml || '').matchAll(/<source\b[^>]*>/gi))
    .map((match) => parseTagAttributes(match[0]));

  const candidates = [
    attrs['data-original'],
    attrs['data-full-src'],
    attrs['data-zoom-src'],
    attrs['data-hires'],
    bestSrcsetUrl(attrs['data-srcset']),
    bestSrcsetUrl(attrs.srcset),
    ...sources.map((item) => bestSrcsetUrl(item['data-srcset'] || item.srcset)),
    attrs['data-src'],
    attrs['data-lazy-src'],
    attrs['data-original-src'],
    attrs['data-image'],
    attrs.src,
  ];

  return {
    rawUrl: candidates.map(candidateUrl).find(Boolean) || '',
    alt: String(attrs.alt || attrs.title || '').trim().slice(0, 300),
    width: Number.parseInt(attrs.width, 10) || 0,
    height: Number.parseInt(attrs.height, 10) || 0,
  };
}
