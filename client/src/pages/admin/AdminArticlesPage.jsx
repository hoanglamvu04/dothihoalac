import { useEffect, useState } from 'react';
import { ExternalLink, FilePenLine, FilePlus2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
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

const STATUS_TABS = [
  ['', 'Tất cả'],
  ['draft', 'Nháp'],
  ['pending_review', 'Chờ duyệt'],
  ['approved', 'Đã duyệt'],
  ['scheduled', 'Lên lịch'],
  ['published', 'Đã xuất bản'],
];

function thumbnailUrl(item) {
  const media = item?.thumbnailMediaId;
  if (!media || typeof media === 'string') return '';
  return media.secureUrl || media.url || '';
}

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
    let active = true;
    setLoading(true);
    adminApi
      .articles({
        page,
        limit: 20,
        status: status || undefined,
        q: appliedQuery || undefined,
      })
      .then((result) => {
        if (!active) return;
        setItems(result.items || []);
        setMeta(result.meta || {});
      })
      .catch((error) => active && toast.error(apiErrorMessage(error)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [appliedQuery, page, status, toast]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  };

  return (
    <section>
      <Seo title="Trung tâm biên tập" />

      <div className="admin-articles-hero">
        <div>
          <small>DTHL Content Studio</small>
          <h1>Tin tức được quản lý như một newsroom thực sự.</h1>
          <p>
            Viết, lưu nháp, gửi duyệt, lên lịch, xuất bản và liên kết Google Docs trong cùng một luồng. Mỗi bài có lịch sử nội dung, taxonomy, media và trạng thái biên tập riêng.
          </p>
        </div>
        <div className="admin-articles-actions">
          <Link className="admin-action-secondary" to="/quan-tri/google-workspace">
            <ExternalLink size={14} /> Google Workspace
          </Link>
          <Link className="admin-action-primary" to="/quan-tri/bai-viet/moi">
            <FilePlus2 size={15} /> Tạo bài mới
          </Link>
        </div>
      </div>

      <div className="admin-content-toolbar">
        <div className="admin-content-tabs" role="tablist" aria-label="Lọc bài viết theo trạng thái">
          {STATUS_TABS.map(([value, label]) => (
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

        <form onSubmit={submitSearch} style={{ display: 'flex', gap: 7 }}>
          <input
            className="admin-content-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tiêu đề, mô tả…"
            aria-label="Tìm bài viết"
          />
          <button className="admin-action-secondary" type="submit" aria-label="Tìm kiếm">
            <Search size={14} />
          </button>
        </form>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Bài viết</th>
                <th>Trạng thái</th>
                <th>Google Docs</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const docUrl = item?.article?.googleDocUrl || '';
                const docLinked = Boolean(item?.article?.googleDocId);
                const image = thumbnailUrl(item);
                return (
                  <tr key={item._id}>
                    <td>
                      <div className="admin-article-row-title">
                        <span className="admin-article-thumb">
                          {image ? <img src={image} alt="" loading="lazy" /> : null}
                        </span>
                        <span className="admin-article-row-copy">
                          <strong>{item.title}</strong>
                          <small>{item.summary || 'Chưa có mô tả ngắn.'}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge tone="soft">{CONTENT_STATUS[item.status] || item.status}</Badge>
                    </td>
                    <td>
                      {docLinked ? (
                        <a
                          className="admin-doc-state is-linked"
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={item?.article?.googleDocFileName || 'Mở Google Docs'}
                        >
                          Docs · đã liên kết
                        </a>
                      ) : (
                        <span className="admin-doc-state">Chưa liên kết</span>
                      )}
                    </td>
                    <td>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        <Link className="admin-action-secondary" to={`/quan-tri/bai-viet/${item._id}`}>
                          <FilePenLine size={13} /> Sửa
                        </Link>
                        {item.status === 'published' ? (
                          <Link className="admin-action-secondary" to={`/tin-tuc/${item.slug}`} target="_blank">
                            Xem bài
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={appliedQuery ? 'Không tìm thấy bài phù hợp' : 'Chưa có bài viết'}
          description="Tạo bài đầu tiên hoặc đổi bộ lọc để tiếp tục."
        />
      )}

      <Pagination meta={meta} onPageChange={setPage} />
    </section>
  );
}
