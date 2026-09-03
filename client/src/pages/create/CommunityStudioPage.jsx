import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { isPersistedContentId } from '../../utils/content';

const COMMUNITY_CREATE_ROUTE = '/cong-dong/create';

export default function CommunityStudioPage() {
  const navigate = useNavigate();
  const { editorId } = useParams();

  useEffect(() => {
    const editId = isPersistedContentId(editorId) ? editorId : '';

    navigate('/cong-dong', {
      replace: true,
      state: {
        communityComposerRoute: COMMUNITY_CREATE_ROUTE,
        communityComposerEditId: editId,
      },
    });
  }, [editorId, navigate]);

  return null;
}
