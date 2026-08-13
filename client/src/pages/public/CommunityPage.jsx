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
  Clock3,
  Filter,
  MapPin,
  MessageCircle,
  MessagesSquare,
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
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';

import { communityApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useAuth } from '../../context/AuthContext';

import { COMMUNITY_TYPES } from '../../utils/constants';

import './CommunityPageSocial.css';

const PRIMARY_TYPES = [
  'discussion',
  'question',
  'report',
  'review',
];

const SECONDARY_TYPES = [
  'sharing',
  'support',
  'marketplace',
  'community_event',
  'other',
];

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

export default function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categoriesFor, areas = [] } = useTaxonomy();
  const { user, isAuthenticated } = useAuth();
  const resultsRef = useRef(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(
    searchParams.get('q') || '',
  );

  const communityCategories = useMemo(
    () => categoriesFor('community') || [],
    [categoriesFor],
  );

  const searchKey = searchParams.toString();

  const params = useMemo(() => {
    const source = new URLSearchParams(searchKey);
    const nextParams = {};

    ['type', 'category', 'area', 'sort', 'q', 'page'].forEach(
      (key) => {
        const value = source.get(key);
        if (value) nextParams[key] = value;
      },
    );

    return nextParams;
  }, [searchKey]);

  const result = useListPage(communityApi.list, params);

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

  const setUrlParams = useCallback(
    (mutator, options = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutator(next);

          if (next.get('page') === '1') {
            next.delete('page');
          }

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

    const closeWithEscape = (event) => {
      if (event.key === 'Escape') {
        setFiltersOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeWithEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [filtersOpen]);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');

    setUrlParams((next) => {
      ['type', 'category', 'area', 'sort', 'q', 'page'].forEach(
        (key) => next.delete(key),
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
      }, 30);
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

  const fromItem =
    total > 0
      ? (currentPage - 1) * Math.max(pageSize, 1) + 1
      : 0;

  const toItem =
    total > 0
      ? Math.min(fromItem + result.items.length - 1, total)
      : 0;

  const isSecondaryType = SECONDARY_TYPES.includes(currentType);

  const composerName =
    user?.displayName ||
    user?.profile?.displayName ||
    user?.username ||
    'Bạn';

  const resultTitle = currentQuery
    ? `Kết quả cho “${currentQuery}”`
    : currentSort === 'popular'
      ? 'Bài viết đang được quan tâm'
      : hasFilters
        ? 'Bài viết phù hợp'
        : 'Bài viết mới nhất';

  return (
    <section className="community-social-page">
      <Seo
        title="Cộng đồng Hòa Lạc"
        description="Thảo luận, hỏi đáp, phản ánh và chia sẻ từ cộng đồng Hòa Lạc."
      />

      <div className="community-social-page__container">
        <header className="community-social-intro">
          <div>
            <span className="community-social-intro__eyebrow">
              <UsersRound size={15} />
              Cộng đồng địa phương
            </span>

            <h1>Cộng đồng Hòa Lạc</h1>

            <p>
              Hỏi đáp, phản ánh và chia sẻ những câu chuyện gần gũi
              trong đời sống của 6 xã quanh khu vực Hòa Lạc.
            </p>
          </div>

          <Link
            className="community-social-intro__create"
            to="/dang-bai/cong-dong"
          >
            <Plus size={17} />
            Viết bài
          </Link>
        </header>

        <Link
          className="community-social-composer"
          to="/dang-bai/cong-dong"
          aria-label="Tạo bài viết cộng đồng"
        >
          <Avatar name={composerName} size="md" />

          <span className="community-social-composer__field">
            {isAuthenticated
              ? `${composerName}, bạn muốn chia sẻ điều gì?`
              : 'Bạn muốn chia sẻ điều gì với cộng đồng?'}
          </span>

          <span className="community-social-composer__cta">
            Đăng
          </span>
        </Link>

        <section className="community-social-control-panel">
          <nav
            className="community-social-types"
            aria-label="Loại bài cộng đồng"
          >
            <button
              type="button"
              className={!currentType ? 'is-active' : ''}
              onClick={() => update('type', '')}
            >
              Tất cả
            </button>

            {PRIMARY_TYPES.map((value) => (
              <button
                type="button"
                key={value}
                className={currentType === value ? 'is-active' : ''}
                onClick={() =>
                  update(
                    'type',
                    currentType === value ? '' : value,
                  )
                }
              >
                {COMMUNITY_TYPES[value]}
              </button>
            ))}

            <label
              className={[
                'community-social-types__more',
                isSecondaryType ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <select
                value={isSecondaryType ? currentType : ''}
                aria-label="Các loại bài khác"
                onChange={(event) =>
                  update('type', event.target.value)
                }
              >
                <option value="">Khác</option>

                {SECONDARY_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {COMMUNITY_TYPES[value]}
                  </option>
                ))}
              </select>
            </label>
          </nav>

          <div className="community-social-toolbar">
            <div className="community-social-toolbar__sort">
              <button
                type="button"
                className={
                  currentSort !== 'popular'
                    ? 'is-active'
                    : ''
                }
                onClick={() => update('sort', '')}
              >
                <Clock3 size={15} />
                Mới nhất
              </button>

              <button
                type="button"
                className={
                  currentSort === 'popular'
                    ? 'is-active'
                    : ''
                }
                onClick={() => update('sort', 'popular')}
              >
                <TrendingUp size={15} />
                Quan tâm
              </button>
            </div>

            <div className="community-social-toolbar__actions">
              <label className="community-social-toolbar__area">
                <MapPin size={15} />

                <select
                  value={currentArea}
                  aria-label="Lọc theo khu vực"
                  onChange={(event) =>
                    update('area', event.target.value)
                  }
                >
                  <option value="">Tất cả khu vực</option>

                  {areas.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="community-social-filter-button"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={16} />
                <span className="community-social-filter-button__label">
                  Tìm & lọc
                </span>

                {activeFilterCount ? (
                  <strong>{activeFilterCount}</strong>
                ) : null}
              </button>
            </div>
          </div>
        </section>

        {hasFilters ? (
          <div className="community-social-active-filters">
            {currentType ? (
              <button
                type="button"
                onClick={() => update('type', '')}
              >
                {COMMUNITY_TYPES[currentType] || currentType}
                <X size={13} />
              </button>
            ) : null}

            {currentCategory ? (
              <button
                type="button"
                onClick={() => update('category', '')}
              >
                {selectedCategory?.name || 'Chủ đề'}
                <X size={13} />
              </button>
            ) : null}

            {currentArea ? (
              <button
                type="button"
                onClick={() => update('area', '')}
              >
                {selectedArea?.name || 'Khu vực'}
                <X size={13} />
              </button>
            ) : null}

            {currentSort === 'popular' ? (
              <button
                type="button"
                onClick={() => update('sort', '')}
              >
                Đang quan tâm
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
              className="community-social-active-filters__clear"
              onClick={clearAllFilters}
            >
              Xóa lọc
            </button>
          </div>
        ) : null}

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
                  <Filter size={18} />

                  <div>
                    <h2>Tìm & lọc bài viết</h2>
                    <p>Chỉ dùng khi bạn cần thu hẹp bảng tin.</p>
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
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="Tìm bài viết, câu hỏi, phản ánh..."
                  aria-label="Tìm trong cộng đồng"
                />

                <button type="submit">
                  Tìm
                </button>
              </form>

              <div className="community-social-filter-fields">
                <label className="community-social-filter-field">
                  <span>Loại bài</span>

                  <div>
                    <MessageCircle size={17} />

                    <select
                      value={currentType}
                      onChange={(event) =>
                        update('type', event.target.value)
                      }
                    >
                      <option value="">Mọi loại bài</option>

                      {Object.entries(COMMUNITY_TYPES).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </label>

                <label className="community-social-filter-field">
                  <span>Chủ đề</span>

                  <div>
                    <Tags size={17} />

                    <select
                      value={currentCategory}
                      onChange={(event) =>
                        update('category', event.target.value)
                      }
                    >
                      <option value="">Mọi chủ đề</option>

                      {communityCategories.map((item) => (
                        <option key={item._id} value={item._id}>
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
                      onChange={(event) =>
                        update('area', event.target.value)
                      }
                    >
                      <option value="">Mọi khu vực</option>

                      {areas.map((item) => (
                        <option key={item._id} value={item._id}>
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
                      onChange={(event) =>
                        update('sort', event.target.value)
                      }
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

        <main
          id="community-feed"
          ref={resultsRef}
          className="community-social-feed"
        >
          <header className="community-social-feed__header">
            <div>
              <span className="community-social-feed__eyebrow">
                <MessagesSquare size={14} />
                Bảng tin
              </span>

              <div className="community-social-feed__title-row">
                <h2>{resultTitle}</h2>

                {!result.loading && !result.error ? (
                  <span>
                    {total.toLocaleString('vi-VN')} bài
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          {result.loading ? (
            <LoadingBlock />
          ) : result.error ? (
            <ErrorState
              error={result.error}
              onRetry={result.reload}
            />
          ) : result.items.length ? (
            <div className="community-social-feed-list">
              {result.items.map((item) => (
                <article
                  className="community-social-feed-item"
                  key={item._id}
                >
                  <CommunityCard item={item} />
                </article>
              ))}
            </div>
          ) : (
            <div className="community-social-empty">
              <span>
                <MessagesSquare size={30} />
              </span>

              <h3>Chưa có bài viết phù hợp</h3>

              <p>
                {hasFilters
                  ? 'Hãy thử bỏ bớt bộ lọc hoặc dùng từ khóa khác.'
                  : 'Hãy là người đầu tiên chia sẻ thông tin với cộng đồng Hòa Lạc.'}
              </p>

              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                >
                  <RotateCcw size={16} />
                  Xóa bộ lọc
                </button>
              ) : (
                <Link to="/dang-bai/cong-dong">
                  <Plus size={16} />
                  Tạo bài viết đầu tiên
                </Link>
              )}
            </div>
          )}
        </main>

        {!result.loading &&
        !result.error &&
        result.items.length ? (
          <div className="community-social-pagination">
            <Pagination
              meta={result.meta}
              onPageChange={setPage}
            />

            <p>
              {fromItem}–{toItem} / {total.toLocaleString('vi-VN')}
              {result.meta?.totalPages
                ? ` · Trang ${currentPage}/${result.meta.totalPages}`
                : ''}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
