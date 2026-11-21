import { useEffect, useState } from 'react';
import { Clock3, RotateCcw, History } from 'lucide-react';

import ArticleBody from '../../components/content/ArticleBody';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { formatDateTime } from '../../utils/formatters';

export default function ArticleRevisionPanel({ articleId, canRestore, onRestored }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    adminApi.articleRevisions(articleId)
      .then((values) => {
        if (active) {
          setItems(Array.isArray(values) ? values : []);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(apiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [articleId]);

  const showVersion = async (revisionNumber) => {
    setBusy(true);
    try {
      setSelected(await adminApi.articleRevisionDetail(articleId, revisionNumber));
      setError('');
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const restoreVersion = async () => {
    if (!selected || !canRestore || busy) return;
    if (!window.confirm('Khôi phục bản lưu này? Hệ thống sẽ lưu lại nội dung hiện tại trước khi thay đổi.')) return;
    setBusy(true);
    try {
      await adminApi.restoreArticleRevision(articleId, selected.revisionNumber);
      setSelected(null);
      setItems(await adminApi.articleRevisions(articleId));
      await onRestored?.();
      setError('');
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="article-workspace-card article-workspace-card--wide article-revision-panel">
      <div className="article-workspace-card__head">
        <History size={19} />
        <div>
          <h2>Lịch sử phiên bản CMS</h2>
          <p>Các bản lưu khi cập nhật nội dung; có thể kiểm tra và đối chiếu.</p>
        </div>
      </div>

      {!canRestore ? (
        <p className="article-revision-notice">
          Bài đã xuất bản hoặc liên kết Google Docs chỉ cho phép xem lịch sử CMS.
          Với tài liệu Google Docs, dùng Tệp → Lịch sử phiên bản để phục hồi tại nguồn.
        </p>
      ) : null}
      {error ? <p className="article-quality-error">{error}</p> : null}
      {loading ? <p>Đang tải lịch sử phiên bản…</p> : null}
      {!loading && items.length === 0 ? (
        <p>Chưa có phiên bản trước. Lịch sử bắt đầu sau lần cập nhật nội dung.</p>
      ) : null}

      {items.length > 0 ? (
        <div className="article-revision-list">
          {items.map((revision) => (
            <button
              key={revision._id}
              type="button"
              disabled={busy}
              onClick={() => showVersion(revision.revisionNumber)}
              className={revision.revisionNumber === selected?.revisionNumber ? 'is-selected' : ''}
            >
              <Clock3 size={15} />
              <strong>#{revision.revisionNumber}</strong>
              <span>{revision.title}</span>
              <small>{formatDateTime(revision.createdAt)}</small>
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <div className="article-revision-preview">
          <div className="article-revision-preview__heading">
            <div>
              <strong>Bản lưu #{selected.revisionNumber}</strong>
              <p>{selected.changeNote || 'Chỉnh sửa nội dung'}</p>
            </div>
            {canRestore ? (
              <button type="button" className="admin-secondary" disabled={busy} onClick={restoreVersion}>
                <RotateCcw size={15} /> Khôi phục bản này
              </button>
            ) : null}
          </div>
          <h2>{selected.title}</h2>
          {selected.summary ? <p>{selected.summary}</p> : null}
          <ArticleBody html={selected.bodyHtml || ''} />
        </div>
      ) : null}
    </section>
  );
}
