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
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  GraduationCap,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
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
  EXPERIENCE_LEVELS,
  JOB_TYPES,
} from '../../utils/constants';

import './JobsPage.css';

const QUERY_KEYS = [
  'type',
  'area',
  'experienceLevel',
  'sort',
  'q',
  'page',
];

const FILTER_ONLY_KEYS = [
  'type',
  'area',
  'experienceLevel',
  'sort',
];

const JOB_TYPE_ICONS = {
  full_time: BriefcaseBusiness,
  part_time: Clock3,
  internship: GraduationCap,
  temporary: Clock3,
  student: GraduationCap,
  construction: Building2,
  service: Sparkles,
};

const SORT_OPTIONS = [
  {
    value: '',
    label: 'Mới nhất',
    icon: Clock3,
  },
  {
    value: 'deadline_asc',
    label: 'Sắp hết hạn',
    icon: CalendarDays,
  },
  {
    value: 'deadline_desc',
    label: 'Hạn xa nhất',
    icon: CalendarDays,
  },
];

function getJobTypeIcon(value) {
  return JOB_TYPE_ICONS[value] || BriefcaseBusiness;
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

function findTaxonomyItem(items, value) {
  return items.find(
    (item) =>
      String(item?._id || '') === String(value) ||
      String(item?.slug || '') === String(value),
  );
}

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { areas = [] } = useTaxonomy();

  const resultsRef = useRef(null);
  const quickToolbarRef = useRef(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickFilterOpen, setQuickFilterOpen] = useState('');
  const [searchInput, setSearchInput] = useState(
    searchParams.get('q') || '',
  );

  const searchKey = searchParams.toString();

  const params = useMemo(() => {
    const source = new URLSearchParams(searchKey);
    const nextParams = {};

    QUERY_KEYS.forEach((key) => {
      const value = source.get(key);
      if (value) nextParams[key] = value;
    });

    return nextParams;
  }, [searchKey]);

  const result = useListPage(jobApi.list, params);

  const currentType = searchParams.get('type') || '';
  const currentArea = searchParams.get('area') || '';
  const currentExperience = searchParams.get('experienceLevel') || '';
  const currentSort = searchParams.get('sort') || '';
  const currentQuery = searchParams.get('q') || '';

  const selectedArea = useMemo(
    () => findTaxonomyItem(areas, currentArea),
    [areas, currentArea],
  );

  const currentSortOption =
    SORT_OPTIONS.find((item) => item.value === currentSort) ||
    SORT_OPTIONS[0];

  const SortIcon = currentSortOption.icon;

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
          const cleanValue = String(value ?? '').trim();

          if (cleanValue) {
            next.set(key, cleanValue);
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
    if (!quickFilterOpen) return undefined;

    const closeOutside = (event) => {
      if (
        quickToolbarRef.current &&
        !quickToolbarRef.current.contains(event.target)
      ) {
        setQuickFilterOpen('');
      }
    };

    const closeWithEscape = (event) => {
      if (event.key === 'Escape') {
        setQuickFilterOpen('');
      }
    };

    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);

    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [quickFilterOpen]);

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

  const clearFiltersOnly = useCallback(() => {
    setUrlParams((next) => {
      FILTER_ONLY_KEYS.forEach((key) => next.delete(key));
      next.delete('page');
    });

    setQuickFilterOpen('');
  }, [setUrlParams]);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');

    setUrlParams((next) => {
      QUERY_KEYS.forEach((key) => next.delete(key));
    });

    setQuickFilterOpen('');
  }, [setUrlParams]);

  const setPage = useCallback(
    (page) => {
      setUrlParams((next) => {
        if (Number(page) <= 1) {
          next.delete('page');
        } else {
          next.set('page', String(page));
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

  const toggleQuickFilter = useCallback((name) => {
    setQuickFilterOpen((current) => (current === name ? '' : name));
  }, []);

  const openFilterModal = useCallback(() => {
    setQuickFilterOpen('');
    setFiltersOpen(true);
  }, []);

  const closeFilterModal = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  const filterCount =
    (currentType ? 1 : 0) +
    (currentArea ? 1 : 0) +
    (currentExperience ? 1 : 0) +
    (currentSort ? 1 : 0);

  const hasFilters = filterCount > 0 || Boolean(currentQuery);

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

  const areaButtonLabel = selectedArea?.name || 'Khu vực';
  const experienceButtonLabel =
    EXPERIENCE_LEVELS[currentExperience] || 'Kinh nghiệm';

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
              <BriefcaseBusiness size={17} />
              Việc làm Hòa Lạc
            </span>

            <h1>Việc làm tại Hòa Lạc</h1>

            <p>
              Tìm cơ hội tuyển dụng theo vị trí, khu vực, hình thức làm việc
              và yêu cầu kinh nghiệm trong khu vực Hòa Lạc.
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
              commitSearch(searchInput);
            }}
          >
            <label>
              <Search size={19} />

              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Ví dụ: kỹ sư, kế toán, FPT, Thạch Hòa..."
                aria-label="Tìm kiếm việc làm"
              />

              {searchInput ? (
                <button
                  type="button"
                  aria-label="Xóa từ khóa"
                  onClick={() => {
                    setSearchInput('');
                    commitSearch('', true);
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
            className={!currentType ? 'is-active' : ''}
            onClick={() => update('type', '')}
          >
            <BriefcaseBusiness size={16} />
            Tất cả công việc
          </button>

          {Object.entries(JOB_TYPES).map(([value, label]) => {
            const JobTypeIcon = getJobTypeIcon(value);
            const selected = currentType === value;

            return (
              <button
                type="button"
                key={value}
                className={selected ? 'is-active' : ''}
                onClick={() => update('type', selected ? '' : value)}
              >
                <JobTypeIcon size={16} />
                {label}
              </button>
            );
          })}
        </nav>

        <div
          className="jobs-filter-toolbar"
          ref={quickToolbarRef}
        >
          <button
            type="button"
            className="jobs-filter-toolbar__main"
            onClick={openFilterModal}
          >
            <Filter size={18} />
            <span>Lọc</span>
            {filterCount ? <b>{filterCount}</b> : null}
          </button>

          <div className="jobs-quick-filter">
            <button
              type="button"
              className={currentArea ? 'is-selected' : ''}
              aria-expanded={quickFilterOpen === 'area'}
              onClick={() => toggleQuickFilter('area')}
            >
              <MapPin size={17} />
              <span>{areaButtonLabel}</span>
              <ChevronDown size={16} />
            </button>

            {quickFilterOpen === 'area' ? (
              <div className="jobs-filter-popover">
                <header>
                  <strong>Khu vực làm việc</strong>
                  <button
                    type="button"
                    aria-label="Đóng"
                    onClick={() => setQuickFilterOpen('')}
                  >
                    <X size={19} />
                  </button>
                </header>

                <div className="jobs-filter-option-list">
                  <button
                    type="button"
                    className={!currentArea ? 'is-active' : ''}
                    onClick={() => {
                      update('area', '');
                      setQuickFilterOpen('');
                    }}
                  >
                    <span>Tất cả khu vực</span>
                    {!currentArea ? <Check size={17} /> : null}
                  </button>

                  {areas.map((item) => {
                    const selected =
                      String(currentArea) === String(item._id) ||
                      String(currentArea) === String(item.slug);

                    return (
                      <button
                        type="button"
                        key={item._id}
                        className={selected ? 'is-active' : ''}
                        onClick={() => {
                          update('area', item._id);
                          setQuickFilterOpen('');
                        }}
                      >
                        <span>{item.name}</span>
                        {selected ? <Check size={17} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="jobs-quick-filter">
            <button
              type="button"
              className={currentExperience ? 'is-selected' : ''}
              aria-expanded={quickFilterOpen === 'experience'}
              onClick={() => toggleQuickFilter('experience')}
            >
              <GraduationCap size={17} />
              <span>{experienceButtonLabel}</span>
              <ChevronDown size={16} />
            </button>

            {quickFilterOpen === 'experience' ? (
              <div className="jobs-filter-popover jobs-filter-popover--experience">
                <header>
                  <strong>Kinh nghiệm</strong>
                  <button
                    type="button"
                    aria-label="Đóng"
                    onClick={() => setQuickFilterOpen('')}
                  >
                    <X size={19} />
                  </button>
                </header>

                <div className="jobs-filter-option-list">
                  <button
                    type="button"
                    className={!currentExperience ? 'is-active' : ''}
                    onClick={() => {
                      update('experienceLevel', '');
                      setQuickFilterOpen('');
                    }}
                  >
                    <span>Tất cả kinh nghiệm</span>
                    {!currentExperience ? <Check size={17} /> : null}
                  </button>

                  {Object.entries(EXPERIENCE_LEVELS).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={currentExperience === value ? 'is-active' : ''}
                      onClick={() => {
                        update('experienceLevel', value);
                        setQuickFilterOpen('');
                      }}
                    >
                      <span>{label}</span>
                      {currentExperience === value ? <Check size={17} /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <label className="jobs-filter-toolbar__sort">
            <SortIcon size={17} />
            <select
              value={currentSort}
              onChange={(event) => update('sort', event.target.value)}
              aria-label="Sắp xếp việc làm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hasFilters ? (
          <div className="jobs-active-filters">
            <span>Đang lọc:</span>

            {currentType ? (
              <button type="button" onClick={() => update('type', '')}>
                {JOB_TYPES[currentType] || currentType}
                <X size={13} />
              </button>
            ) : null}

            {currentArea ? (
              <button type="button" onClick={() => update('area', '')}>
                {selectedArea?.name || 'Khu vực'}
                <X size={13} />
              </button>
            ) : null}

            {currentExperience ? (
              <button
                type="button"
                onClick={() => update('experienceLevel', '')}
              >
                {EXPERIENCE_LEVELS[currentExperience] || currentExperience}
                <X size={13} />
              </button>
            ) : null}

            {currentSort ? (
              <button type="button" onClick={() => update('sort', '')}>
                {currentSortOption.label}
                <X size={13} />
              </button>
            ) : null}

            {currentQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  commitSearch('', true);
                }}
              >
                “{currentQuery}”
                <X size={13} />
              </button>
            ) : null}

            <button
              type="button"
              className="jobs-active-filters__clear"
              onClick={clearAllFilters}
            >
              Xóa tất cả
            </button>
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="jobs-filter-modal-layer">
            <button
              type="button"
              className="jobs-filter-modal-backdrop"
              aria-label="Đóng bộ lọc"
              onClick={closeFilterModal}
            />

            <section
              className="jobs-filter-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Bộ lọc việc làm"
            >
              <header className="jobs-filter-modal__header">
                <div>
                  <SlidersHorizontal size={20} />
                  <strong>Bộ lọc việc làm</strong>
                </div>

                <button
                  type="button"
                  aria-label="Đóng bộ lọc"
                  onClick={closeFilterModal}
                >
                  <X size={22} />
                </button>
              </header>

              <div className="jobs-filter-modal__body">
                <section className="jobs-filter-modal__section">
                  <h3>Loại công việc & khu vực</h3>

                  <div className="jobs-modal-select-grid">
                    <label>
                      <span>Loại công việc</span>
                      <div>
                        <BriefcaseBusiness size={18} />
                        <select
                          value={currentType}
                          onChange={(event) => update('type', event.target.value)}
                        >
                          <option value="">Tất cả công việc</option>
                          {Object.entries(JOB_TYPES).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>

                    <label>
                      <span>Khu vực</span>
                      <div>
                        <MapPin size={18} />
                        <select
                          value={currentArea}
                          onChange={(event) => update('area', event.target.value)}
                        >
                          <option value="">Tất cả khu vực</option>
                          {areas.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>
                </section>

                <section className="jobs-filter-modal__section">
                  <h3>Yêu cầu & thứ tự hiển thị</h3>

                  <div className="jobs-modal-select-grid">
                    <label>
                      <span>Kinh nghiệm</span>
                      <div>
                        <GraduationCap size={18} />
                        <select
                          value={currentExperience}
                          onChange={(event) =>
                            update('experienceLevel', event.target.value)
                          }
                        >
                          <option value="">Tất cả kinh nghiệm</option>
                          {Object.entries(EXPERIENCE_LEVELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </label>

                    <label>
                      <span>Sắp xếp</span>
                      <div>
                        <SortIcon size={18} />
                        <select
                          value={currentSort}
                          onChange={(event) => update('sort', event.target.value)}
                        >
                          {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>
                </section>

                <section className="jobs-filter-modal__section jobs-filter-modal__search-section">
                  <h3>Từ khóa</h3>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      commitSearch(searchInput);
                    }}
                  >
                    <Search size={18} />
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Tên vị trí, công ty hoặc địa điểm..."
                    />
                    {searchInput ? (
                      <button
                        type="button"
                        aria-label="Xóa từ khóa"
                        onClick={() => {
                          setSearchInput('');
                          commitSearch('', true);
                        }}
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                  </form>
                </section>
              </div>

              <footer className="jobs-filter-modal__footer">
                <button
                  type="button"
                  className="jobs-filter-modal__reset"
                  onClick={clearFiltersOnly}
                >
                  <RotateCcw size={17} />
                  Đặt lại bộ lọc
                </button>

                <button
                  type="button"
                  className="jobs-filter-modal__apply"
                  onClick={() => {
                    if (searchInput.trim() !== currentQuery) {
                      commitSearch(searchInput);
                    }
                    closeFilterModal();
                  }}
                >
                  Xem kết quả
                  {filterCount ? <span>{filterCount}</span> : null}
                </button>
              </footer>
            </section>
          </div>
        ) : null}

        <div className="jobs-safety-strip">
          <ShieldCheck size={19} />
          <div>
            <strong>Tìm việc an toàn</strong>
            <span>
              Không chuyển tiền để được nhận việc hoặc phỏng vấn; hãy xác minh
              doanh nghiệp trước khi cung cấp thông tin cá nhân quan trọng.
            </span>
          </div>
        </div>

        <section
          id="jobs-results"
          ref={resultsRef}
          className="jobs-results"
        >
          <header className="jobs-results__header">
            <div>
              <span className="jobs-results__eyebrow">
                <BriefcaseBusiness size={16} />
                Danh sách việc làm
              </span>

              <h2>
                {currentQuery
                  ? `Kết quả cho “${currentQuery}”`
                  : hasFilters
                    ? 'Việc làm phù hợp với bộ lọc'
                    : 'Việc làm mới nhất'}
              </h2>

              {!result.loading && !result.error ? (
                <p>
                  {total > 0 ? (
                    <>
                      Hiển thị <strong>{fromItem}–{toItem}</strong> trong tổng số{' '}
                      <strong>{total.toLocaleString('vi-VN')}</strong> việc làm.
                    </>
                  ) : (
                    'Chưa có công việc phù hợp.'
                  )}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="jobs-results__reload"
              disabled={result.loading}
              onClick={result.reload}
            >
              <RefreshCw
                size={16}
                className={result.loading ? 'is-spinning' : ''}
              />
              Làm mới
            </button>
          </header>

          <div className="jobs-results__body">
            {result.loading ? (
              <LoadingBlock />
            ) : result.error ? (
              <ErrorState
                error={result.error}
                onRetry={result.reload}
              />
            ) : result.items.length ? (
              <div className="jobs-list">
                {result.items.map((item) => (
                  <article
                    className="jobs-item"
                    key={item._id}
                  >
                    <JobCard item={item} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="jobs-empty-state">
                <span>
                  <BriefcaseBusiness size={39} />
                </span>

                <h3>Chưa có việc làm phù hợp</h3>

                <p>
                  {hasFilters
                    ? 'Hãy thử thay đổi loại công việc, khu vực, kinh nghiệm hoặc từ khóa tìm kiếm.'
                    : 'Hiện chưa có tin tuyển dụng nào được đăng trong hệ thống.'}
                </p>

                <div>
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                    >
                      <RotateCcw size={17} />
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
        </section>

        {!result.loading && !result.error && result.items.length ? (
          <div className="jobs-pagination">
            <Pagination
              meta={result.meta}
              onPageChange={setPage}
            />

            {result.meta?.totalPages ? (
              <p>
                Trang {currentPage} / {result.meta.totalPages}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
