import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

export default function AdminJobsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.moderationQueue({ page, limit: 20, type: 'job' })
      .then((result) => {
        setItems(result.items);
        setMeta(result.meta);
      })
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page]);

  const moderate = async (item, action, publishNow = false) => {
    try {
      await adminApi.moderate(item._id, action, {
        publishNow,
        reasonCode: action,
        note: action === 'approve' ? 'Tin việc làm đã được kiểm duyệt.' : 'Tin việc làm cần chỉnh sửa trước khi hiển thị.',
      });
      toast.success('Đã cập nhật tin việc làm.');
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div>
      <Seo title="Quản lý việc làm" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Nội dung cộng đồng</p>
          <h1>Việc làm</h1>
          <p>Duyệt tin tuyển dụng đang chờ xử lý. Tin đã xuất bản tiếp tục được quản lý qua trạng thái nội dung chung.</p>
        </div>
        <a className="admin-secondary" href="/viec-lam" target="_blank" rel="noreferrer">Xem trang việc làm <ExternalLink size={14} /></a>
      </header>

      {loading ? <LoadingBlock /> : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Tiêu đề</th><th>Người đăng</th><th>Trạng thái</th><th>Ngày gửi</th><th /></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td><strong>{item.title}</strong><small>{item.summary || 'Không có mô tả ngắn'}</small></td>
                  <td>{item.authorId?.displayName || item.authorId?.username || 'Thành viên'}</td>
                  <td><Badge tone="warning">Chờ duyệt</Badge></td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => moderate(item, 'approve', true)}>Duyệt & đăng</button>
                      <button type="button" onClick={() => moderate(item, 'request_revision')}>Yêu cầu sửa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Không có tin việc làm chờ duyệt" />}
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
