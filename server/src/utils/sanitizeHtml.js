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
      a: ['href', 'target', 'rel', 'title'],
      figure: ['class', 'data-media-id'],
      img: [
        'src',
        'alt',
        'title',
        'width',
        'height',
        'loading',
        'decoding',
        'data-media-id',
      ],
      figcaption: ['class'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'tel'],
      img: ['http', 'https'],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtmlLibrary.simpleTransform(
        'a',
        {
          rel: 'nofollow noopener noreferrer',
        },
        true,
      ),
      img: sanitizeHtmlLibrary.simpleTransform(
        'img',
        {
          loading: 'lazy',
          decoding: 'async',
        },
        true,
      ),
    },
  });
}

export function htmlToPlainText(html = '') {
  return sanitizeHtmlLibrary(String(html), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, ' ')
    .trim();
}
