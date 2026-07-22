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
  AlertTriangle,
  Clock3,
  Filter,
  HelpCircle,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tags,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import CommunityCard from '../../components/content/CommunityCard';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';

import { communityApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';

import { COMMUNITY_TYPES } from '../../utils/constants';

import './CommunityPage.css';

const TYPE_ICONS = {
  discussion: MessagesSquare,
  question: HelpCircle,
  ask: HelpCircle,
  report: AlertTriangle,
  sharing: Sparkles,
  announcement: MessageCircle,
};

function getTypeIcon(type) {
  return TYPE_ICONS[type] || MessageCircle;
}

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
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const {
    categoriesFor,
    areas = [],
  } = useTaxonomy();

  const resultsRef = useRef(null);

  const [
    mobileFiltersOpen,
    setMobileFiltersOpen,
  ] = useState(false);

  const [
    searchInput,
    setSearchInput,
  ] = useState(
    searchParams.get('q') || '',
  );

  const communityCategories = useMemo(
    () => categoriesFor('community') || [],
    [categoriesFor],
  );

  /*
   * Dùng chuỗi URL làm dependency ổn định,
   * tránh object searchParams làm gọi API lặp.
   */
  const searchKey =
    searchParams.toString();

  const params = useMemo(() => {
    const source =
      new URLSearchParams(searchKey);

    const nextParams = {};

    [
      'type',
      'category',
      'area',
      'sort',
      'q',
      'page',
    ].forEach((key) => {
      const value = source.get(key);

      if (value) {
        nextParams[key] = value;
      }
    });

    return nextParams;
  }, [searchKey]);

  const result = useListPage(
    communityApi.list,
    params,
  );

  const currentType =
    searchParams.get('type') || '';

  const currentCategory =
    searchParams.get('category') || '';

  const currentArea =
    searchParams.get('area') || '';

  const currentSort =
    searchParams.get('sort') || '';

  const currentQuery =
    searchParams.get('q') || '';

  const selectedCategory =
    useMemo(
      () =>
        communityCategories.find(
          (item) =>
            String(item._id) ===
              String(currentCategory) ||
            String(item.slug) ===
              String(currentCategory),
        ),
      [
        communityCategories,
        currentCategory,
      ],
    );

  const selectedArea = useMemo(
    () =>
      areas.find(
        (item) =>
          String(item._id) ===
            String(currentArea) ||
          String(item.slug) ===
            String(currentArea),
      ),
    [areas, currentArea],
  );

  const setUrlParams = useCallback(
    (mutator, options = {}) => {
      setSearchParams(
        (current) => {
          const next =
            new URLSearchParams(
              current,
            );

          mutator(next);

          if (
            next.get('page') === '1'
          ) {
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
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }

          next.delete('page');
        },
        options,
      );
    },
    [setUrlParams],
  );

  const commitSearch =
    useCallback(
      (value, replace = true) => {
        update(
          'q',
          String(value || '').trim(),
          {
            replace,
          },
        );
      },
      [update],
    );

  /*
   * Đồng bộ ô tìm kiếm khi người dùng dùng
   * Back/Forward hoặc xóa chip từ khóa.
   */
  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  /*
   * Chờ 450 ms sau khi ngừng nhập mới gọi API.
   */
  useEffect(() => {
    const cleanValue =
      searchInput.trim();

    if (cleanValue === currentQuery) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        commitSearch(
          cleanValue,
          true,
        );
      }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    searchInput,
    currentQuery,
    commitSearch,
  ]);

  useEffect(() => {
    if (!mobileFiltersOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    const closeWithEscape = (
      event,
    ) => {
      if (event.key === 'Escape') {
        setMobileFiltersOpen(false);
      }
    };

    document.body.style.overflow =
      'hidden';

    document.addEventListener(
      'keydown',
      closeWithEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        'keydown',
        closeWithEscape,
      );
    };
  }, [mobileFiltersOpen]);

  const clearAllFilters =
    useCallback(() => {
      setSearchInput('');

      setUrlParams((next) => {
        [
          'type',
          'category',
          'area',
          'sort',
          'q',
          'page',
        ].forEach((key) => {
          next.delete(key);
        });
      });
    }, [setUrlParams]);

  const setPage = useCallback(
    (page) => {
      setUrlParams((next) => {
        if (Number(page) <= 1) {
          next.delete('page');
        } else {
          next.set(
            'page',
            String(page),
          );
        }
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
    (currentSort ? 1 : 0) +
    (currentQuery ? 1 : 0);

  const hasFilters =
    activeFilterCount > 0;

  const total = getTotal(
    result.meta,
    result.items.length,
  );

  const currentPage =
    getCurrentPage(
      result.meta,
      searchParams,
    );

  const pageSize =
    getPageSize(
      result.meta,
      result.items.length,
    );

  const fromItem =
    total > 0
      ? (currentPage - 1) *
          Math.max(pageSize, 1) +
        1
      : 0;

  const toItem =
    total > 0
      ? Math.min(
          fromItem +
            result.items.length -
            1,
          total,
        )
      : 0;

  return (
    <section className="community-page">
      <Seo
        title="Cộng đồng Hòa Lạc"
        description="Thảo luận, hỏi đáp, phản ánh và chia sẻ từ cộng đồng Hòa Lạc."
      />

      <div className="community-page__container">
        <header className="community-hero">
          <div className="community-hero__content">
            <span className="community-hero__eyebrow">
              <UsersRound size={17} />
              Diễn đàn địa phương
            </span>

            <h1>
              Cộng đồng Đô Thị Hòa Lạc
            </h1>

            <p>
              Nơi người dân, người lao động,
              doanh nghiệp và những người
              quan tâm đến Hòa Lạc cùng hỏi
              đáp, thảo luận và chia sẻ thông
              tin hữu ích.
            </p>

            <div className="community-hero__actions">
              <Link
                className="community-primary-button"
                to="/dang-bai/cong-dong"
              >
                <Plus size={18} />
                Đăng bài cộng đồng
              </Link>

              <a
                className="community-secondary-button"
                href="#community-feed"
              >
                <MessagesSquare size={18} />
                Xem bảng tin
              </a>
            </div>
          </div>

          <form
            className="community-hero__search"
            onSubmit={(event) => {
              event.preventDefault();

              commitSearch(
                searchInput,
                false,
              );
            }}
          >
            <div className="community-hero__search-heading">
              <span>
                <Search size={20} />
              </span>

              <div>
                <strong>
                  Tìm trong cộng đồng
                </strong>

                <small>
                  Tìm câu hỏi, thảo luận hoặc
                  phản ánh đang quan tâm.
                </small>
              </div>
            </div>

            <label>
              <Search size={18} />

              <input
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Nhập nội dung cần tìm..."
                aria-label="Tìm kiếm bài cộng đồng"
              />

              {searchInput ? (
                <button
                  type="button"
                  aria-label="Xóa từ khóa"
                  onClick={() => {
                    setSearchInput('');
                    commitSearch('');
                  }}
                >
                  <X size={16} />
                </button>
              ) : null}
            </label>

            <button type="submit">
              <Search size={17} />
              Tìm kiếm
            </button>
          </form>
        </header>

        <nav
          className="community-type-rail"
          aria-label="Loại bài cộng đồng"
        >
          <button
            type="button"
            className={
              !currentType
                ? 'is-active'
                : ''
            }
            onClick={() =>
              update('type', '')
            }
          >
            <MessagesSquare size={16} />
            Tất cả bài viết
          </button>

          {Object.entries(
            COMMUNITY_TYPES,
          ).map(([value, label]) => {
            const TypeIcon =
              getTypeIcon(value);

            return (
              <button
                type="button"
                key={value}
                className={
                  currentType === value
                    ? 'is-active'
                    : ''
                }
                onClick={() =>
                  update(
                    'type',
                    currentType === value
                      ? ''
                      : value,
                  )
                }
              >
                <TypeIcon size={16} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="community-mobile-controls">
          <button
            type="button"
            onClick={() =>
              setMobileFiltersOpen(true)
            }
          >
            <SlidersHorizontal size={17} />
            Bộ lọc

            {activeFilterCount ? (
              <span>
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <label>
            <TrendingUp size={16} />

            <select
              value={currentSort}
              onChange={(event) =>
                update(
                  'sort',
                  event.target.value,
                )
              }
            >
              <option value="">
                Mới nhất
              </option>

              <option value="popular">
                Nổi bật
              </option>
            </select>
          </label>
        </div>

        <section
          className={[
            'community-filter-panel',
            mobileFiltersOpen
              ? 'is-open'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="community-filter-panel__mobile-header">
            <div>
              <Filter size={19} />
              <strong>
                Bộ lọc cộng đồng
              </strong>
            </div>

            <button
              type="button"
              aria-label="Đóng bộ lọc"
              onClick={() =>
                setMobileFiltersOpen(false)
              }
            >
              <X size={21} />
            </button>
          </div>

          <div className="community-filter-panel__heading">
            <div>
              <span>
                <SlidersHorizontal
                  size={18}
                />
              </span>

              <div>
                <h2>
                  Tìm đúng nội dung bạn quan tâm
                </h2>

                <p>
                  Lọc theo loại bài, chủ đề,
                  khu vực hoặc mức độ nổi bật.
                </p>
              </div>
            </div>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
              >
                <RotateCcw size={16} />
                Xóa tất cả
              </button>
            ) : null}
          </div>

          <div className="community-filter-grid">
            <label className="community-filter-field">
              <span>Loại bài</span>

              <div>
                <MessageCircle size={18} />

                <select
                  value={currentType}
                  onChange={(event) =>
                    update(
                      'type',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Mọi loại bài
                  </option>

                  {Object.entries(
                    COMMUNITY_TYPES,
                  ).map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </label>

            <label className="community-filter-field">
              <span>Chủ đề</span>

              <div>
                <Tags size={18} />

                <select
                  value={currentCategory}
                  onChange={(event) =>
                    update(
                      'category',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Mọi chủ đề
                  </option>

                  {communityCategories.map(
                    (item) => (
                      <option
                        key={item._id}
                        value={item._id}
                      >
                        {item.name}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </label>

            <label className="community-filter-field">
              <span>Khu vực</span>

              <div>
                <MapPin size={18} />

                <select
                  value={currentArea}
                  onChange={(event) =>
                    update(
                      'area',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Mọi khu vực
                  </option>

                  {areas.map((item) => (
                    <option
                      key={item._id}
                      value={item._id}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="community-filter-field">
              <span>Sắp xếp</span>

              <div>
                {currentSort ===
                'popular' ? (
                  <TrendingUp size={18} />
                ) : (
                  <Clock3 size={18} />
                )}

                <select
                  value={currentSort}
                  onChange={(event) =>
                    update(
                      'sort',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Mới nhất
                  </option>

                  <option value="popular">
                    Nổi bật
                  </option>
                </select>
              </div>
            </label>
          </div>

          {hasFilters ? (
            <div className="community-active-filters">
              <span>
                Đang lọc:
              </span>

              {currentType ? (
                <button
                  type="button"
                  onClick={() =>
                    update('type', '')
                  }
                >
                  <MessageCircle
                    size={14}
                  />

                  {COMMUNITY_TYPES[
                    currentType
                  ] || currentType}

                  <X size={14} />
                </button>
              ) : null}

              {currentCategory ? (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      'category',
                      '',
                    )
                  }
                >
                  <Tags size={14} />

                  {selectedCategory?.name ||
                    'Chủ đề'}

                  <X size={14} />
                </button>
              ) : null}

              {currentArea ? (
                <button
                  type="button"
                  onClick={() =>
                    update('area', '')
                  }
                >
                  <MapPin size={14} />

                  {selectedArea?.name ||
                    'Khu vực'}

                  <X size={14} />
                </button>
              ) : null}

              {currentSort ===
              'popular' ? (
                <button
                  type="button"
                  onClick={() =>
                    update('sort', '')
                  }
                >
                  <TrendingUp
                    size={14}
                  />
                  Nổi bật
                  <X size={14} />
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
                  <Search size={14} />
                  “{currentQuery}”
                  <X size={14} />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="community-filter-panel__mobile-actions">
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={!hasFilters}
            >
              Xóa bộ lọc
            </button>

            <button
              type="button"
              onClick={() =>
                setMobileFiltersOpen(false)
              }
            >
              Xem kết quả
            </button>
          </div>
        </section>

        {mobileFiltersOpen ? (
          <button
            type="button"
            className="community-filter-overlay"
            aria-label="Đóng bộ lọc"
            onClick={() =>
              setMobileFiltersOpen(false)
            }
          />
        ) : null}

        <div className="community-layout">
          <main
            id="community-feed"
            ref={resultsRef}
            className="community-feed-panel"
          >
            <header className="community-results-header">
              <div>
                <span>
                  <MessagesSquare size={16} />
                  Bảng tin cộng đồng
                </span>

                <h2>
                  {currentQuery
                    ? `Kết quả cho “${currentQuery}”`
                    : hasFilters
                      ? 'Bài viết theo bộ lọc'
                      : 'Bài viết mới nhất'}
                </h2>

                {!result.loading &&
                !result.error ? (
                  <p>
                    {total ? (
                      <>
                        Hiển thị{' '}
                        <strong>
                          {fromItem}–{toItem}
                        </strong>{' '}
                        trong tổng số{' '}
                        <strong>
                          {total.toLocaleString(
                            'vi-VN',
                          )}
                        </strong>{' '}
                        bài viết.
                      </>
                    ) : (
                      'Chưa có bài viết phù hợp.'
                    )}
                  </p>
                ) : null}
              </div>

              <Link
                to="/dang-bai/cong-dong"
              >
                <Plus size={17} />
                Đăng bài
              </Link>
            </header>

            <div className="community-feed-panel__body">
              {result.loading ? (
                <LoadingBlock />
              ) : result.error ? (
                <ErrorState
                  error={result.error}
                  onRetry={result.reload}
                />
              ) : result.items.length ? (
                <div className="community-feed-list">
                  {result.items.map(
                    (item) => (
                      <article
                        className="community-feed-item"
                        key={item._id}
                      >
                        <CommunityCard
                          item={item}
                        />
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <div className="community-empty-state">
                  <span>
                    <MessagesSquare
                      size={38}
                    />
                  </span>

                  <h3>
                    Chưa có bài viết phù hợp
                  </h3>

                  <p>
                    {hasFilters
                      ? 'Hãy thử bỏ bớt bộ lọc hoặc sử dụng từ khóa khác.'
                      : 'Hãy là người đầu tiên chia sẻ thông tin với cộng đồng Hòa Lạc.'}
                  </p>

                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={
                        clearAllFilters
                      }
                    >
                      <RotateCcw
                        size={17}
                      />
                      Xóa tất cả bộ lọc
                    </button>
                  ) : (
                    <Link to="/dang-bai/cong-dong">
                      <Plus size={17} />
                      Đăng bài đầu tiên
                    </Link>
                  )}
                </div>
              )}
            </div>
          </main>

          <aside className="community-sidebar">
            <div className="community-sidebar__sticky">
              <section className="community-sidebar-card community-sidebar-create">
                <span>
                  <Plus size={22} />
                </span>

                <h2>
                  Chia sẻ với cộng đồng
                </h2>

                <p>
                  Đặt câu hỏi, phản ánh vấn
                  đề hoặc chia sẻ thông tin
                  hữu ích về Hòa Lạc.
                </p>

                <Link to="/dang-bai/cong-dong">
                  <Plus size={17} />
                  Tạo bài viết
                </Link>
              </section>

              <section className="community-sidebar-card">
                <div className="community-sidebar-card__heading">
                  <ShieldCheck
                    size={19}
                  />

                  <div>
                    <h2>
                      Nguyên tắc cộng đồng
                    </h2>

                    <p>
                      Cùng xây dựng môi trường
                      trao đổi đáng tin cậy.
                    </p>
                  </div>
                </div>

                <ul className="community-rules">
                  <li>
                    Tôn trọng người tham gia
                    thảo luận.
                  </li>

                  <li>
                    Không đăng tin giả, nội
                    dung rác hoặc quảng cáo
                    trá hình.
                  </li>

                  <li>
                    Không công khai thông tin
                    cá nhân nhạy cảm.
                  </li>

                  <li>
                    Nêu nguồn khi chia sẻ
                    thông tin từ nơi khác.
                  </li>
                </ul>
              </section>

              {communityCategories.length ? (
                <section className="community-sidebar-card">
                  <div className="community-sidebar-card__heading">
                    <Tags size={19} />

                    <div>
                      <h2>
                        Chủ đề cộng đồng
                      </h2>

                      <p>
                        Truy cập nhanh các chủ
                        đề đang được quan tâm.
                      </p>
                    </div>
                  </div>

                  <div className="community-sidebar-topics">
                    {communityCategories
                      .slice(0, 7)
                      .map((item) => (
                        <button
                          type="button"
                          key={item._id}
                          className={
                            currentCategory ===
                            item._id
                              ? 'is-active'
                              : ''
                          }
                          onClick={() =>
                            update(
                              'category',
                              currentCategory ===
                                item._id
                                ? ''
                                : item._id,
                            )
                          }
                        >
                          <span>
                            {item.name}
                          </span>

                          <Tags size={15} />
                        </button>
                      ))}
                  </div>
                </section>
              ) : null}
            </div>
          </aside>
        </div>

        {!result.loading &&
        !result.error &&
        result.items.length ? (
          <div className="community-pagination">
            <Pagination
              meta={result.meta}
              onPageChange={setPage}
            />

            {result.meta?.totalPages ? (
              <p>
                Trang {currentPage} /{' '}
                {result.meta.totalPages}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}