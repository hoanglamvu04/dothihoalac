import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function Seo({
  title,
  description = '',
  canonical = '',
  image = '',
  type = 'website',
  noindex = false,
  jsonLd = null,
}) {
  useDocumentTitle(title, description, {
    canonical,
    image,
    type,
    noindex,
    jsonLd,
  });

  return null;
}
