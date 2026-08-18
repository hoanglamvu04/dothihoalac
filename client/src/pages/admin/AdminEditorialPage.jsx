import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Clock3,
  ExternalLink,
  Eye,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Pagination from '../../components/common/Pagination';
import { LoadingBlock } from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { contentPath } from '../../utils/content';
import { formatDateTime } from '../../utils/formatters';
import { mediaUrl } from '../../utils/media';

import './AdminEditorialPage.css';

const PAGE_SIZE = 16;

const AUTO_BLOCKS = [
  ['Mới nhất', 'Tự động theo thời gian xuất bản', Clock3],
  ['Đọc nhiều', 'Tự động theo lượt xem', TrendingUp],
  ['Thông tin cần biết', 'Lấy từ Chính sách và Hành chính', Newspaper],
  ['BĐS mới · Việc làm mới', 'Tự động từ hai khu nội dung', RefreshCw],
];

function idOf(item) {
  return String(item?._id || item?.id || '');
}

export default function AdminEditorialPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    adminApi
      .articles({
        page,
        limit: PAGE_SIZE,
        status: 'published',
        q: appliedQuery || undefined,
      })
      .then((result) => {
        if (!active) return;
        setItems(result.items || []);
        setMeta(result.meta || {});
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
  }, [appliedQuery, page, reloadKey, toast]);

  const featuredCountOnPage = useMemo(
    () => items.filter((item) => item.isFeatured).length,
    [items],
  );

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  };

  const toggleFeatured = async (item) => {
    const id = idOf(item);
    if (!id || savingId) return;

    const nextValue = !item.isFeatured;
    setSavingId(id);

    try {
      const updated = await adminApi.updateArticleMetadata(id, {
        isFeatured: nextValue,
        changeNote: nextValue
          ? 'Đưa vào Đáng chú ý hôm nay'
          : 'Bỏ khỏi Đáng chú ý hôm nay',
      });

      setItems((current) =>
        current.map((currentItem) =>
          idOf(currentItem) === id
            ? { ...currentItem, ...updated, isFeatured: nextValue }
            : currentItem,
        ),
      );

      toast.success(
        nextValue
          ? 'Đã đưa bài vào Đáng chú ý hôm nay.'
          : 'Đã bỏ bài khỏi Đáng chú ý hôm nay.',
      );
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="admin-editorial-page">
      <Seo title="Biên tập nổi bật" />

      <header className="admin-page-head admin-editorial-head">
        <div>
          <p className="admin-kicker">Editorial Desk</p>
          <h1>Biên tập nổi bật</h1>
          <p>
            Chỉ cần chọn các bài thật sự cần ưu tiên. Hòa Lạc 24H tự tổng hợp phần còn lại từ tin mới, lượt đọc, chính sách, bất động sản, việc làm và cộng đồng.
          </p>
        </div>
        <div className="admin-row-actions">
          <Link
            className="admin-secondary"
            to="/tin-tuc"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} />
            Xem trang Tin tức
          </Link>
          <Link className="admin-primary" to="/quan-tri/bai-viet/moi">
            <Newspaper size={15} />
            Viết bài mới
          </Link>
        </div>
      </header>

      <section className="admin-editorial-overview" aria-label="Cấu trúc Hòa Lạc 24H">
        <article className="admin-editorial-overview__featured">
          <span><Sparkles size={18} /> Biên tập thủ công</span>
          <strong>Đáng chú ý hôm nay</strong>
          <p>
            Các bài có dấu sao sẽ được ưu tiên trong Hòa Lạc 24H. Nên giữ khoảng 3–5 bài thực sự quan trọng và bỏ ghim khi tin không còn mới.
          </p>
        </article>

        <div className="admin-editorial-overview__auto">
          {AUTO_BLOCKS.map(([label, description, Icon]) => (
            <div key={label}>
              <Icon size={17} />
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <Check size={15} aria-label="Tự động" />
            </div>
          ))}
        </div>
      </section>

      <section className="admin-editorial-list-shell">
        <header className="admin-editorial-toolbar">
          <div>
            <span className="admin-editorial-count">
              <Star size={15} />
              {featuredCountOnPage} bài đáng chú ý trên trang này
            </span>
            <small>Chỉ hiển thị các bài đã xuất bản.</small>
          </div>

          <form onSubmit={submitSearch} role="search">
            <Search size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm bài theo tiêu đề..."
              aria-label="Tìm bài viết đã xuất bản"
            />
            <button type="submit">Tìm</button>
          </form>

          <button
            type="button"
            className="admin-editorial-refresh"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
        </header>

        {loading ? (
          <LoadingBlock />
        ) : items.length ? (
          <div className="admin-editorial-list">
            {items.map((item) => {
              const id = idOf(item);
              const image = mediaUrl(item?.thumbnailMediaId);
              const categoryName = item?.primaryCategoryId?.name || 'Tin tức';
              const publicPath = contentPath(item);

              return (
                <article
                  className={item.isFeatured ? 'admin-editorial-item is-featured' : 'admin-editorial-item'}
                  key={id}
                >
                  <div className="admin-editorial-item__thumb">
                    {image ? (
                      <img src={image} alt="" loading="lazy" />
                    ) : (
                      <Newspaper size={24} aria-hidden="true" />
                    )}
                  </div>

                  <div className="admin-editorial-item__copy">
                    <div className="admin-editorial-item__meta">
                      <span>{categoryName}</span>
                      <span><Eye size={13} /> {Number(item.viewCount || 0).toLocaleString('vi-VN')} lượt xem</span>
                      <span>{formatDateTime(item.publishedAt || item.updatedAt)}</span>
                    </div>
                    <h2>{item.title}</h2>
                    {item.summary ? <p>{item.summary}</p> : null}
                  </div>

                  <div className="admin-editorial-item__actions">
                    <button
                      type="button"
                      className={item.isFeatured ? 'is-active' : ''}
                      onClick={() => toggleFeatured(item)}
                      disabled={savingId === id}
                    >
                      <Star size={17} fill={item.isFeatured ? 'currentColor' : 'none'} />
                      {savingId === id
                        ? 'Đang lưu...'
                        : item.isFeatured
                          ? 'Đang đáng chú ý'
                          : 'Đặt đáng chú ý'}
                    </button>
                    {publicPath !== '#' ? (
                      <Link to={publicPath} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={15} /> Xem bài
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Không có bài phù hợp"
            description="Thử từ khóa khác hoặc xuất bản bài mới trước khi biên tập nổi bật."
          />
        )}

        <div className="admin-editorial-pagination">
          <Pagination
            meta={meta}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </section>
    </div>
  );
}
