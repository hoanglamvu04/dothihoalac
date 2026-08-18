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

function ArticleBody({ html }) {
  const sanitizedHtml = useMemo(() => {
    const normalizedHtml = removeLegacyAutoCaptions(
      String(html || '').normalize('NFC'),
    );

    return DOMPurify.sanitize(
      normalizedHtml,
    );
  }, [html]);

  return (
    <div
      className="article-body"
      dangerouslySetInnerHTML={{
        __html: sanitizedHtml,
      }}
    />
  );
}

export default memo(ArticleBody);
