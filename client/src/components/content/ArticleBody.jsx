import {
  memo,
  useMemo,
} from 'react';
import DOMPurify from 'dompurify';

function removeLegacyAutoCaptions(html = '') {
  return String(html).replace(
    /<figcaption\b[^>]*>\s*(?:Hình|Ảnh)\s+minh\s+họa\s+cho[\s\S]*?<\/figcaption>/giu,
    '',
  );
}

function isManualCaptionParagraph(paragraph) {
  if (!paragraph || paragraph.tagName !== 'P') return false;

  const text = String(paragraph.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text || text.length > 500) return false;

  const meaningfulNodes = Array.from(paragraph.childNodes).filter((node) => {
    if (node.nodeType === 3) return Boolean(String(node.textContent || '').trim());
    return node.nodeType === 1;
  });

  if (!meaningfulNodes.length) return false;

  return meaningfulNodes.every((node) => {
    if (node.nodeType === 3) return false;
    return ['EM', 'I'].includes(node.tagName);
  });
}

function normalizeArticleMarkup(html = '') {
  if (typeof DOMParser === 'undefined') return html;

  const document = new DOMParser().parseFromString(
    `<div data-article-root="true">${html}</div>`,
    'text/html',
  );
  const root = document.querySelector('[data-article-root="true"]');

  if (!root) return html;

  root.querySelectorAll('figure').forEach((figure) => {
    figure.classList.add('article-figure');

    const image = figure.querySelector('img');
    if (image) image.classList.add('article-figure__image');

    let caption = figure.querySelector('figcaption');
    const next = figure.nextElementSibling;

    // Google Docs commonly represents a manually typed image caption as the
    // next italic paragraph. Keep it visually attached to the image instead
    // of rendering it as a full body paragraph with newspaper-sized spacing.
    if (!caption && isManualCaptionParagraph(next)) {
      caption = document.createElement('figcaption');
      caption.innerHTML = next.innerHTML;
      figure.appendChild(caption);
      next.remove();
    }

    if (caption) caption.classList.add('article-figure__caption');
  });

  root.querySelectorAll('p').forEach((paragraph) => {
    if (!String(paragraph.textContent || '').trim() && !paragraph.querySelector('img, video, iframe')) {
      paragraph.classList.add('article-paragraph-spacer');
    }
  });

  return root.innerHTML;
}

function ArticleBody({ html }) {
  const sanitizedHtml = useMemo(() => {
    const normalizedHtml = removeLegacyAutoCaptions(
      String(html || '').normalize('NFC'),
    );

    const sanitized = DOMPurify.sanitize(normalizedHtml, {
      ADD_ATTR: [
        'class',
        'style',
        'data-media-id',
        'data-caption-optional',
      ],
    });

    return normalizeArticleMarkup(sanitized);
  }, [html]);

  return (
    <div
      className="article-body article-body--editor-fidelity"
      dangerouslySetInnerHTML={{
        __html: sanitizedHtml,
      }}
    />
  );
}

export default memo(ArticleBody);
