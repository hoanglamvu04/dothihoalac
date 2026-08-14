import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Seo from '../../components/common/Seo';
import { PageLoading } from '../../components/common/Loading';
import { isPersistedContentId } from '../../utils/content';

export default function CommunityEditorPage() {
  const { editorId } = useParams();
  const navigate = useNavigate();

  const editId = useMemo(
    () => (isPersistedContentId(editorId) ? editorId : ''),
    [editorId],
  );

  useEffect(() => {
    const fallbackPath = editId
      ? '/tai-khoan/bai-viet'
      : '/cong-dong';

    const handleClosed = () => {
      navigate(fallbackPath, { replace: true });
    };

    window.addEventListener(
      'dthl:community-composer-closed',
      handleClosed,
    );

    const frameId = window.requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent('dthl:open-community-composer', {
          detail: { editId },
        }),
      );
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener(
        'dthl:community-composer-closed',
        handleClosed,
      );
    };
  }, [editId, navigate]);

  return (
    <>
      <Seo title={editId ? 'Chỉnh sửa bài cộng đồng' : 'Đăng bài cộng đồng'} />
      <PageLoading />
    </>
  );
}
