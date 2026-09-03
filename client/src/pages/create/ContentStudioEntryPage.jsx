import { useEffect, useState } from 'react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Seo from '../../components/common/Seo';
import CommunityPage from '../public/CommunityPage';
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
  community: 'bài cộng đồng',
  property: 'tin bất động sản',
  job: 'tin tuyển dụng',
};

export default function ContentStudioEntryPage({ contentType }) {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
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
    return (
      <>
        <Seo title="Bài viết mới" />
        <CommunityPage />

        {error ? (
          <div
            role="alert"
            style={{
              position: 'fixed',
              zIndex: 1400,
              left: '50%',
              bottom: 'max(24px, env(safe-area-inset-bottom))',
              width: 'min(92vw, 420px)',
              padding: '12px 14px',
              border: '1px solid #e3b4b4',
              borderRadius: 14,
              color: '#6f2525',
              background: '#fff7f7',
              boxShadow: '0 12px 32px rgb(0 0 0 / 0.16)',
              transform: 'translateX(-50%)',
            }}
          >
            <strong>Chưa thể mở bài viết.</strong>
            <p style={{ margin: '4px 0 10px', fontSize: '0.82rem' }}>{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 36,
                padding: '0 12px',
                gap: 6,
                border: 0,
                borderRadius: 9,
                color: '#fff',
                background: '#0b8c42',
                font: 'inherit',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={15} /> Thử lại
            </button>
          </div>
        ) : null}
      </>
    );
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
