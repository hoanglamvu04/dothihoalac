import { useEffect, useState } from 'react';
import Seo from '../../components/common/Seo';
import { LoadingBlock } from '../../components/common/Loading';
import Badge from '../../components/common/Badge';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

function formatBytes(value = 0) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

export default function AdminMediaPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [altMissing, setAltMissing] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const [items, summary] = await Promise.all([
        adminApi.media({
          q: query || undefined,
          resourceType: resourceType || undefined,
          alt: altMissing ? 'missing' : undefined,
        }),
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
          <p>Trung tâm quản lý ảnh, file Cloudinary và tài nguyên dùng trong hệ thống.</p>
        </div>
      </header>

      <section className="admin-access-summary">
        <div><strong>{stats?.total || 0}</strong><span>Tổng file</span></div>
        <div><strong>{formatBytes(stats?.bytes)}</strong><span>Dung lượng</span></div>
        <div><strong>{data?.items?.filter((item) => !item.altText).length || 0}</strong><span>Thiếu ALT</span></div>
      </section>

      <div className="admin-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên file hoặc public id..." />
        <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
          <option value="">Tất cả loại</option>
          <option value="image">Ảnh</option>
          <option value="video">Video</option>
          <option value="raw">File</option>
        </select>
        <label>
          <input type="checkbox" checked={altMissing} onChange={(e) => setAltMissing(e.target.checked)} /> Thiếu ALT
        </label>
        <button type="button" onClick={load}>Tìm</button>
      </div>

      {!data ? <LoadingBlock /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Preview</th><th>File</th><th>Kích thước</th><th>SEO</th><th>Owner</th><th></th></tr>
            </thead>
            <tbody>
              {(data.items || []).map((item) => (
                <tr key={item._id}>
                  <td><img src={item.secureUrl} alt={item.altText || ''} width="90" loading="lazy" /></td>
                  <td>{item.originalFilename}<br /><small>{item.format}</small></td>
                  <td>{item.width}x{item.height}<br />{formatBytes(item.fileSize)}</td>
                  <td>{item.altText ? <Badge tone="success">Có ALT</Badge> : <Badge tone="warning">Thiếu ALT</Badge>}</td>
                  <td>{item.ownerId?.displayName || '-'}</td>
                  <td><button type="button" onClick={() => setSelected(item)}>Chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div className="admin-modal-panel">
          <h3>{selected.originalFilename}</h3>
          <img src={selected.secureUrl} alt={selected.altText || ''} width="300" />
          <p>Cloudinary ID: {selected.publicId}</p>
          <button type="button" onClick={() => setSelected(null)}>Đóng</button>
        </div>
      ) : null}
    </div>
  );
}
