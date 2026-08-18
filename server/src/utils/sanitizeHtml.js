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

const layoutStyleTags = [
  'p',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'figure',
  'figcaption',
  'table',
  'th',
  'td',
];

const safeLength = /^(?:0|auto|\d+(?:\.\d+)?(?:px|pt|em|rem|%))$/i;
const safeLineHeight = /^(?:normal|\d+(?:\.\d+)?|\d+(?:\.\d+)?(?:px|pt|em|rem|%))$/i;

export function cleanHtml(html = '') {
  const allowedAttributes = {
    a: ['href', 'target', 'rel', 'title'],
    figure: [
      'class',
      'style',
      'data-media-id',
      'data-caption-optional',
    ],
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
    figcaption: ['class', 'style'],
    th: ['colspan', 'rowspan', 'style'],
    td: ['colspan', 'rowspan', 'style'],
  };

  for (const tag of layoutStyleTags) {
    allowedAttributes[tag] = [
      ...(allowedAttributes[tag] || []),
      'style',
    ];
  }

  return sanitizeHtmlLibrary(String(html), {
    allowedTags,
    allowedAttributes,
    allowedStyles: {
      '*': {
        'text-align': [/^(?:left|right|center|justify|start|end)$/i],
        'margin-top': [safeLength],
        'margin-right': [safeLength],
        'margin-bottom': [safeLength],
        'margin-left': [safeLength],
        'padding-left': [safeLength],
        width: [safeLength],
        'max-width': [safeLength],
        'line-height': [safeLineHeight],
      },
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
  const withoutCaptions = String(html).replace(
    /<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/gi,
    ' ',
  );

  return sanitizeHtmlLibrary(withoutCaptions, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, ' ')
    .trim();
}
