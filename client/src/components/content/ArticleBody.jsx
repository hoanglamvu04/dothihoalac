import DOMPurify from 'dompurify';

export default function ArticleBody({ html }) {
  const normalizedHtml = String(html || '').normalize('NFC');
  const sanitizedHtml = DOMPurify.sanitize(normalizedHtml);

  return (
    <div
      className="article-body"
      dangerouslySetInnerHTML={{
        __html: sanitizedHtml,
      }}
    />
  );
}
