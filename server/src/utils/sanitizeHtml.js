import sanitizeHtmlLibrary from 'sanitize-html';

const allowedTags = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'a',
  'img',
  'figure',
  'figcaption',
  'code',
  'pre',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

export function cleanHtml(html = '') {
  return sanitizeHtmlLibrary(String(html), {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: sanitizeHtmlLibrary.simpleTransform('a', { rel: 'nofollow noopener noreferrer' }, true),
      img: sanitizeHtmlLibrary.simpleTransform('img', { loading: 'lazy' }, true),
    },
  });
}

export function htmlToPlainText(html = '') {
  return sanitizeHtmlLibrary(String(html), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}
