import DOMPurify from 'dompurify';

export default function ArticleBody({ html }) {
  return <div className="article-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || '') }} />;
}
