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
  BriefcaseBusiness,
  Building2,
  Clock3,
  Filter,
  GraduationCap,
  Grid3X3,
  List,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import JobCard from '../../components/content/JobCard';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';

import { jobApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';

import {
  JOB_TYPES,
} from '../../utils/constants';

import './JobsPage.css';

const VIEW_MODE_KEY =
  'dothihoalac.jobs-view-mode';

const QUERY_KEYS = [
  'type',
  'area',
  'q',
  'page',
];

const JOB_TYPE_ICONS = {
  full_time: BriefcaseBusiness,
  part_time: Clock3,
  internship: GraduationCap,
  temporary: Clock3,
  freelance: Sparkles,
  contract: Building2,
  seasonal: Clock3,
};

function getJobTypeIcon(value) {
  return (
    JOB_TYPE_ICONS[value] ||
    BriefcaseBusiness
  );
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

function getCurrentPage(
  meta,
  searchParams,
) {
  return Number(
    meta?.page ??
      meta?.currentPage ??
      searchParams.get('page') ??
      1,
  );
}

function getPageSize(
  meta,
  itemCount,
) {
  return Number(
    meta?.limit ??
      meta?.pageSize ??
      meta?.perPage ??
      itemCount ??
      0,
  );
}

function findTaxonomyItem(
  items,
  value,
) {
  return items.find(
    (item) =>
      String(item?._id || '') ===
        String(value) ||
      String(item?.slug || '') ===
        String(value),
  );
}

export default function JobsPage() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const {
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

  const [
    viewMode,
    setViewMode,
  ] = useState(() => {
    try {
      const savedMode =
        localStorage.getItem(
          VIEW_MODE_KEY,
        );

      return [
        'grid',
        'list',
      ].includes(savedMode)
        ? savedMode
        : 'grid';
    } catch {
      return 'grid';
    }
  });

  /*
   * Dùng chuỗi URL làm dependency
   * để tránh gọi API lặp lại do
   * object searchParams thay đổi.
   */
  const searchKey =
    searchParams.toString();

  const params = useMemo(() => {
    const source =
      new URLSearchParams(
        searchKey,
      );

    const nextParams = {};

    QUERY_KEYS.forEach((key) => {
      const value =
        source.get(key);

      if (value) {
        nextParams[key] = value;
      }
    });

    return nextParams;
  }, [searchKey]);

  const result = useListPage(
    jobApi.list,
    params,
  );

  const currentType =
    searchParams.get('type') || '';

  const currentArea =
    searchParams.get('area') || '';

  const currentQuery =
    searchParams.get('q') || '';

  const selectedArea = useMemo(
    () =>
      findTaxonomyItem(
        areas,
        currentArea,
      ),
    [
      areas,
      currentArea,
    ],
  );

  const setUrlParams =
    useCallback(
      (mutator, options = {}) => {
        setSearchParams(
          (current) => {
            const next =
              new URLSearchParams(
                current,
              );

            mutator(next);

            /*
             * Không lưu page=1 trên URL.
             */
            if (
              next.get('page') ===
              '1'
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
    (
      key,
      value,
      options = {},
    ) => {
      setUrlParams(
        (next) => {
          const cleanValue =
            String(
              value ?? '',
            ).trim();

          if (cleanValue) {
            next.set(
              key,
              cleanValue,
            );
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
      (
        value,
        replace = true,
      ) => {
        update(
          'q',
          String(value || '')
            .trim(),
          {
            replace,
          },
        );
      },
      [update],
    );

  /*
   * Đồng bộ ô tìm kiếm khi dùng
   * Back hoặc Forward trình duyệt.
   */
  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  /*
   * Chờ 450 ms sau khi người dùng
   * ngừng nhập mới cập nhật URL và API.
   */
  useEffect(() => {
    const cleanValue =
      searchInput.trim();

    if (
      cleanValue === currentQuery
    ) {
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
    try {
      localStorage.setItem(
        VIEW_MODE_KEY,
        viewMode,
      );
    } catch {
      // Không ảnh hưởng giao diện.
    }
  }, [viewMode]);

  useEffect(() => {
    if (!mobileFiltersOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    const closeWithEscape = (
      event,
    ) => {
      if (
        event.key === 'Escape'
      ) {
        setMobileFiltersOpen(
          false,
        );
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
        QUERY_KEYS.forEach(
          (key) => {
            next.delete(key);
          },
        );
      });
    }, [setUrlParams]);

  const setPage = useCallback(
    (page) => {
      setUrlParams((next) => {
        if (
          Number(page) <= 1
        ) {
          next.delete('page');
        } else {
          next.set(
            'page',
            String(page),
          );
        }
      });

      window.setTimeout(() => {
        resultsRef.current
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
      }, 30);
    },
    [setUrlParams],
  );

  const activeFilterCount =
    (currentType ? 1 : 0) +
    (currentArea ? 1 : 0) +
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
          Math.max(
            pageSize,
            1,
          ) +
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
    <section className="jobs-page">
      <Seo
        title="Việc làm Hòa Lạc"
        description="Tuyển dụng, tìm việc, thực tập và việc làm thời vụ tại Hòa Lạc."
      />

      <div className="jobs-page__container">
        <header className="jobs-hero">
          <div className="jobs-hero__content">
            <span className="jobs-hero__eyebrow">
              <BriefcaseBusiness
                size={17}
              />

              Cơ hội nghề nghiệp
            </span>

            <h1>
              Việc làm tại Hòa Lạc
            </h1>

            <p>
              Kết nối doanh nghiệp,
              người lao động, sinh viên
              và ứng viên đang tìm kiếm
              cơ hội nghề nghiệp tại khu
              vực Hòa Lạc.
            </p>

            <div className="jobs-hero__actions">
              <Link
                className="jobs-primary-button"
                to="/dang-bai/viec-lam"
              >
                <Plus size={18} />
                Đăng tin tuyển dụng
              </Link>

              <a
                className="jobs-secondary-button"
                href="#jobs-results"
              >
                <Search size={18} />
                Xem việc đang tuyển
              </a>
            </div>
          </div>

          <form
            className="jobs-hero__search"
            onSubmit={(event) => {
              event.preventDefault();

              commitSearch(
                searchInput,
                false,
              );
            }}
          >
            <div className="jobs-hero__search-heading">
              <span>
                <Search size={21} />
              </span>

              <div>
                <strong>
                  Tìm việc phù hợp
                </strong>

                <small>
                  Tìm theo vị trí,
                  công ty hoặc nội dung
                  tuyển dụng.
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
                placeholder="Ví dụ: kế toán, kỹ sư, thực tập..."
                aria-label="Tìm kiếm việc làm"
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
          className="jobs-type-rail"
          aria-label="Loại công việc"
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
            <BriefcaseBusiness
              size={16}
            />
            Tất cả công việc
          </button>

          {Object.entries(
            JOB_TYPES,
          ).map(
            ([value, label]) => {
              const JobTypeIcon =
                getJobTypeIcon(
                  value,
                );

              const selected =
                currentType === value;

              return (
                <button
                  type="button"
                  key={value}
                  className={
                    selected
                      ? 'is-active'
                      : ''
                  }
                  onClick={() =>
                    update(
                      'type',
                      selected
                        ? ''
                        : value,
                    )
                  }
                >
                  <JobTypeIcon
                    size={16}
                  />

                  {label}
                </button>
              );
            },
          )}
        </nav>

        <div className="jobs-mobile-controls">
          <button
            type="button"
            onClick={() =>
              setMobileFiltersOpen(
                true,
              )
            }
          >
            <SlidersHorizontal
              size={17}
            />

            Bộ lọc

            {activeFilterCount ? (
              <span>
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <Link to="/dang-bai/viec-lam">
            <Plus size={17} />
            Đăng tuyển
          </Link>
        </div>

        <section
          className={[
            'jobs-filter-panel',
            mobileFiltersOpen
              ? 'is-open'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="jobs-filter-panel__mobile-header">
            <div>
              <Filter size={19} />

              <strong>
                Bộ lọc việc làm
              </strong>
            </div>

            <button
              type="button"
              aria-label="Đóng bộ lọc"
              onClick={() =>
                setMobileFiltersOpen(
                  false,
                )
              }
            >
              <X size={21} />
            </button>
          </div>

          <div className="jobs-filter-panel__heading">
            <div>
              <span>
                <SlidersHorizontal
                  size={18}
                />
              </span>

              <div>
                <h2>
                  Tìm đúng công việc
                </h2>

                <p>
                  Lọc cơ hội việc làm
                  theo hình thức làm việc
                  và khu vực tuyển dụng.
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

          <div className="jobs-filter-grid">
            <label className="jobs-filter-field">
              <span>
                Loại công việc
              </span>

              <div>
                <BriefcaseBusiness
                  size={18}
                />

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
                    Tất cả loại việc
                  </option>

                  {Object.entries(
                    JOB_TYPES,
                  ).map(
                    ([
                      value,
                      label,
                    ]) => (
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

            <label className="jobs-filter-field">
              <span>
                Khu vực làm việc
              </span>

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
                    Tất cả khu vực
                  </option>

                  {areas.map(
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

            <label className="jobs-filter-search">
              <span>
                Từ khóa tuyển dụng
              </span>

              <div>
                <Search size={18} />

                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(
                      event.target.value,
                    )
                  }
                  placeholder="Tên vị trí hoặc công ty..."
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
              </div>
            </label>
          </div>

          {hasFilters ? (
            <div className="jobs-active-filters">
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
                  <BriefcaseBusiness
                    size={14}
                  />

                  {JOB_TYPES[
                    currentType
                  ] || currentType}

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

          <div className="jobs-filter-panel__mobile-actions">
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
                setMobileFiltersOpen(
                  false,
                )
              }
            >
              Xem kết quả
            </button>
          </div>
        </section>

        {mobileFiltersOpen ? (
          <button
            type="button"
            className="jobs-filter-overlay"
            aria-label="Đóng bộ lọc"
            onClick={() =>
              setMobileFiltersOpen(
                false,
              )
            }
          />
        ) : null}

        <div className="jobs-layout">
          <main
            id="jobs-results"
            ref={resultsRef}
            className="jobs-results"
          >
            <header className="jobs-results__header">
              <div>
                <span className="jobs-results__eyebrow">
                  <BriefcaseBusiness
                    size={16}
                  />

                  Cơ hội đang tuyển
                </span>

                <h2>
                  {currentQuery
                    ? `Kết quả cho “${currentQuery}”`
                    : hasFilters
                      ? 'Việc làm theo bộ lọc'
                      : 'Việc làm mới nhất'}
                </h2>

                {!result.loading &&
                !result.error ? (
                  <p>
                    {total > 0 ? (
                      <>
                        Hiển thị{' '}
                        <strong>
                          {fromItem}–
                          {toItem}
                        </strong>{' '}
                        trong tổng số{' '}
                        <strong>
                          {total.toLocaleString(
                            'vi-VN',
                          )}
                        </strong>{' '}
                        việc làm.
                      </>
                    ) : (
                      'Chưa có công việc phù hợp.'
                    )}
                  </p>
                ) : null}
              </div>

              <div className="jobs-results__tools">
                <button
                  type="button"
                  className="jobs-results__reload"
                  disabled={
                    result.loading
                  }
                  onClick={
                    result.reload
                  }
                >
                  <RefreshCw
                    size={16}
                    className={
                      result.loading
                        ? 'is-spinning'
                        : ''
                    }
                  />

                  Làm mới
                </button>

                <div className="jobs-view-switch">
                  <button
                    type="button"
                    className={
                      viewMode ===
                      'grid'
                        ? 'is-active'
                        : ''
                    }
                    aria-label="Xem dạng lưới"
                    title="Dạng lưới"
                    onClick={() =>
                      setViewMode(
                        'grid',
                      )
                    }
                  >
                    <Grid3X3
                      size={18}
                    />
                  </button>

                  <button
                    type="button"
                    className={
                      viewMode ===
                      'list'
                        ? 'is-active'
                        : ''
                    }
                    aria-label="Xem dạng danh sách"
                    title="Dạng danh sách"
                    onClick={() =>
                      setViewMode(
                        'list',
                      )
                    }
                  >
                    <List size={19} />
                  </button>
                </div>
              </div>
            </header>

            <div className="jobs-results__body">
              {result.loading ? (
                <LoadingBlock />
              ) : result.error ? (
                <ErrorState
                  error={result.error}
                  onRetry={
                    result.reload
                  }
                />
              ) : result.items.length ? (
                <div
                  className={[
                    'jobs-grid',
                    viewMode === 'list'
                      ? 'is-list'
                      : 'is-grid',
                  ].join(' ')}
                >
                  {result.items.map(
                    (item) => (
                      <article
                        className="jobs-item"
                        key={item._id}
                      >
                        <JobCard
                          item={item}
                        />
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <div className="jobs-empty-state">
                  <span>
                    <BriefcaseBusiness
                      size={39}
                    />
                  </span>

                  <h3>
                    Chưa có việc làm phù hợp
                  </h3>

                  <p>
                    {hasFilters
                      ? 'Hãy thử thay đổi loại công việc, khu vực hoặc từ khóa tìm kiếm.'
                      : 'Hiện chưa có tin tuyển dụng nào được đăng trong hệ thống.'}
                  </p>

                  <div>
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
                    ) : null}

                    <Link to="/dang-bai/viec-lam">
                      <Plus size={17} />
                      Đăng tin tuyển dụng
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </main>

          <aside className="jobs-sidebar">
            <div className="jobs-sidebar__content">
              <section className="jobs-sidebar-card jobs-sidebar-employer">
                <span>
                  <Building2 size={23} />
                </span>

                <small>
                  Dành cho doanh nghiệp
                </small>

                <h2>
                  Tuyển đúng người tại
                  Hòa Lạc
                </h2>

                <p>
                  Đăng nhu cầu tuyển dụng
                  để tiếp cận người lao
                  động, sinh viên và ứng
                  viên trong khu vực.
                </p>

                <Link to="/dang-bai/viec-lam">
                  <Plus size={17} />
                  Đăng tin tuyển dụng
                </Link>
              </section>

              <section className="jobs-sidebar-card">
                <div className="jobs-sidebar-heading">
                  <GraduationCap
                    size={19}
                  />

                  <div>
                    <h2>
                      Dành cho ứng viên
                    </h2>

                    <p>
                      Một số lưu ý khi
                      tìm việc và ứng
                      tuyển.
                    </p>
                  </div>
                </div>

                <ul className="jobs-sidebar-tips">
                  <li>
                    Kiểm tra kỹ mô tả
                    công việc và địa
                    điểm làm việc.
                  </li>

                  <li>
                    Không chuyển tiền để
                    được nhận việc hoặc
                    tham gia phỏng vấn.
                  </li>

                  <li>
                    Xác minh thông tin
                    doanh nghiệp trước
                    khi cung cấp hồ sơ.
                  </li>

                  <li>
                    Không gửi thông tin
                    tài khoản ngân hàng
                    hoặc mã xác thực.
                  </li>
                </ul>
              </section>

              <section className="jobs-sidebar-card">
                <div className="jobs-sidebar-heading">
                  <ShieldCheck
                    size={19}
                  />

                  <div>
                    <h2>
                      Tuyển dụng an toàn
                    </h2>

                    <p>
                      Chủ động xác minh
                      trước khi trao đổi.
                    </p>
                  </div>
                </div>

                <div className="jobs-safety-note">
                  <p>
                    Đô Thị Hòa Lạc cung
                    cấp nền tảng kết nối
                    thông tin và không
                    trực tiếp tham gia
                    quá trình tuyển dụng.
                  </p>
                </div>
              </section>

              {areas.length ? (
                <section className="jobs-sidebar-card">
                  <div className="jobs-sidebar-heading">
                    <MapPin size={19} />

                    <div>
                      <h2>
                        Khu vực tuyển dụng
                      </h2>

                      <p>
                        Xem nhanh việc làm
                        theo địa bàn.
                      </p>
                    </div>
                  </div>

                  <div className="jobs-sidebar-areas">
                    {areas
                      .slice(0, 8)
                      .map((area) => {
                        const selected =
                          String(
                            currentArea,
                          ) ===
                          String(
                            area._id,
                          );

                        return (
                          <button
                            type="button"
                            key={area._id}
                            className={
                              selected
                                ? 'is-active'
                                : ''
                            }
                            onClick={() =>
                              update(
                                'area',
                                selected
                                  ? ''
                                  : area._id,
                              )
                            }
                          >
                            <span>
                              {area.name}
                            </span>

                            <MapPin
                              size={15}
                            />
                          </button>
                        );
                      })}
                  </div>
                </section>
              ) : null}
            </div>
          </aside>
        </div>

        {!result.loading &&
        !result.error &&
        result.items.length ? (
          <div className="jobs-pagination">
            <Pagination
              meta={result.meta}
              onPageChange={setPage}
            />

            {result.meta
              ?.totalPages ? (
              <p>
                Trang {currentPage} /{' '}
                {
                  result.meta
                    .totalPages
                }
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}