import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';

function newDraftSeed() {
  try {
    const raw = window.localStorage.getItem('dthl-admin-article-draft:new');
    return raw ? JSON.parse(raw)?.form || null : null;
  } catch {
    return null;
  }
}

function launchKey() {
  const storageKey = 'dthl-google-docs-launch-key';
  let value = window.sessionStorage.getItem(storageKey);
  if (!value) {
    value = window.crypto?.randomUUID?.() || `docs-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(storageKey, value);
  }
  return value;
}

function launcherError(error) {
  if (
    error?.code === 'ECONNABORTED' ||
    /timeout/i.test(String(error?.message || ''))
  ) {
    return 'Google phản hồi quá chậm nên yêu cầu đã dừng để tránh màn hình treo. Bản nháp được giữ bằng mã phiên; bấm “Thử lại” sẽ tiếp tục đúng bản nháp thay vì tạo trùng.';
  }

  return apiErrorMessage(error);
}

export default function GoogleDocsArticleLauncher() {
  const { id } = useParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const postId = id || 'new';
  const fallbackUrl = useMemo(
    () => postId === 'new' ? '/quan-tri/bai-viet/moi' : `/quan-tri/bai-viet/${postId}/sua`,
    [postId],
  );
  const [state, setState] = useState({
    phase: 'starting',
    message: 'Đang chuẩn bị Google Docs…',
    error: '',
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let active = true;
    let slowTimer;

    const run = async () => {
      try {
        let result;

        slowTimer = window.setTimeout(() => {
          if (!active) return;
          setState((current) => ({
            ...current,
            message: 'Google đang phản hồi chậm hơn bình thường… hệ thống vẫn giữ nguyên bản nháp.',
          }));
        }, 8000);

        if (postId === 'new') {
          setState({ phase: 'creating', message: 'Đang tạo bản nháp và Google Docs trong 01_ĐANG_SOẠN…', error: '' });
          result = await adminApi.createGoogleDraft({
            draftToken: launchKey(),
            seed: newDraftSeed(),
          });
          window.sessionStorage.removeItem('dthl-google-docs-launch-key');
        } else {
          setState({ phase: 'opening', message: 'Đang tìm hoặc tạo Google Docs của bài viết…', error: '' });
          result = await adminApi.ensureGoogleDoc(postId);
        }

        if (!active) return;
        if (!result?.docUrl) throw new Error('Backend chưa trả về đường dẫn Google Docs.');
        setState({ phase: 'redirecting', message: 'Đã sẵn sàng. Đang mở phòng soạn Google Docs…', error: '' });
        window.location.replace(result.docUrl);
      } catch (error) {
        if (!active) return;
        setState({ phase: 'error', message: 'Không mở được Google Docs.', error: launcherError(error) });
      } finally {
        window.clearTimeout(slowTimer);
      }
    };

    run();
    return () => {
      active = false;
      window.clearTimeout(slowTimer);
    };
  }, [postId]);

  return (
    <main className="admin-doc-launcher">
      <section className="admin-doc-launcher-card">
        <div className="admin-doc-launcher-orb">G</div>
        <p className="admin-kicker">Google Docs · DTHL Content Studio</p>
        <h1>{state.message}</h1>
        {state.phase !== 'error' ? (
          <>
            <p>{postId === 'new' ? 'Bản nháp được tạo trên máy chủ trước, sau đó tài liệu được đặt vào đúng thư mục nội dung năm hiện tại.' : 'Nếu bài đã có tài liệu Google Docs, hệ thống mở lại đúng tài liệu đó; nếu chưa có, hệ thống tạo mới từ nội dung hiện tại.'}</p>
            <div className="admin-doc-launcher-progress"><span /></div>
          </>
        ) : (
          <>
            <div className="admin-alert error">{state.error}</div>
            <div className="admin-doc-launcher-actions">
              <button type="button" className="admin-primary" onClick={() => window.location.reload()}>Thử lại</button>
              <button type="button" className="admin-secondary" onClick={() => navigate(fallbackUrl)}>Mở trình soạn trên web</button>
              <button type="button" className="admin-secondary" onClick={() => navigate('/quan-tri/google-workspace')}>Kiểm tra Google Workspace</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
