import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Eye,
  FilePenLine,
  FilePlus2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { draftApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import {
  contentPath,
  contentTypeLabel,
  editorPath,
} from '../../utils/content';
import { CONTENT_STATUS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';
import { mediaUrl } from '../../utils/media';

import './MyContentPage.css';

const TYPES = [
  ['', 'Tất cả'],
  ['community', 'Cộng đồng'],
  ['property', 'Bất động sản'],
  ['job', 'Việc làm'],
  ['article', 'Tin tức'],
];

const STATUSES = [
  ['', 'Mọi trạng thái'],
  ['draft', 'Nháp'],
  ['pending_review', 'Chờ duyệt'],
  ['needs_revision', 'Cần sửa'],
  ['approved', 'Đã duyệt'],
  ['published', 'Đã xuất bản'],
  ['rejected', 'Bị từ chối'],
  ['expired', 'Hết hạn'],
  ['archived', 'Đã lưu trữ'],
];

const EDITABLE = new Set(['draft', 'needs_revision', 'rejected']);

function statusTone(status) {
  if (status === 'published') return 'success';
  if (status === 'needs_revision' || status === 'rejected') return 'danger';
  if (status === 'pending_review' || status === 'approved') return 'warning';
  return 'soft';
}

export default function MyContentPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    userApi
      .myPosts({
        page,
        limit: 12,
        type: type || undefined,
        status: status || undefined,
      })
      .then((result) => {
        if (!active) return;
        setItems(result?.items || []);
        setMeta(result?.meta || {});
      })
      .catch((error) => {
        if (active) toast.error(apiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reloadKey, status, toast, type]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const total = Number(meta?.total ?? meta?.totalItems ?? items.length);
  const summary = useMemo(
    () => `${total} nội dung${type ? ` · ${contentTypeLabel(type)}` : ''}`,
    [total, type],
  );

  const removeDraft = async (item) => {
    const id = String(item?._id || '');
    if (!id || deletingId) return;

    const accepted = window.confirm(`Xóa bản nháp “${item.title}”?`);
    if (!accepted) return;

    setDeletingId(id);
    try {
      await draftApi.remove(id);
      toast.success('Đã xóa nội dung khỏi danh sách.');
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="my-content-page">
      <Seo title="Nội dung của tôi" />

      <header className="my-content-hero">
        <div>
          <span>Trung tâm nội dung</span>
          <h1>Nội dung của tôi</h1>
          <p>
            Theo dõi bản nháp, nội dung đang kiểm duyệt và các bài đã xuất bản trong một nơi.
          </p>
        </div>
        <Link to="/dang-bai" className="my-content-create">
          <FilePlus2 size={18} /> Đăng nội dung mới
        </Link>
      </header>

      <section className="my-content-toolbar">
        <div className="my-content-tabs" aria-label="Lọc loại nội dung">
          {TYPES.map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              className={type === value ? 'is-active' : ''}
              onClick={() => setFilter('type', value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="my-content-toolbar__right">
          <label>
            <Search size={16} />
            <select value={status} onChange={(event) => setFilter('status', event.target.value)}>
              {STATUSES.map(([value, label]) => (
                <option key={value || 'all-status'} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
      </section>

      <div className="my-content-summary">{summary}</div>

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <section className="my-content-grid">
          {items.map((item) => {
            const image = mediaUrl(item.thumbnailMediaId);
            const publicUrl = item.publicUrl || contentPath(item);
            const canEdit = EDITABLE.has(item.status) && item.contentType !== 'article';
            const canDelete = EDITABLE.has(item.status) && item.contentType !== 'article';
            const typeLabel = contentTypeLabel(item.contentType);

            return (
              <article className="my-content-card" key={item._id}>
                <div className="my-content-card__media">
                  {image ? <img src={image} alt="" loading="lazy" /> : <span>Không có ảnh</span>}
                  <span className={`my-content-card__media-type is-${item.contentType || 'content'}`}>
                    {typeLabel}
                  </span>
                </div>

                <div className="my-content-card__body">
                  <div className="my-content-card__head">
                    <div className="my-content-card__type">{typeLabel}</div>
                    <Badge
                      tone={statusTone(item.status)}
                      className="my-content-card__status"
                    >
                      {CONTENT_STATUS[item.status] || item.status}
                    </Badge>
                  </div>

                  <h2>{item.title}</h2>
                  <p>{item.summary || 'Chưa có mô tả ngắn.'}</p>
                  <small className="my-content-card__date">
                    <CalendarDays size={14} />
                    {formatDateTime(item.updatedAt || item.createdAt)}
                  </small>
                </div>

                <footer className="my-content-card__actions">
                  {publicUrl && publicUrl !== '#' && item.slug ? (
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <Eye size={16} /> Xem
                    </a>
                  ) : null}

                  {canEdit ? (
                    <Link to={editorPath(item)}>
                      <FilePenLine size={16} /> Chỉnh sửa
                    </Link>
                  ) : item.contentType === 'article' ? (
                    <Link to={`/quan-tri/bai-viet/${encodeURIComponent(item._id)}`}>
                      <FilePenLine size={16} /> Workspace
                    </Link>
                  ) : null}

                  {canDelete ? (
                    <button
                      type="button"
                      className="is-danger"
                      disabled={deletingId === String(item._id)}
                      onClick={() => removeDraft(item)}
                    >
                      <Trash2 size={16} />
                      {deletingId === String(item._id) ? 'Đang xóa…' : 'Xóa'}
                    </button>
                  ) : null}
                </footer>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          title="Chưa có nội dung phù hợp"
          description="Thử đổi bộ lọc hoặc tạo nội dung mới."
        />
      )}

      <Pagination
        meta={meta}
        onPageChange={(nextPage) => {
          const next = new URLSearchParams(searchParams);
          if (nextPage > 1) next.set('page', String(nextPage));
          else next.delete('page');
          setSearchParams(next);
        }}
      />
    </div>
  );
}
