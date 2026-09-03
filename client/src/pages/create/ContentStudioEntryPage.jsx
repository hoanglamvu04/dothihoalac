import { useEffect, useState } from 'react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Seo from '../../components/common/Seo';
import { draftApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { editorBasePath } from '../../utils/content';

const createTasks = new Map();

function sharedCreate(contentType) {
  if (!createTasks.has(contentType)) {
    const task = draftApi.create(contentType).finally(() => {
      window.setTimeout(() => {
        if (createTasks.get(contentType) === task) {
          createTasks.delete(contentType);
        }
      }, 3000);
    });
    createTasks.set(contentType, task);
  }

  return createTasks.get(contentType);
}

const LABELS = {
  property: 'tin bất động sản',
  job: 'tin tuyển dụng',
};

export default function ContentStudioEntryPage({ contentType }) {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (contentType === 'community') {
      navigate('/cong-dong', { replace: true });
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('dthl:open-community-composer'),
        );
      }, 0);
      return undefined;
    }

    let active = true;

    setError('');

    sharedCreate(contentType)
      .then((draft) => {
        if (!active) return;

        const id = String(draft?._id || draft?.id || '');
        if (!id) throw new Error('Server chưa trả về ID bản nháp.');

        navigate(
          `${editorBasePath(contentType)}/${encodeURIComponent(id)}`,
          { replace: true },
        );
      })
      .catch((requestError) => {
        if (active) {
          setError(apiErrorMessage(requestError, 'Không thể tạo bản nháp trên máy chủ.'));
        }
      });

    return () => {
      active = false;
    };
  }, [attempt, contentType, navigate]);

  if (contentType === 'community') {
    return null;
  }

  return (
    <main className="content-studio-entry">
      <Seo title={`Tạo ${LABELS[contentType] || 'nội dung'}`} />
      <section className="content-studio-entry__card">
        {error ? (
          <>
            <h1>Không tạo được bản nháp</h1>
            <p>{error}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>
              <RotateCcw size={17} /> Thử lại
            </button>
          </>
        ) : (
          <>
            <LoaderCircle className="is-spinning" size={30} />
            <h1>Đang mở Content Studio</h1>
            <p>
              Hệ thống đang tạo {LABELS[contentType] || 'bản nháp'} trên máy chủ để bạn có thể
              mở lại đúng nội dung này sau khi tải lại trang hoặc đổi thiết bị.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
