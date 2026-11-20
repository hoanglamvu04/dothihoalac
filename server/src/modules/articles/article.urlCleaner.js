import sanitizeHtml from 'sanitize-html';

// Preserve article structure (and lazy-loaded image attributes) while removing
// interactive page furniture BEFORE the URL importer converts HTML into text.
const CONTENT_TAGS = [
  'article', 'main', 'section', 'div', 'p', 'span', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'br', 'strong',
  'em', 'b', 'i', 'a', 'figure', 'figcaption', 'picture', 'source',
  'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'time',
  'header', 'footer', 'aside', 'nav', 'form', 'button', 'select',
  'option', 'input', 'textarea', 'label', 'dialog',
];

const REMOVE_TAGS = new Set([
  'header', 'footer', 'aside', 'nav', 'form', 'button', 'select',
  'option', 'input', 'textarea', 'label', 'dialog',
]);

const NOISE_HINT = /(?:^|[-_\s])(?:accessibility|a11y|assistive|contrast|font[-_]?size|font[-_]?setting|font[-_]?control|color[-_]?picker|reading[-_]?tool|toolbar|toolbox|settings[-_]?panel|breadcrumb|advert|ads|banner|cookie|comment|newsletter|subscribe|login|register|menu|navigation|related|recommend|share|sharing|social|sidebar|widget|popup|modal|overlay|floating|sticky|footer|header|pagination|breadcrumb|author[-_]?box|tags[-_]?list)(?:$|[-_\s])/i;

const NOISE_ROLES = new Set([
  'navigation', 'toolbar', 'menu', 'menubar', 'dialog', 'alertdialog',
  'search', 'complementary', 'button', 'listbox',
]);

const CONTROL_LINE = /^(?:aa|a\s*[+-]|màu chữ\s*:?.*|cỡ chữ\s*:?.*|kích thước chữ\s*:?.*|phông chữ\s*:?.*|tùy chỉnh\s*:?.*|về mặc định|đặt lại mặc định|chế độ đọc\s*:?.*|tương phản\s*:?.*|#[a-f0-9]{3,8}|rất tốt\s*\(aaa\))$/iu;
const FOOTER_HEADING = /^(?:tin liên quan|bài viết liên quan|đọc thêm|có thể bạn quan tâm|cùng chuyên mục|bình luận|ý kiến bạn đọc|chia sẻ bài viết|đánh giá bài viết)\s*:?\s*$/iu;
const TRACKING_LINE = /^(?:theo dõi chúng tôi|theo dõi trên|đăng ký nhận tin|đăng ký bản tin|quay về đầu trang|trở về trang chủ)\s*[.:!]?$/iu;

function normalized(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('vi')
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/^[\s"'“”‘’«»—–\-.:]+|[\s"'“”‘’«»—–\-.:]+$/g, '')
    .trim();
}

function isInterfaceWidget(frame) {
  if (REMOVE_TAGS.has(frame.tag)) return true;

  const attributes = frame.attribs || {};
  const hidden = String(attributes['aria-hidden'] || '').toLowerCase();
  if (hidden === 'true' || Object.hasOwn(attributes, 'hidden')) return true;

  const style = String(attributes.style || '');
  if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)) return true;

  if (NOISE_ROLES.has(String(attributes.role || '').toLowerCase())) {
    return true;
  }

  const hint = [
    attributes.id,
    attributes.class,
    attributes['data-testid'],
    attributes['aria-label'],
  ].filter(Boolean).join(' ');

  return NOISE_HINT.test(hint);
}

export function cleanImportedArticleMarkup(value = '') {
  return sanitizeHtml(String(value || ''), {
    allowedTags: CONTENT_TAGS,
    allowedAttributes: {
      '*': ['class', 'id', 'role', 'aria-label', 'aria-hidden', 'hidden', 'style', 'data-testid'],
      img: [
        'src', 'alt', 'title', 'width', 'height', 'srcset',
        'data-src', 'data-lazy-src', 'data-original', 'data-srcset',
      ],
      source: ['srcset', 'data-srcset'],
    },
    allowedSchemes: ['http', 'https'],
    // An entire subtree must disappear, not just its wrapper. Otherwise
    // accessibility controls, navigation and adverts leak into Google Docs.
    exclusiveFilter: isInterfaceWidget,
  });
}

function looksLikeAccessibilityControls(text) {
  const value = String(text || '');
  if (value.length > 900) return false;

  const signals = [
    /màu chữ/i, /tùy chỉnh/i, /về mặc định/i,
    /tương phản/i, /#[a-f0-9]{6}\b/i, /rất tốt\s*\(aaa\)/i,
  ].filter((regex) => regex.test(value)).length;

  return signals >= 3;
}

function removeControlLines(value = '') {
  const raw = String(value || '').replace(/\[\[DTHL_(?:H[234]|QUOTE|LI|END)\]\]/g, '');
  if (looksLikeAccessibilityControls(raw)) {
    // Some sites flatten the whole colour/contrast widget into a single line.
    // Trim that cluster without discarding real text following it.
    const lines = raw.split('\n');
    if (lines.length === 1) {
      const ending = [...raw.matchAll(/về mặc định/gi)].at(-1);
      if (ending && ending.index < 800) {
        return raw.slice(ending.index + ending[0].length).trim();
      }
      return '';
    }
  }

  return raw.split('\n')
    .filter((line) => !CONTROL_LINE.test(line.trim()))
    .join('\n')
    .trim();
}

/**
 * Clean already-extracted content without changing legitimate editorial copy.
 * Only strip clear UI text, repeated title/sapo, and trailing related-content
 * headings. "Tin liên quan" inside ordinary paragraphs is left untouched.
 */
export function cleanImportedArticleBlocks(blocks = [], { title = '', summary = '' } = {}) {
  const titleKey = normalized(title);
  const summaryKey = normalized(summary);
  const cleaned = [];
  let removed = 0;
  let stopTail = false;

  for (const block of blocks) {
    if (stopTail) {
      removed += 1;
      continue;
    }

    if (block?.type === 'image') {
      cleaned.push(block);
      continue;
    }

    const text = removeControlLines(block?.text);
    const key = normalized(text);
    if (!key) {
      removed += 1;
      continue;
    }

    if (
      cleaned.length < 15 &&
      (key === titleKey ||
        key === summaryKey ||
        (key.startsWith('sapo: ') && normalized(key.slice(6)) === summaryKey))
    ) {
      removed += 1;
      continue;
    }

    // End-of-article "related" sections should not become newsroom copy.
    if (FOOTER_HEADING.test(text) && cleaned.length >= 2) {
      removed += 1;
      stopTail = true;
      continue;
    }

    if (TRACKING_LINE.test(text) || looksLikeAccessibilityControls(text)) {
      removed += 1;
      continue;
    }

    const previous = [...cleaned].reverse().find((item) => item.type !== 'image');
    if (previous && normalized(previous.text) === key) {
      removed += 1;
      continue;
    }

    cleaned.push({ ...block, text });
  }

  return { blocks: cleaned, removedBlocks: removed };
}
