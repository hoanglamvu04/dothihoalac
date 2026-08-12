import {
  memo,
  useMemo,
} from 'react';
import DOMPurify from 'dompurify';

function ArticleBody({ html }) {
  const sanitizedHtml = useMemo(() => {
    const normalizedHtml = String(
      html || '',
    ).normalize('NFC');

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
