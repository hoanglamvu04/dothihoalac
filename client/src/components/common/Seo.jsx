import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function Seo({ title, description = '' }) {
  useDocumentTitle(title, description);
  return null;
}
