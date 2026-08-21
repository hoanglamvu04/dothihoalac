import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Filter,
  GraduationCap,
  LayoutGrid,
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

const DISCOVERY_TYPES = [
  'full_time',
  'part_time',
  'internship',
  'construction',
  'service',
  'student',
];

const JOB_TYPE_META = {
  full_time: {
    icon: BriefcaseBusiness,
    tone: 'green',
  },
  part_time: {
    icon: Clock3,
    tone: 'blue',
  },
  internship: {
    icon: GraduationCap,
    tone: 'cyan',
  },
  temporary: {
    icon: CalendarDays,
    tone: 'orange',
  },
  student: {
    icon: GraduationCap,
    tone: 'violet',
  },
  construction: {
    icon: Building2,
    tone: 'amber',
  },
  service: {
    icon: Sparkles,
    tone: 'pink',
  },
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

function buildCompanies(items) {
  const companies = new Map();

  items.forEach((item) => {
    const name = String(item?.job?.companyName || '').trim();
    if (!name) return;

    const key = name.toLocaleLowerCase('vi-VN');
    if (!companies.has(key)) {
      companies.set(key, {
        name,
        count: 0,
      });
    }

    companies.get(key).count += 1;
  });

  return [...companies.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'))
    .slice(0, 6);
}

function companySlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function companyInitials(name) {
  return String(name || 'NTD')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { areas = [] } = useTaxonomy();

  const resultsRef = useRef(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
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
  }, [setUrlParams]);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');

    setUrlParams((next) => {
      QUERY_KEYS.forEach((key) => next.delete(key));
    });
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

  const featuredCompanies = useMemo(
    () => buildCompanies(result.items),
    [result.items],
  );

  const featuredJobs = result.items.slice(0, 4);

  return (
    <section className="jobs-page">
      <Seo
        title="Việc làm Hòa Lạc"
        description="Tuyển dụng, tìm việc, thực tập và việc làm thời vụ tại Hòa Lạc."
      />

      <div className="jobs-page__container">
        <section className="jobs-market-hero">
          <div className="jobs-market-hero__copy">
            <span className="jobs-market-hero__eyebrow">
              <BriefcaseBusiness size={17} />
              Việc làm tại Hòa Lạc
            </span>

            <h1>Việc làm tại Hòa Lạc</h1>

            <h2>Cơ hội nghề nghiệp chất lượng — Gần bạn, cho tương lai</h2>

            <p>
              Nơi kết nối nhân tài với doanh nghiệp, tổ chức và dự án đang phát
              triển mạnh tại Hòa Lạc và khu vực lân cận.
            </p>

            <div className="jobs-market-hero__chips">
              <span>
                <MapPin size={15} />
                Việc tốt gần bạn
              </span>
              <span>
                <ShieldCheck size={15} />
                Tin tuyển dụng rõ ràng
              </span>
              <span>
                <GraduationCap size={15} />
                Cơ hội cho người mới bắt đầu
              </span>
            </div>
          </div>

          <div className="jobs-market-hero__art" aria-hidden="true">
            <span className="jobs-market-hero__sun" />
            <span className="jobs-market-hero__hill jobs-market-hero__hill--back" />
            <span className="jobs-market-hero__hill jobs-market-hero__hill--front" />

            <div className="jobs-market-campus">
              <span className="jobs-market-campus__building jobs-market-campus__building--1">
                <Building2 size={44} />
              </span>
              <span className="jobs-market-campus__building jobs-market-campus__building--2">
                <Building2 size={54} />
              </span>
              <span className="jobs-market-campus__building jobs-market-campus__building--3">
                <Building2 size={62} />
              </span>
              <span className="jobs-market-campus__tree jobs-market-campus__tree--1" />
              <span className="jobs-market-campus__tree jobs-market-campus__tree--2" />
              <span className="jobs-market-campus__tree jobs-market-campus__tree--3" />
              <span className="jobs-market-campus__road" />
              <strong>KHU CÔNG NGHỆ CAO · HÒA LẠC</strong>
            </div>
          </div>
        </section>

        <form
          className="jobs-market-search"
          onSubmit={(event) => {
            event.preventDefault();
            commitSearch(searchInput);
          }}
        >
          <label className="jobs-market-search__keyword">
            <Search size={18} />
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
                <X size={15} />
              </button>
            ) : null}
          </label>

          <label className="jobs-market-search__select">
            <MapPin size={17} />
            <select
              value={currentArea}
              onChange={(event) => update('area', event.target.value)}
              aria-label="Khu vực làm việc"
            >
              <option value="">Hòa Lạc và khu vực</option>
              {areas.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="jobs-market-search__select">
            <BriefcaseBusiness size={17} />
            <select
              value={currentType}
              onChange={(event) => update('type', event.target.value)}
              aria-label="Loại công việc"
            >
              <option value="">Tất cả loại công việc</option>
              {Object.entries(JOB_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">
            <Search size={17} />
            Tìm kiếm việc làm
          </button>
        </form>

        <section className="jobs-discovery">
          <header className="jobs-section-heading">
            <div>
              <span>Khám phá nhanh</span>
              <h2>Khám phá theo loại công việc</h2>
            </div>
            <button type="button" onClick={() => setFiltersOpen(true)}>
              Xem bộ lọc đầy đủ
              <SlidersHorizontal size={15} />
            </button>
          </header>

          <div className="jobs-discovery__grid">
            {DISCOVERY_TYPES.map((value) => {
              const meta = JOB_TYPE_META[value] || JOB_TYPE_META.full_time;
              const TypeIcon = meta.icon;
              const selected = currentType === value;

              return (
                <button
                  type="button"
                  key={value}
                  className={selected ? 'is-active' : ''}
                  onClick={() => update('type', selected ? '' : value)}
                >
                  <span className={`jobs-discovery__icon is-${meta.tone}`}>
                    <TypeIcon size={20} />
                  </span>
                  <span>
                    <strong>{JOB_TYPES[value]}</strong>
                    <small>{selected ? 'Đang lọc' : 'Xem cơ hội phù hợp'}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {!result.loading && !result.error && result.items.length ? (
          <section className="jobs-market-highlights">
            <article className="jobs-employers-panel">
              <header className="jobs-panel-heading">
                <div>
                  <span>Doanh nghiệp đang tuyển</span>
                  <h2>Nhà tuyển dụng nổi bật</h2>
                </div>
              </header>

              {featuredCompanies.length ? (
                <div className="jobs-employers-panel__companies">
                  {featuredCompanies.map((company) => (
                    <button
                      type="button"
                      key={company.name}
                      onClick={() => {
                        const slug = companySlug(company.name);
                        if (slug) navigate(`/viec-lam/cong-ty/${slug}`);
                      }}
                    >
                      <span>{companyInitials(company.name)}</span>
                      <strong>{company.name}</strong>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="jobs-employers-panel__empty">
                  Chưa có đủ dữ liệu doanh nghiệp để hiển thị.
                </p>
              )}

              <div className="jobs-employer-cta">
                <div>
                  <strong>Bạn là nhà tuyển dụng?</strong>
                  <span>Đăng tin và tiếp cận ứng viên tại khu vực Hòa Lạc.</span>
                </div>
                <Link to="/dang-bai/viec-lam">
                  <Plus size={15} />
                  Đăng tin ngay
                </Link>
              </div>
            </article>

            <article className="jobs-featured-panel">
              <header className="jobs-panel-heading jobs-panel-heading--row">
                <div>
                  <span>Cập nhật mới</span>
                  <h2>Việc làm đáng chú ý</h2>
                </div>
                <a href="#jobs-results">Xem tất cả</a>
              </header>

              <div className="jobs-featured-panel__grid">
                {featuredJobs.map((item) => (
                  <div className="jobs-featured-card" key={item._id}>
                    <JobCard item={item} />
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        <section
          id="jobs-results"
          ref={resultsRef}
          className="jobs-results"
        >
          <div className="jobs-results__main">
            <header className="jobs-results__header">
              <div>
                <span className="jobs-results__eyebrow">
                  <BriefcaseBusiness size={15} />
                  Danh sách việc làm
                </span>
                <h2>
                  {currentQuery
                    ? `Kết quả cho “${currentQuery}”`
                    : hasFilters
                      ? 'Việc làm phù hợp với bộ lọc'
                      : 'Việc làm mới nhất tại Hòa Lạc'}
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
                  size={15}
                  className={result.loading ? 'is-spinning' : ''}
                />
                Làm mới
              </button>
            </header>

            <div className="jobs-results-controls">
              <div className="jobs-results-controls__types">
                <button
                  type="button"
                  className={!currentType ? 'is-active' : ''}
                  onClick={() => update('type', '')}
                >
                  Tất cả
                </button>
                {['full_time', 'part_time', 'internship'].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={currentType === value ? 'is-active' : ''}
                    onClick={() =>
                      update('type', currentType === value ? '' : value)
                    }
                  >
                    {JOB_TYPES[value]}
                  </button>
                ))}
              </div>

              <div className="jobs-results-controls__actions">
                <label>
                  <SortIcon size={15} />
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

                <button type="button" onClick={() => setFiltersOpen(true)}>
                  <Filter size={15} />
                  Lọc
                  {filterCount ? <b>{filterCount}</b> : null}
                </button>

                <div className="jobs-view-switch" aria-label="Kiểu hiển thị">
                  <button
                    type="button"
                    className={viewMode === 'grid' ? 'is-active' : ''}
                    aria-label="Hiển thị dạng lưới"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'list' ? 'is-active' : ''}
                    aria-label="Hiển thị dạng danh sách"
                    onClick={() => setViewMode('list')}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {hasFilters ? (
              <div className="jobs-active-filters">
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
                  <RotateCcw size={13} />
                  Đặt lại
                </button>
              </div>
            ) : null}

            <div className="jobs-results__body">
              {result.loading ? (
                <LoadingBlock />
              ) : result.error ? (
                <ErrorState
                  error={result.error}
                  onRetry={result.reload}
                />
              ) : result.items.length ? (
                <div
                  className={`jobs-list${
                    viewMode === 'grid' ? ' jobs-list--grid' : ''
                  }`}
                >
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
                    <BriefcaseBusiness size={38} />
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
                        <RotateCcw size={16} />
                        Xóa bộ lọc
                      </button>
                    ) : null}
                    <Link to="/dang-bai/viec-lam">
                      <Plus size={16} />
                      Đăng tin tuyển dụng
                    </Link>
                  </div>
                </div>
              )}
            </div>

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

          <aside className="jobs-safety-card">
            <div className="jobs-safety-card__art" aria-hidden="true">
              <span>
                <ShieldCheck size={34} />
              </span>
              <span>
                <UsersRound size={28} />
              </span>
            </div>
            <span className="jobs-safety-card__eyebrow">Ứng tuyển an toàn</span>
            <h3>Tìm việc rõ ràng, bảo vệ thông tin của bạn</h3>
            <p>
              Kiểm tra doanh nghiệp và mô tả công việc trước khi gửi hồ sơ hoặc
              cung cấp thông tin cá nhân quan trọng.
            </p>
            <ul>
              <li>
                <Check size={14} />
                Không chuyển tiền để được nhận việc hoặc phỏng vấn.
              </li>
              <li>
                <Check size={14} />
                Ưu tiên tin có thông tin công ty và địa điểm rõ ràng.
              </li>
              <li>
                <Check size={14} />
                Liên hệ nhà tuyển dụng qua kênh chính thức khi có thể.
              </li>
            </ul>
            <Link to="/dang-bai/viec-lam">
              <Plus size={15} />
              Đăng tin tuyển dụng
            </Link>
          </aside>
        </section>

        {filtersOpen ? (
          <div className="jobs-filter-modal-layer">
            <button
              type="button"
              className="jobs-filter-modal-backdrop"
              aria-label="Đóng bộ lọc"
              onClick={() => setFiltersOpen(false)}
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
                  onClick={() => setFiltersOpen(false)}
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
                    setFiltersOpen(false);
                  }}
                >
                  Xem kết quả
                  {filterCount ? <span>{filterCount}</span> : null}
                </button>
              </footer>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}