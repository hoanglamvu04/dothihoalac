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

    const run = async () => {
      try {
        let result;
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
        setState({ phase: 'error', message: 'Không mở được Google Docs.', error: apiErrorMessage(error) });
      }
    };

    run();
    return () => { active = false; };
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
