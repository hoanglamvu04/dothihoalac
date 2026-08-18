import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';

const launchTasks = new Map();
const LAUNCH_TASK_CACHE_MS = 5000;

function launchKey() {
  const storageKey = 'dthl-google-docs-launch-key';
  let value = window.sessionStorage.getItem(storageKey);

  if (!value) {
    value =
      window.crypto?.randomUUID?.() ||
      `docs-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.sessionStorage.setItem(storageKey, value);
  }

  return value;
}

function sharedLaunchTask(key, factory) {
  const cached = launchTasks.get(key);
  if (cached) return cached;

  const task = Promise.resolve().then(factory);
  launchTasks.set(key, task);

  task.finally(() => {
    window.setTimeout(() => {
      if (launchTasks.get(key) === task) launchTasks.delete(key);
    }, LAUNCH_TASK_CACHE_MS);
  });

  return task;
}

function launcherError(error) {
  if (error?.code === 'ECONNABORTED' || /timeout/i.test(String(error?.message || ''))) {
    return 'Google phản hồi quá chậm. Bản nháp vẫn được giữ; bấm Thử lại sẽ tiếp tục đúng bài thay vì tạo trùng.';
  }
  return apiErrorMessage(error);
}

export default function GoogleDocsArticleLauncher() {
  const { id } = useParams();
  const navigate = useNavigate();
  const postId = id || 'new';
  const listUrl = useMemo(() => '/quan-tri/bai-viet', []);

  const [state, setState] = useState({
    phase: 'starting',
    message: 'Đang chuẩn bị Article Workspace…',
    error: '',
  });

  useEffect(() => {
    let active = true;
    let slowTimer;

    const draftToken = postId === 'new' ? launchKey() : '';
    const taskKey = postId === 'new' ? `new:${draftToken}` : `post:${postId}`;

    const run = async () => {
      try {
        slowTimer = window.setTimeout(() => {
          if (!active) return;
          setState((current) => ({
            ...current,
            message: 'Google đang phản hồi chậm hơn bình thường… bản nháp vẫn an toàn.',
          }));
        }, 8000);

        let result;
        if (postId === 'new') {
          setState({
            phase: 'creating',
            message: 'Đang tạo bản nháp bài viết và liên kết Google Docs…',
            error: '',
          });
          result = await sharedLaunchTask(taskKey, () =>
            adminApi.createGoogleDraft({ draftToken, seed: null }),
          );
        } else {
          setState({
            phase: 'opening',
            message: 'Đang kiểm tra Google Docs của bài viết…',
            error: '',
          });
          result = await sharedLaunchTask(taskKey, () => adminApi.ensureGoogleDoc(postId));
        }

        if (!active) return;

        const resolvedId = String(result?.postId || (postId !== 'new' ? postId : ''));
        if (!resolvedId) throw new Error('Backend chưa trả về ID bài viết.');

        if (postId === 'new') {
          window.sessionStorage.removeItem('dthl-google-docs-launch-key');
        }

        setState({
          phase: 'redirecting',
          message: 'Đã sẵn sàng. Đang mở Article Workspace…',
          error: '',
        });

        // Không đẩy người dùng ra khỏi CMS nữa. Google Docs trở thành phòng soạn
        // được mở theo nhu cầu bên trong Article Workspace.
        navigate(`/quan-tri/bai-viet/${encodeURIComponent(resolvedId)}`, {
          replace: true,
          state: { docUrl: result?.docUrl || '' },
        });
      } catch (error) {
        if (!active) return;
        setState({
          phase: 'error',
          message: 'Không mở được Article Workspace.',
          error: launcherError(error),
        });
      } finally {
        window.clearTimeout(slowTimer);
      }
    };

    void run();

    return () => {
      active = false;
      window.clearTimeout(slowTimer);
    };
  }, [navigate, postId]);

  return (
    <main className="admin-doc-launcher">
      <section className="admin-doc-launcher-card">
        <div className="admin-doc-launcher-orb">G</div>
        <p className="admin-kicker">Google Docs · DTHL Content Studio</p>
        <h1>{state.message}</h1>

        {state.phase !== 'error' ? (
          <>
            <p>
              Nội dung dài vẫn có thể soạn trong Google Docs, nhưng phân loại, ảnh đại diện,
              xem trước và xuất bản được quản lý tập trung trong DTHL CMS.
            </p>
            <div className="admin-doc-launcher-progress"><span /></div>
          </>
        ) : (
          <>
            <div className="admin-alert error">{state.error}</div>
            <div className="admin-doc-launcher-actions">
              <button type="button" className="admin-primary" onClick={() => window.location.reload()}>
                Thử lại
              </button>
              <button type="button" className="admin-secondary" onClick={() => navigate(listUrl)}>
                Quay lại danh sách bài viết
              </button>
              <button type="button" className="admin-secondary" onClick={() => navigate('/quan-tri/google-workspace')}>
                Kiểm tra Google Workspace
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
