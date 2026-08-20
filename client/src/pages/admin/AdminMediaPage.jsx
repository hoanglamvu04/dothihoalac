import { useEffect, useState } from 'react';
import Seo from '../../components/common/Seo';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function AdminMediaPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');

  const load = async () => {
    try {
      const [items, summary] = await Promise.all([
        adminApi.media({ q: query }),
        adminApi.mediaStats(),
      ]);
      setData(items);
      setStats(summary);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div>
      <Seo title="Media Library" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Asset Management</p>
          <h1>Media Library</h1>
          <p>Quản lý ảnh và tài nguyên Cloudinary trong toàn hệ thống.</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm file..." />
        <button type="button" onClick={load}>Tìm</button>
      </div>

      {stats ? <p>Tổng file: {stats.total} · Dung lượng: {stats.bytes} bytes</p> : null}

      {!data ? <LoadingBlock /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Ảnh</th><th>Tên file</th><th>Alt</th><th>Owner</th></tr></thead>
            <tbody>
              {(data.items || []).map((item) => (
                <tr key={item._id}>
                  <td><img src={item.secureUrl} alt={item.altText || ''} width="80" /></td>
                  <td>{item.originalFilename}</td>
                  <td>{item.altText || 'Thiếu alt'}</td>
                  <td>{item.ownerId?.displayName || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
