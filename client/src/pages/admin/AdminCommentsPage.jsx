import { useEffect, useState } from 'react';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

import './AdminManagedContentPage.css';

const STATUSES = [
  ['', 'Tất cả'],
  ['published', 'Đang hiển thị'],
  ['pending', 'Chờ duyệt'],
  ['hidden', 'Đã ẩn'],
  ['deleted', 'Đã xóa'],
];

function tone(status) {
  if (status === 'published') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'hidden' || status === 'deleted') return 'danger';
  return 'soft';
}

export default function AdminCommentsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState('');
  const [busyId, setBusyId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    adminApi.comments({
      page,
      limit: 30,
      status: status || undefined,
      q: appliedQuery || undefined,
    })
      .then((result) => {
        setItems(result.items);
        setMeta(result.meta);
      })
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [page, status, appliedQuery, reloadKey]);

  const updateStatus = async (item, nextStatus) => {
    setBusyId(String(item._id));
    try {
      const result = await adminApi.updateComment(item._id, { status: nextStatus });
      toast.success('Đã cập nhật bình luận.');
      if (selected?._id === item._id) setSelected(result);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusyId('');
    }
  };

  const saveBody = async () => {
    if (!selected || !body.trim()) return;
    setBusyId(String(selected._id));
    try {
      const result = await adminApi.updateComment(selected._id, { body: body.trim() });
      setSelected(result);
      setEditing(false);
      toast.success('Đã sửa bình luận.');
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusyId('');
    }
  };

  const remove = async (item) => {
    if (!window.confirm('Xóa bình luận này? Thao tác sẽ xóa mềm và cập nhật số lượng bình luận của nội dung.')) return;
    setBusyId(String(item._id));
    try {
      await adminApi.deleteComment(item._id);
      toast.success('Đã xóa bình luận.');
      if (selected?._id === item._id) setSelected(null);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <Seo title="Quản lý bình luận" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Tương tác người dùng</p>
          <h1>Bình luận</h1>
          <p>Xem toàn bộ bình luận trên tin tức, cộng đồng, bất động sản và việc làm; tìm kiếm, xem chi tiết, sửa, ẩn, khôi phục hoặc xóa.</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="filter-tabs">
          {STATUSES.map(([value, label]) => (
            <button key={value} type="button" className={status === value ? 'is-active' : ''} onClick={() => { setStatus(value); setPage(1); }}>
              {label}
            </button>
          ))}
        </div>
        <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedQuery(query.trim()); }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nội dung bình luận…" />
          <button type="submit" className="admin-secondary"><Search size={14} /> Tìm</button>
        </form>
      </div>

      {loading ? <LoadingBlock /> : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Bình luận</th><th>Người viết</th><th>Nội dung gốc</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td><strong>{item.body}</strong><small>{item.parentId ? 'Trả lời bình luận' : 'Bình luận gốc'} · {item.reactionCount || 0} reaction</small></td>
                  <td><strong>{item.userId?.displayName || item.userId?.username || 'Thành viên'}</strong><small>{item.userId?.email || '—'}</small></td>
                  <td><strong>{item.contentId?.title || 'Nội dung đã xóa'}</strong><small>{item.contentId?.contentType || '—'}</small></td>
                  <td><Badge tone={tone(item.status)}>{item.status}</Badge></td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => { setSelected(item); setEditing(false); setBody(item.body); }}><Eye size={13} /> Chi tiết</button>
                      <button type="button" onClick={() => { setSelected(item); setEditing(true); setBody(item.body); }}><Pencil size={13} /> Sửa</button>
                      {item.status !== 'hidden' ? <button type="button" disabled={busyId === String(item._id)} onClick={() => updateStatus(item, 'hidden')}>Ẩn</button> : <button type="button" disabled={busyId === String(item._id)} onClick={() => updateStatus(item, 'published')}>Khôi phục</button>}
                      <button type="button" disabled={busyId === String(item._id)} onClick={() => remove(item)}><Trash2 size={13} /> Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Không có bình luận phù hợp bộ lọc" />}

      <Pagination meta={meta} onPageChange={setPage} />

      {selected ? (
        <div className="admin-managed-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="admin-managed-modal" role="dialog" aria-modal="true">
            <header>
              <div><p className="admin-kicker">{editing ? 'Sửa bình luận' : 'Chi tiết bình luận'}</p><h2>{selected.userId?.displayName || selected.userId?.username || 'Thành viên'}</h2></div>
              <button type="button" className="admin-secondary" onClick={() => setSelected(null)}>Đóng</button>
            </header>
            <div className="admin-managed-detail">
              <dl>
                <div><dt>ID</dt><dd>{selected._id}</dd></div>
                <div><dt>Trạng thái</dt><dd><Badge tone={tone(selected.status)}>{selected.status}</Badge></dd></div>
                <div><dt>Nội dung gốc</dt><dd>{selected.contentId?.title || '—'}</dd></div>
                <div><dt>Loại nội dung</dt><dd>{selected.contentId?.contentType || '—'}</dd></div>
                <div><dt>Ngày tạo</dt><dd>{formatDateTime(selected.createdAt)}</dd></div>
                <div><dt>Ngày sửa</dt><dd>{selected.editedAt ? formatDateTime(selected.editedAt) : '—'}</dd></div>
              </dl>
              {editing ? (
                <div className="admin-managed-form" style={{ marginTop: 18, padding: 0 }}>
                  <label className="is-wide"><span>Nội dung bình luận</span><textarea rows="8" value={body} onChange={(event) => setBody(event.target.value)} /></label>
                  <div className="admin-managed-form-actions is-wide">
                    <button type="button" className="admin-secondary" onClick={() => setEditing(false)}>Hủy</button>
                    <button type="button" className="admin-primary" disabled={busyId === String(selected._id)} onClick={saveBody}>Lưu thay đổi</button>
                  </div>
                </div>
              ) : (
                <div className="admin-managed-summary"><strong>Nội dung bình luận</strong><p>{selected.body}</p></div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
