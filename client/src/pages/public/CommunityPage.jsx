import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ImagePlus,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tags,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Avatar from '../../components/common/Avatar';
import CommunityCard from '../../components/content/CommunityCard';
import ContentImage from '../../components/content/ContentImage';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';

import { communityApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useAuth } from '../../context/AuthContext';
import { COMMUNITY_TYPES } from '../../utils/constants';
import { contentPath } from '../../utils/content';

import './CommunityPageSocial.css';

const FEED_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'popular', label: 'Đang hot', sort: 'popular' },
  { key: 'question', label: COMMUNITY_TYPES.question, type: 'question' },
  { key: 'report', label: COMMUNITY_TYPES.report, type: 'report' },
  { key: 'sharing', label: COMMUNITY_TYPES.sharing, type: 'sharing' },
  { key: 'review', label: COMMUNITY_TYPES.review, type: 'review' },
  { key: 'marketplace', label: COMMUNITY_TYPES.marketplace, type: 'marketplace' },
];

const COMMUNITY_RULES = [
  'Thông tin chính xác, có nguồn gốc rõ ràng',
  'Tôn trọng, văn minh, lịch sự',
  'Không spam, quảng cáo, lừa đảo',
  'Bảo vệ thông tin cá nhân',
];

const POPULAR_PARAMS = {
  sort: 'popular',
  limit: 5,
};

function getTotal(meta, itemCount) {
  return Number(
    meta?.total ??
      meta?.totalItems ??
      meta?.itemCount ??
      itemCount ??
      0,
  );
}

function getCurrentPage(meta, searchParams) {
  return Number(
    meta?.page ??
      meta?.currentPage ??
      searchParams.get('page') ??
      1,
  );
}

function getPageSize(meta, itemCount) {
  return Number(
    meta?.limit ??
      meta?.pageSize ??
      meta?.perPage ??
      itemCount ??
      0,
  );
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const result = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];

    if (previous && page - previous > 1) {
      result.push(`ellipsis-${previous}`);
    }

    result.push(page);
  });

  return result;
}

function taxonomyCount(item) {
  const value =
    item?.postCount ??
    item?.contentCount ??
    item?.publishedCount ??
    item?.count ??
    null;

  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function taxonomyUrlValue(item) {
  return String(item?.slug || item?._id || item?.id || '');
}

function popularMedia(item) {
  return item?.thumbnailMediaId || item?.body?.inlineMediaIds?.[0] || null;
}

function CommunityPagination({
  page,
  totalPages,
  total,
  fromItem,
  toItem,
  onChange,
}) {
  if (totalPages <= 1) return null;

  const items = getPaginationItems(page, totalPages);

  return (
    <div className="community-social-pagination">
      <nav
        className="community-social-pagination__nav"
        aria-label="Phân trang cộng đồng"
      >
        <button
          type="button"
          className="community-social-pagination__direction"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={17} />
          <span>Trước</span>
        </button>

        <div className="community-social-pagination__numbers">
          {items.map((item) =>
            typeof item === 'string' ? (
              <span className="community-social-pagination__ellipsis" key={item}>
                …
              </span>
            ) : (
              <button
                type="button"
                key={item}
                className={item === page ? 'is-active' : ''}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <span className="community-social-pagination__mobile-status">
          Trang {page}/{totalPages}
        </span>

        <button
          type="button"
          className="community-social-pagination__direction"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <span>Sau</span>
          <ChevronRight size={17} />
        </button>
      </nav>

      <p className="community-social-pagination__meta">
        {fromItem}–{toItem} trong {total.toLocaleString('vi-VN')} bài
      </p>
    </div>
  );
}

function DiscoveryRail({
  areas,
  categories,
  currentArea,
  currentCategory,
  onAreaChange,
  onCategoryChange,
  onOpenFilters,
}) {
  const visibleAreas = areas.slice(0, 6);
  const visibleCategories = categories.slice(0, 6);

  return (
    <aside className="community-reference-left" aria-label="Khám phá cộng đồng">
      <section className="community-reference-card community-discovery-card">
        <h2>Khám phá cộng đồng</h2>

        <div className="community-discovery-section">
          <h3>Khu vực</h3>
          <div className="community-discovery-list">
            {visibleAreas.map((item) => {
              const active =
                String(currentArea) === String(item._id) ||
                String(currentArea) === String(item.slug);
              const count = taxonomyCount(item);

              return (
                <button
                  type="button"
                  key={item._id || item.slug}
                  className={active ? 'is-active' : ''}
                  onClick={() =>
                    onAreaChange(active ? '' : taxonomyUrlValue(item))
                  }
                >
                  <span className="community-discovery-list__icon">
                    <MapPin size={15} />
                  </span>
                  <span className="community-discovery-list__copy">
                    <strong>{item.name}</strong>
                    {count !== null ? (
                      <small>{count.toLocaleString('vi-VN')} bài viết</small>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          {areas.length > visibleAreas.length ? (
            <button
              type="button"
              className="community-discovery-more"
              onClick={onOpenFilters}
            >
              <span>Xem tất cả khu vực</span>
              <ArrowRight size={14} />
            </button>
          ) : null}
        </div>

        {visibleCategories.length ? (
          <div className="community-discovery-section community-discovery-section--topics">
            <h3>Chủ đề phổ biến</h3>
            <div className="community-discovery-list community-discovery-list--topics">
              {visibleCategories.map((item, index) => {
                const active =
                  String(currentCategory) === String(item._id) ||
                  String(currentCategory) === String(item.slug);
                const count = taxonomyCount(item);

                return (
                  <button
                    type="button"
                    key={item._id || item.slug}
                    className={active ? 'is-active' : ''}
                    onClick={() =>
                      onCategoryChange(
                        active ? '' : taxonomyUrlValue(item),
                      )
                    }
                  >
                    <span
                      className={`community-discovery-list__topic-dot community-discovery-list__topic-dot--${
                        (index % 5) + 1
                      }`}
                    >
                      <MessageCircle size={14} />
                    </span>
                    <span className="community-discovery-list__copy">
                      <strong>{item.name}</strong>
                      {count !== null ? (
                        <small>{count.toLocaleString('vi-VN')} bài viết</small>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {categories.length > visibleCategories.length ? (
              <button
                type="button"
                className="community-discovery-more"
                onClick={onOpenFilters}
              >
                <span>Xem tất cả chủ đề</span>
                <ArrowRight size={14} />
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </aside>
  );
}

function PopularRail({ items, loading }) {
  return (
    <aside className="community-reference-right" aria-label="Thông tin cộng đồng">
      <section className="community-reference-card community-popular-card">
        <h2>Đang được quan tâm</h2>

        {loading && !items.length ? (
          <div className="community-popular-loading">Đang tải...</div>
        ) : (
          <div className="community-popular-list">
            {items.slice(0, 5).map((item) => {
              const media = popularMedia(item);
              const comments = Number(item.commentCount || 0);
              const type =
                COMMUNITY_TYPES[item.community?.postType] || 'Cộng đồng';

              return (
                <Link
                  className="community-popular-item"
                  key={item._id}
                  to={contentPath(item)}
                >
                  <span className="community-popular-item__media">
                    {media ? (
                      <ContentImage
                        media={media}
                        alt={item.title || 'Bài viết cộng đồng'}
                      />
                    ) : (
                      <MessageCircle size={19} />
                    )}
                  </span>

                  <span className="community-popular-item__copy">
                    <strong>{item.title || item.summary || 'Bài viết cộng đồng'}</strong>
                    <small>
                      {type}
                      {comments > 0
                        ? ` · ${comments.toLocaleString('vi-VN')} bình luận`
                        : ''}
                    </small>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="community-reference-card community-join-card">
        <h2>Tham gia cộng đồng</h2>
        <p>Chia sẻ, hỏi đáp, kết nối với cộng đồng Hòa Lạc.</p>
        <div className="community-join-card__actions">
          <Link to="/dang-bai/cong-dong">
            <Plus size={16} />
            Viết bài
          </Link>
          <Link to="/dang-bai/cong-dong?type=report">
            <MessageCircle size={16} />
            Gửi phản ánh
          </Link>
        </div>
      </section>

      <section className="community-reference-card community-rules-card">
        <h2>Nguyên tắc cộng đồng</h2>
        <ul>
          {COMMUNITY_RULES.map((rule) => (
            <li key={rule}>
              <CheckCircle2 size={15} />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
        <Link to="/quy-dinh-dang-bai">
          <span>Xem chi tiết quy tắc</span>
          <ArrowRight size={14} />
        </Link>
      </section>
    </aside>
  );
}

export default function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categoriesFor, areas = [] } = useTaxonomy();
  const { user, isAuthenticated } = useAuth();

  const resultsRef = useRef(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const communityCategories = useMemo(
    () => categoriesFor('community') || [],
    [categoriesFor],
  );

  const searchKey = searchParams.toString();

  const params = useMemo(() => {
    const source = new URLSearchParams(searchKey);
    const nextParams = {};

    ['type', 'category', 'area', 'sort', 'q', 'page'].forEach((key) => {
      const value = source.get(key);
      if (value) nextParams[key] = value;
    });

    return nextParams;
  }, [searchKey]);

  const result = useListPage(communityApi.list, params);
  const popularResult = useListPage(communityApi.list, POPULAR_PARAMS);

  const currentType = searchParams.get('type') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentArea = searchParams.get('area') || '';
  const currentSort = searchParams.get('sort') || '';
  const currentQuery = searchParams.get('q') || '';

  const selectedCategory = useMemo(
    () =>
      communityCategories.find(
        (item) =>
          String(item._id) === String(currentCategory) ||
          String(item.slug) === String(currentCategory),
      ),
    [communityCategories, currentCategory],
  );

  const selectedArea = useMemo(
    () =>
      areas.find(
        (item) =>
          String(item._id) === String(currentArea) ||
          String(item.slug) === String(currentArea),
      ),
    [areas, currentArea],
  );

  useEffect(() => {
    const categorySlug = String(selectedCategory?.slug || '');
    const areaSlug = String(selectedArea?.slug || '');
    const replaceCategory =
      Boolean(currentCategory && categorySlug) &&
      currentCategory !== categorySlug;
    const replaceArea =
      Boolean(currentArea && areaSlug) &&
      currentArea !== areaSlug;

    if (!replaceCategory && !replaceArea) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);

        if (replaceCategory) {
          next.set('category', categorySlug);
        }

        if (replaceArea) {
          next.set('area', areaSlug);
        }

        return next;
      },
      { replace: true },
    );
  }, [
    currentArea,
    currentCategory,
    selectedArea?.slug,
    selectedCategory?.slug,
    setSearchParams,
  ]);

  const setUrlParams = useCallback(
    (mutator, options = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutator(next);

          if (next.get('page') === '1') next.delete('page');
          return next;
        },
        options,
      );
    },
    [setSearchParams],
  );

  const update = useCallback(
    (key, value, options = {}) => {
      setUrlParams(
        (next) => {
          if (value) next.set(key, value);
          else next.delete(key);
          next.delete('page');
        },
        options,
      );
    },
    [setUrlParams],
  );

  const selectFeedTab = useCallback(
    (tab) => {
      setUrlParams((next) => {
        next.delete('page');
        next.delete('type');
        next.delete('sort');

        if (tab.type) next.set('type', tab.type);
        if (tab.sort) next.set('sort', tab.sort);
      });
    },
    [setUrlParams],
  );

  const commitSearch = useCallback(
    (value, replace = false) => {
      update('q', String(value || '').trim(), { replace });
    },
    [update],
  );

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    const previousOverflow = document.body.style.overflow;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [filtersOpen]);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');

    setUrlParams((next) => {
      ['type', 'category', 'area', 'sort', 'q', 'page'].forEach((key) =>
        next.delete(key),
      );
    });
  }, [setUrlParams]);

  const setPage = useCallback(
    (page) => {
      setUrlParams((next) => {
        if (Number(page) <= 1) next.delete('page');
        else next.set('page', String(page));
      });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 40);
    },
    [setUrlParams],
  );

  const activeFilterCount =
    (currentType ? 1 : 0) +
    (currentCategory ? 1 : 0) +
    (currentArea ? 1 : 0) +
    (currentQuery ? 1 : 0) +
    (currentSort === 'popular' ? 1 : 0);

  const hasFilters = activeFilterCount > 0;
  const total = getTotal(result.meta, result.items.length);
  const currentPage = getCurrentPage(result.meta, searchParams);
  const pageSize = getPageSize(result.meta, result.items.length);
  const totalPages = Math.max(
    1,
    Number(
      result.meta?.totalPages ||
        (pageSize > 0 ? Math.ceil(total / pageSize) : 1),
    ),
  );

  const fromItem =
    total > 0
      ? (currentPage - 1) * Math.max(pageSize, 1) + 1
      : 0;
  const toItem =
    total > 0
      ? Math.min(fromItem + result.items.length - 1, total)
      : 0;

  const composerName =
    user?.displayName ||
    user?.profile?.displayName ||
    user?.username ||
    'Bạn';

  const composerAvatar =
    user?.profile?.avatarMediaId || user?.avatarMediaId || null;

  const popularItems = popularResult.items.length
    ? popularResult.items
    : result.items.slice(0, 5);

  return (
    <section className="community-social-page">
      <Seo
        title="Cộng đồng Hòa Lạc"
        description="Thảo luận, hỏi đáp, phản ánh và chia sẻ từ cộng đồng Hòa Lạc."
      />

      <div className="community-social-page__container">
        <h1 className="community-reference-sr-only">Cộng đồng Hòa Lạc</h1>

        <div className="community-reference-layout">
          <DiscoveryRail
            areas={areas}
            categories={communityCategories}
            currentArea={currentArea}
            currentCategory={currentCategory}
            onAreaChange={(value) => update('area', value)}
            onCategoryChange={(value) => update('category', value)}
            onOpenFilters={() => setFiltersOpen(true)}
          />

          <div className="community-reference-center">
            <section className="community-reference-composer" aria-label="Tạo bài viết cộng đồng">
              <Link
                className="community-reference-composer__top"
                to="/dang-bai/cong-dong"
              >
                <Avatar
                  src={composerAvatar}
                  name={composerName}
                  size="md"
                />
                <span className="community-reference-composer__prompt">
                  {isAuthenticated ? 'Có gì mới?' : 'Đăng nhập để chia sẻ với cộng đồng'}
                </span>
              </Link>

              <div className="community-reference-composer__actions">
                <Link to="/dang-bai/cong-dong">
                  <ImagePlus size={16} />
                  <span>Ảnh / Video</span>
                </Link>
                <Link to="/dang-bai/cong-dong">
                  <BarChart3 size={16} />
                  <span>Thăm dò ý kiến</span>
                </Link>
                <Link to="/dang-bai/cong-dong">
                  <MapPin size={16} />
                  <span>Gắn địa điểm</span>
                </Link>
                <Link to="/dang-bai/cong-dong">
                  <MoreHorizontal size={16} />
                  <span>Khác</span>
                </Link>
                <Link
                  className="community-reference-composer__submit"
                  to="/dang-bai/cong-dong"
                >
                  Đăng
                </Link>
              </div>
            </section>

            <section className="community-reference-feed-tabs" aria-label="Lọc bảng tin">
              <nav>
                {FEED_TABS.map((tab) => {
                  const active = tab.sort
                    ? currentSort === tab.sort && !currentType
                    : tab.type
                      ? currentType === tab.type
                      : !currentType && currentSort !== 'popular';

                  return (
                    <button
                      type="button"
                      key={tab.key}
                      className={active ? 'is-active' : ''}
                      onClick={() => selectFeedTab(tab)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              <button
                type="button"
                className="community-reference-filter-trigger"
                aria-label="Mở bộ lọc cộng đồng"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={16} />
                {activeFilterCount ? <strong>{activeFilterCount}</strong> : null}
              </button>
            </section>

            {hasFilters ? (
              <div className="community-reference-active-filters">
                {currentCategory ? (
                  <button type="button" onClick={() => update('category', '')}>
                    {selectedCategory?.name || 'Chủ đề'}
                    <X size={13} />
                  </button>
                ) : null}
                {currentArea ? (
                  <button type="button" onClick={() => update('area', '')}>
                    {selectedArea?.name || 'Khu vực'}
                    <X size={13} />
                  </button>
                ) : null}
                {currentQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      commitSearch('');
                    }}
                  >
                    “{currentQuery}”
                    <X size={13} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="community-reference-active-filters__clear"
                  onClick={clearAllFilters}
                >
                  <RotateCcw size={13} />
                  Đặt lại
                </button>
              </div>
            ) : null}

            <main
              id="community-feed"
              ref={resultsRef}
              className="community-social-feed"
            >
              {result.loading ? (
                <LoadingBlock />
              ) : result.error ? (
                <ErrorState error={result.error} onRetry={result.reload} />
              ) : result.items.length ? (
                <div className="community-social-feed-list">
                  {result.items.map((item) => (
                    <div className="community-social-feed-item" key={item._id}>
                      <CommunityCard item={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="community-social-empty">
                  <span><MessageCircle size={28} /></span>
                  <h3>Chưa có bài viết phù hợp</h3>
                  <p>
                    {hasFilters
                      ? 'Thử bỏ bớt bộ lọc hoặc sử dụng từ khóa khác.'
                      : 'Hãy là người đầu tiên chia sẻ một câu chuyện với cộng đồng Hòa Lạc.'}
                  </p>
                  {hasFilters ? (
                    <button type="button" onClick={clearAllFilters}>
                      <RotateCcw size={16} />
                      Xóa bộ lọc
                    </button>
                  ) : (
                    <Link to="/dang-bai/cong-dong">
                      <Plus size={16} />
                      Viết bài
                    </Link>
                  )}
                </div>
              )}
            </main>

            {!result.loading && !result.error && result.items.length ? (
              <CommunityPagination
                page={currentPage}
                totalPages={totalPages}
                total={total}
                fromItem={fromItem}
                toItem={toItem}
                onChange={setPage}
              />
            ) : null}
          </div>

          <PopularRail items={popularItems} loading={popularResult.loading} />
        </div>

        {filtersOpen ? (
          <>
            <button
              type="button"
              className="community-social-filter-overlay"
              aria-label="Đóng bộ lọc"
              onClick={() => setFiltersOpen(false)}
            />

            <aside
              className="community-social-filter-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Tìm và lọc bài cộng đồng"
            >
              <header className="community-social-filter-drawer__header">
                <div>
                  <span className="community-social-filter-drawer__icon">
                    <Filter size={18} />
                  </span>
                  <div>
                    <h2>Tìm & lọc</h2>
                    <p>Thu hẹp bảng tin theo nhu cầu của bạn.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="community-social-filter-drawer__close"
                  aria-label="Đóng bộ lọc"
                  onClick={() => setFiltersOpen(false)}
                >
                  <X size={20} />
                </button>
              </header>

              <form
                className="community-social-filter-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  commitSearch(searchInput);
                }}
              >
                <Search size={17} />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Tìm bài viết, câu hỏi, phản ánh..."
                  aria-label="Tìm trong cộng đồng"
                />
                <button type="submit">Tìm</button>
              </form>

              <div className="community-social-filter-fields">
                <label className="community-social-filter-field">
                  <span>Loại bài</span>
                  <div>
                    <MessageCircle size={17} />
                    <select
                      value={currentType}
                      onChange={(event) => update('type', event.target.value)}
                    >
                      <option value="">Mọi loại bài</option>
                      {Object.entries(COMMUNITY_TYPES).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="community-social-filter-field">
                  <span>Chủ đề</span>
                  <div>
                    <Tags size={17} />
                    <select
                      value={currentCategory}
                      onChange={(event) => update('category', event.target.value)}
                    >
                      <option value="">Mọi chủ đề</option>
                      {communityCategories.map((item) => (
                        <option
                          key={item._id || item.slug}
                          value={taxonomyUrlValue(item)}
                        >
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="community-social-filter-field">
                  <span>Khu vực</span>
                  <div>
                    <MapPin size={17} />
                    <select
                      value={currentArea}
                      onChange={(event) => update('area', event.target.value)}
                    >
                      <option value="">Mọi khu vực</option>
                      {areas.map((item) => (
                        <option
                          key={item._id || item.slug}
                          value={taxonomyUrlValue(item)}
                        >
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="community-social-filter-field">
                  <span>Sắp xếp</span>
                  <div>
                    <TrendingUp size={17} />
                    <select
                      value={currentSort}
                      onChange={(event) => update('sort', event.target.value)}
                    >
                      <option value="">Mới nhất</option>
                      <option value="popular">Đang quan tâm</option>
                    </select>
                  </div>
                </label>
              </div>

              <div className="community-social-filter-drawer__actions">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  disabled={!hasFilters && !searchInput}
                >
                  <RotateCcw size={15} />
                  Xóa lọc
                </button>
                <button
                  type="button"
                  onClick={() => {
                    commitSearch(searchInput);
                    setFiltersOpen(false);
                  }}
                >
                  Xem kết quả
                </button>
              </div>
            </aside>
          </>
        ) : null}
      </div>
    </section>
  );
}
