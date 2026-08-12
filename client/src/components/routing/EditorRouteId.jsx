import { useEffect, useMemo } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { PageLoading } from '../common/Loading';
import {
  createEditorSessionId,
  isPersistedContentId,
} from '../../utils/content';

export default function EditorRouteId({
  basePath,
  sessionPrefix = 'draft',
  children,
}) {
  const { editorId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const legacyEditId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get('edit');

    return isPersistedContentId(value)
      ? value
      : '';
  }, [location.search]);

  useEffect(() => {
    if (editorId) {
      return;
    }

    const nextId =
      legacyEditId ||
      createEditorSessionId(sessionPrefix);

    navigate(
      `${basePath}/${encodeURIComponent(nextId)}${location.search}`,
      {
        replace: true,
        state: location.state,
      },
    );
  }, [
    basePath,
    editorId,
    legacyEditId,
    location.search,
    location.state,
    navigate,
    sessionPrefix,
  ]);

  if (!editorId) {
    return <PageLoading />;
  }

  return children;
}
