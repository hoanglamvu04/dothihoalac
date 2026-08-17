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

function withStableEditorState(state) {
  if (state?.item && typeof state.item === 'object') {
    return state;
  }

  return {
    ...(state || {}),
    item: {},
  };
}

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

  const hasStableEditorItem = Boolean(
    location.state?.item &&
      typeof location.state.item === 'object',
  );

  useEffect(() => {
    if (!editorId) {
      const nextId =
        legacyEditId ||
        createEditorSessionId(sessionPrefix);

      navigate(
        `${basePath}/${encodeURIComponent(nextId)}${location.search}${location.hash || ''}`,
        {
          replace: true,
          state: withStableEditorState(location.state),
        },
      );

      return;
    }

    if (!hasStableEditorItem) {
      navigate(
        `${location.pathname}${location.search}${location.hash || ''}`,
        {
          replace: true,
          state: withStableEditorState(location.state),
        },
      );
    }
  }, [
    basePath,
    editorId,
    hasStableEditorItem,
    legacyEditId,
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
    sessionPrefix,
  ]);

  if (!editorId || !hasStableEditorItem) {
    return <PageLoading />;
  }

  return children;
}
