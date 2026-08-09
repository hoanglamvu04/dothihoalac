import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FilePenLine, FilePlus2, Search } from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { CONTENT_STATUS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

const statuses = [
  ['', 'Tất cả'],
  ['draft', 'Nháp'],
  ['pending_review', 'Chờ duyệt'],
  ['approved', 'Đã duyệt'],
  ['scheduled', 'Lên lịch'],
  ['published', 'Đã xuất bản'],
];

export default function AdminArticlesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.articles({
      page,
      limit: 20,
      status: status || undefined,
      q: appliedQuery || undefined,
    })
      .then((result) => {
        setItems(result.items);
        setMeta(result.meta);
      })
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [appliedQuery, page, status, toast]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  };

  return (
    <div>
      <Seo title="Quản lý bài viết" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Content Studio</p>
          <h1>Bài viết / Tin tức</h1>
          <p>Biên tập trên web bằng TipTap hoặc mở Google Docs; bản nháp, lịch đăng và trạng thái xuất bản dùng chung dữ liệu.</p>
        </div>
        <div className="admin-row-actions">
          <Link className="admin-secondary" to="/quan-tri/bai-viet/docs/moi">Google Docs</Link>
          <Link className="admin-primary" to="/quan-tri/bai-viet/moi"><FilePlus2 size={15} /> Bài mới</Link>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="filter-tabs">
          {statuses.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={status === value ? 'is-active' : ''}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <form className="admin-search" onSubmit={submitSearch}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tiêu đề hoặc mô tả…" />
          <button className="admin-secondary" type="submit"><Search size={14} /> Tìm</button>
        </form>
      </div>

      {loading ? <LoadingBlock /> : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Tiêu đề</th><th>Trạng thái</th><th>Ngày cập nhật</th><th>Biên tập</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td><strong>{item.title}</strong><small>{item.summary || 'Chưa có mô tả ngắn'}</small></td>
                  <td><Badge tone={item.status === 'published' ? 'success' : item.status === 'pending_review' ? 'warning' : 'soft'}>{CONTENT_STATUS[item.status] || item.status}</Badge></td>
                  <td>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <Link to={`/quan-tri/bai-viet/${item._id}/sua`}><FilePenLine size={13} /> Sửa</Link>
                      <Link to={`/quan-tri/bai-viet/${item._id}/docs`}>Docs</Link>
                      {item.status === 'published' ? <Link to={`/tin-tuc/${item.slug}`} target="_blank"><ExternalLink size={13} /> Xem</Link> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Chưa có bài viết phù hợp" />}

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
