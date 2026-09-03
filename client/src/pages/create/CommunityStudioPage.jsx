import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { isPersistedContentId } from '../../utils/content';

export default function CommunityStudioPage() {
  const navigate = useNavigate();
  const { editorId } = useParams();

  useEffect(() => {
    const editId = isPersistedContentId(editorId) ? editorId : '';

    navigate('/cong-dong', { replace: true });

    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('dthl:open-community-composer', {
          detail: { editId },
        }),
      );
    }, 0);
  }, [editorId, navigate]);

  return null;
}
