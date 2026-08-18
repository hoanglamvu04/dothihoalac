import { useEffect, useMemo, useState } from 'react';
import {
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';

import ContentEditorShell from '../../components/studio/ContentEditorShell';
import { LoadingBlock } from '../../components/common/Loading';
import { propertyApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import PropertyEditorPage from './PropertyEditorPage';

export default function PropertyStudioAdapter() {
  const { editorId } = useParams();
  const location = useLocation();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    propertyApi
      .editDetail(editorId)
      .then((result) => {
        if (active) setItem(result);
      })
      .catch((requestError) => {
        if (active) {
          setError(apiErrorMessage(requestError, 'Không thể tải tin bất động sản.'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [editorId]);

  const editorLocation = useMemo(
    () => ({
      pathname: location.pathname,
      search: `?edit=${encodeURIComponent(editorId || '')}`,
      hash: '',
      state: { ...(location.state || {}), item: item || {} },
      key: `property-studio-${editorId}`,
    }),
    [editorId, item, location.pathname, location.state],
  );

  return (
    <ContentEditorShell contentType="property">
      {() => {
        if (loading) return <LoadingBlock />;

        if (error || !item) {
          return (
            <section className="content-studio-shell content-studio-shell--error">
              <h1>Không tải được tin bất động sản</h1>
              <p>{error || 'Không tìm thấy bản nháp.'}</p>
            </section>
          );
        }

        /*
         * PropertyEditorPage cũ vẫn dùng ?edit + location.state để khôi phục dữ liệu.
         * Alternate location chỉ tồn tại trong Router context con, vì vậy URL trình
         * duyệt vẫn sạch /studio/bat-dong-san/:id trong khi toàn bộ wizard hiện tại
         * tiếp tục hoạt động không cần fork 60k+ dòng giao diện đã ổn định.
         */
        return (
          <Routes location={editorLocation}>
            <Route path="*" element={<PropertyEditorPage />} />
          </Routes>
        );
      }}
    </ContentEditorShell>
  );
}
