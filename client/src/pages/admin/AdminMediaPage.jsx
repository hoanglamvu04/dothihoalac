import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  File,
  HardDrive,
  Image as ImageIcon,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import { LoadingBlock } from '../../components/common/Loading';
import Badge from '../../components/common/Badge';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZE = 24;

function formatBytes(value = 0) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const precision = index > 1 ? 2 : 1;
  return `${(bytes / 1024 ** index).toFixed(precision)} ${units[index]}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function resourceLabel(type) {
  if (type === 'video') return 'Video';
  if (type === 'raw') return 'File';
  return 'Ảnh';
}

function MediaPreview({ item, detail = false }) {
  const src = item?.secureUrl || item?.url || '';

  if (item?.resourceType === 'video' && src) {
    return (
      <video
        src={src}
        muted
        playsInline
        controls={detail}
        preload="metadata"
      />
    );
  }

  if (item?.resourceType === 'image' && src) {
    return <img src={src} alt={item.altText || item.originalFilename || ''} loading="lazy" />;
  }

  return <File size={detail ? 46 : 34} strokeWidth={1.6} />;
}

export default function AdminMediaPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [altMissing, setAltMissing] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [usage, setUsage] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [altText, setAltText] = useState('');
  const [savingAlt, setSavingAlt] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, summary] = await Promise.all([
        adminApi.media({
          page,
          limit: PAGE_SIZE,
          q: appliedQuery || undefined,
          resourceType: resourceType || undefined,
          alt: altMissing ? 'missing' : undefined,
        }),
        adminApi.mediaStats(),
      ]);
      setData(items || { items: [], meta: {} });
      setStats(summary || { total: 0, bytes: 0 });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [altMissing, appliedQuery, page, resourceType, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentItems = data?.items || [];
  const currentMeta = data?.meta || {};
  const totalPages = Math.max(Number(currentMeta.totalPages || 1), 1);
  const pageMissingAlt = useMemo(
    () => currentItems.filter((item) => !String(item.altText || '').trim()).length,
    [currentItems],
  );

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  };

  const openDetail = async (item) => {
    setSelected(item);
    setAltText(item.altText || '');
    setUsage(null);
    setDetailLoading(true);
    try {
      setUsage(await adminApi.mediaUsage(item._id));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setUsage(null);
    setAltText('');
  };

  const saveAlt = async () => {
    if (!selected?._id) return;
    setSavingAlt(true);
    try {
      const updated = await adminApi.updateMediaAlt(selected._id, altText.trim());
      const nextItem = { ...selected, ...(updated || {}), altText: altText.trim() };
      setSelected(nextItem);
      setData((previous) => previous ? {
        ...previous,
        items: (previous.items || []).map((item) => (
          item._id === selected._id ? { ...item, ...nextItem } : item
        )),
      } : previous);
      toast.success('Đã cập nhật ALT cho media.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSavingAlt(false);
    }
  };

  return (
    <div className="admin-media-page">
      <Seo title="Thư viện media" />

      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Asset Management</p>
          <h1>Thư viện media</h1>
          <p>Kiểm soát ảnh, video và file đang được dùng trong nội dung; theo dõi dung lượng và hoàn thiện ALT cho SEO.</p>
        </div>
      </header>

      <section className="admin-media-summary" aria-label="Tổng quan media">
        <article>
          <span className="admin-media-summary__icon"><ImageIcon size={18} /></span>
          <strong>{Number(stats?.total || 0).toLocaleString('vi-VN')}</strong>
          <span>Tài nguyên đang hoạt động</span>
        </article>
        <article>
          <span className="admin-media-summary__icon"><HardDrive size={18} /></span>
          <strong>{formatBytes(stats?.bytes)}</strong>
          <span>Dung lượng media đang lưu</span>
        </article>
        <article>
          <span className="admin-media-summary__icon"><Sparkles size={18} /></span>
          <strong>{pageMissingAlt.toLocaleString('vi-VN')}</strong>
          <span>Thiếu ALT trong trang hiện tại</span>
        </article>
      </section>

      <form className="admin-media-toolbar" onSubmit={submitSearch}>
        <label className="admin-media-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên file hoặc public ID..."
            aria-label="Tìm media"
          />
        </label>

        <select
          value={resourceType}
          onChange={(event) => {
            setResourceType(event.target.value);
            setPage(1);
          }}
          aria-label="Loại media"
        >
          <option value="">Tất cả loại</option>
          <option value="image">Ảnh</option>
          <option value="video">Video</option>
          <option value="raw">File</option>
        </select>

        <label className="admin-media-alt-filter">
          <input
            type="checkbox"
            checked={altMissing}
            onChange={(event) => {
              setAltMissing(event.target.checked);
              setPage(1);
            }}
          />
          Chỉ thiếu ALT
        </label>

        <button type="submit" className="admin-media-toolbar__submit">Tìm kiếm</button>
      </form>

      {loading && !data ? <LoadingBlock /> : null}

      {!loading && !currentItems.length ? (
        <div className="admin-media-empty">Không có media phù hợp với bộ lọc hiện tại.</div>
      ) : null}

      {currentItems.length ? (
        <div className="admin-media-grid">
          {currentItems.map((item) => (
            <article className="admin-media-card" key={item._id}>
              <div className="admin-media-card__preview">
                <MediaPreview item={item} />
                <span className="admin-media-card__type">{resourceLabel(item.resourceType)}</span>
              </div>

              <div className="admin-media-card__body">
                <h3 title={item.originalFilename || item.publicId || 'Media'}>
                  {item.originalFilename || item.publicId || 'Media'}
                </h3>

                <div className="admin-media-card__meta">
                  <span>{item.format ? String(item.format).toUpperCase() : resourceLabel(item.resourceType)}</span>
                  <span>{item.width && item.height ? `${item.width} × ${item.height}` : 'Không có kích thước'}</span>
                  <span>{formatBytes(item.fileSize)}</span>
                </div>

                <div className="admin-media-card__seo">
                  {item.altText ? <Badge tone="success">Có ALT</Badge> : <Badge tone="warning">Thiếu ALT</Badge>}
                  <button type="button" className="admin-media-card__detail" onClick={() => void openDetail(item)}>
                    Chi tiết
                  </button>
                </div>

                <span className="admin-media-card__owner">
                  {item.ownerId?.displayName || item.ownerId?.username || 'Không rõ chủ sở hữu'}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {Number(currentMeta.total || 0) > PAGE_SIZE ? (
        <div className="admin-media-pagination">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(value - 1, 1))}>
            Trước
          </button>
          <span>Trang {page}/{totalPages} · {Number(currentMeta.total || 0).toLocaleString('vi-VN')} tệp</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(value + 1, totalPages))}>
            Sau
          </button>
        </div>
      ) : null}

      {selected ? (
        <>
          <button type="button" className="admin-media-drawer-backdrop" aria-label="Đóng chi tiết media" onClick={closeDetail} />
          <aside className="admin-media-drawer" aria-label="Chi tiết media">
            <header className="admin-media-drawer__header">
              <div>
                <h2>{selected.originalFilename || 'Chi tiết media'}</h2>
                <p>{selected.publicId || selected._id}</p>
              </div>
              <button type="button" className="admin-media-drawer__close" onClick={closeDetail} aria-label="Đóng">
                <X size={18} />
              </button>
            </header>

            <div className="admin-media-drawer__scroll">
              <div className="admin-media-drawer__preview">
                <MediaPreview item={selected} detail />
              </div>

              <div className="admin-media-details">
                <div><span>Loại</span><strong>{resourceLabel(selected.resourceType)}</strong></div>
                <div><span>Định dạng</span><strong>{selected.format?.toUpperCase() || '—'}</strong></div>
                <div><span>Kích thước</span><strong>{selected.width && selected.height ? `${selected.width} × ${selected.height}` : '—'}</strong></div>
                <div><span>Dung lượng</span><strong>{formatBytes(selected.fileSize)}</strong></div>
                <div><span>Ngày tải</span><strong>{formatDate(selected.createdAt)}</strong></div>
                <div><span>Trạng thái</span><strong>{selected.status || 'active'}</strong></div>
              </div>

              <section className="admin-media-usage">
                <h3>Đang được sử dụng</h3>
                {detailLoading ? <LoadingBlock /> : (
                  <div className="admin-media-usage__chips">
                    <span className={usage?.usedAsThumbnail ? 'is-used' : ''}>Ảnh đại diện</span>
                    <span className={usage?.usedInline ? 'is-used' : ''}>Trong nội dung</span>
                    <span className={usage?.usedInComment ? 'is-used' : ''}>Trong bình luận</span>
                    <span className={usage?.inUse ? 'is-used' : ''}>{usage?.inUse ? 'Đang được tham chiếu' : 'Chưa có tham chiếu'}</span>
                  </div>
                )}
              </section>

              <section className="admin-media-alt-editor">
                <h3>ALT & khả năng truy cập</h3>
                <label htmlFor="admin-media-alt">Mô tả hình ảnh</label>
                <textarea
                  id="admin-media-alt"
                  value={altText}
                  onChange={(event) => setAltText(event.target.value.slice(0, 300))}
                  maxLength={300}
                  placeholder="Mô tả ngắn gọn nội dung hình ảnh..."
                />
                <div className="admin-media-alt-editor__footer">
                  <small>{altText.length}/300 ký tự</small>
                  <button type="button" disabled={savingAlt} onClick={() => void saveAlt()}>
                    {savingAlt ? 'Đang lưu...' : 'Lưu ALT'}
                  </button>
                </div>
              </section>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
