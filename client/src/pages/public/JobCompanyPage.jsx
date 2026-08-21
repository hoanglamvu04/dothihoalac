import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Search,
  UsersRound,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import JobCard from '../../components/content/JobCard';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import { jobCompanyApi } from '../../api/jobCompany.api';
import { JOB_TYPES } from '../../utils/constants';

import './JobCompanyPage.css';

const SORT_OPTIONS = [
  { value: '', label: 'Mới nhất' },
  { value: 'deadline_asc', label: 'Sắp hết hạn' },
  { value: 'deadline_desc', label: 'Hạn xa nhất' },
];

function companyInitials(name) {
  return String(name || 'NTD')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function JobCompanyPage() {
  const { slug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const currentPage = Math.max(Number(searchParams.get('page') || 1), 1);
  const currentType = searchParams.get('type') || '';
  const currentSort = searchParams.get('sort') || '';
  const currentQuery = searchParams.get('q') || '';

  const requestParams = useMemo(
    () => ({
      page: currentPage,
      limit: 12,
      type: currentType || undefined,
      sort: currentSort || undefined,
      q: currentQuery || undefined,
    }),
    [currentPage, currentQuery, currentSort, currentType],
  );

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);

    jobCompanyApi
      .detail(slug, requestParams)
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestParams, slug]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  const setParam = useCallback(
    (key, value) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        const cleanValue = String(value ?? '').trim();

        if (cleanValue) next.set(key, cleanValue);
        else next.delete(key);

        if (key !== 'page') next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const company = data?.company || null;
  const items = data?.items || [];
  const meta = data?.meta || {};
  const hasFilters = Boolean(currentType || currentSort || currentQuery);

  if (loading && !data) {
    return (
      <section className="job-company-page">
        <div className="job-company-page__container">
          <LoadingBlock />
        </div>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="job-company-page">
        <div className="job-company-page__container">
          <Link className="job-company-back" to="/viec-lam">
            <ArrowLeft size={16} />
            Quay lại trang việc làm
          </Link>
          <ErrorState error={error} onRetry={() => load()} />
        </div>
      </section>
    );
  }

  return (
    <section className="job-company-page">
      <Seo
        title={`${company?.name || 'Nhà tuyển dụng'} | Việc làm Hòa Lạc`}
        description={`Các vị trí đang tuyển của ${company?.name || 'doanh nghiệp'} tại Hòa Lạc và khu vực lân cận.`}
      />

      <div className="job-company-page__container">
        <Link className="job-company-back" to="/viec-lam">
          <ArrowLeft size={16} />
          Tất cả việc làm
        </Link>

        <header className="job-company-hero">
          <div className="job-company-hero__identity">
            <span className="job-company-logo" aria-hidden="true">
              {companyInitials(company?.name)}
            </span>
            <div>
              <span className="job-company-eyebrow">
                <Building2 size={15} />
                Hồ sơ nhà tuyển dụng
              </span>
              <h1>{company?.name}</h1>
              <p>
                Hồ sơ này được tổng hợp từ các tin tuyển dụng công khai còn hiệu lực
                của doanh nghiệp trên Đô Thị Hòa Lạc.
              </p>
            </div>
          </div>

          <div className="job-company-hero__stats">
            <div>
              <BriefcaseBusiness size={19} />
              <strong>{Number(company?.activeJobs || 0).toLocaleString('vi-VN')}</strong>
              <span>Việc đang tuyển</span>
            </div>
            <div>
              <UsersRound size={19} />
              <strong>{Number(company?.openPositions || 0).toLocaleString('vi-VN')}</strong>
              <span>Vị trí cần tuyển</span>
            </div>
            <div>
              <CalendarDays size={19} />
              <strong>{formatDate(company?.nextDeadline) || '—'}</strong>
              <span>Hạn gần nhất</span>
            </div>
          </div>

          {company?.locations?.length ? (
            <div className="job-company-location-list">
              {company.locations.map((location) => (
                <span key={location}>
                  <MapPin size={14} />
                  {location}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="job-company-layout">
          <main className="job-company-main">
            <section className="job-company-jobs-card">
              <header className="job-company-section-head">
                <div>
                  <span>Đang tuyển dụng</span>
                  <h2>Các vị trí tại {company?.name}</h2>
                  <p>
                    {meta?.total
                      ? `${Number(meta.total).toLocaleString('vi-VN')} tin phù hợp.`
                      : 'Chưa có tin phù hợp với bộ lọc.'}
                  </p>
                </div>
              </header>

              <form
                className="job-company-controls"
                onSubmit={(event) => {
                  event.preventDefault();
                  setParam('q', searchInput);
                }}
              >
                <label className="job-company-search">
                  <Search size={17} />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Tìm vị trí hoặc địa điểm..."
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      aria-label="Xóa từ khóa"
                      onClick={() => {
                        setSearchInput('');
                        setParam('q', '');
                      }}
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </label>

                <select
                  value={currentType}
                  onChange={(event) => setParam('type', event.target.value)}
                  aria-label="Loại công việc"
                >
                  <option value="">Tất cả loại việc</option>
                  {Object.entries(JOB_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={currentSort}
                  onChange={(event) => setParam('sort', event.target.value)}
                  aria-label="Sắp xếp"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button type="submit">Tìm</button>
              </form>

              {hasFilters ? (
                <div className="job-company-filter-summary">
                  <span>Đang áp dụng bộ lọc cho riêng doanh nghiệp này.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearchParams(new URLSearchParams());
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : null}

              <div className="job-company-results">
                {loading ? (
                  <LoadingBlock />
                ) : error ? (
                  <ErrorState error={error} onRetry={() => load()} compact />
                ) : items.length ? (
                  items.map((item) => (
                    <article className="job-company-job" key={item._id}>
                      <JobCard item={item} />
                    </article>
                  ))
                ) : (
                  <div className="job-company-empty">
                    <BriefcaseBusiness size={34} />
                    <h3>Chưa có vị trí phù hợp</h3>
                    <p>Hãy thử xóa bộ lọc hoặc quay lại trang việc làm để xem thêm cơ hội khác.</p>
                  </div>
                )}
              </div>

              {!loading && !error && items.length && Number(meta?.totalPages || 0) > 1 ? (
                <div className="job-company-pagination">
                  <Pagination
                    meta={meta}
                    onPageChange={(page) => setParam('page', page <= 1 ? '' : page)}
                  />
                </div>
              ) : null}
            </section>
          </main>

          <aside className="job-company-sidebar">
            <section className="job-company-info-card">
              <span className="job-company-card-eyebrow">Thông tin tuyển dụng</span>
              <h2>{company?.name}</h2>

              {company?.jobTypes?.length ? (
                <div className="job-company-type-list">
                  {company.jobTypes.map((type) => (
                    <span key={type}>{JOB_TYPES[type] || type}</span>
                  ))}
                </div>
              ) : null}

              <dl>
                <div>
                  <dt>Việc đang mở</dt>
                  <dd>{Number(company?.activeJobs || 0).toLocaleString('vi-VN')}</dd>
                </div>
                <div>
                  <dt>Nhu cầu tuyển</dt>
                  <dd>{Number(company?.openPositions || 0).toLocaleString('vi-VN')} vị trí</dd>
                </div>
              </dl>

              {company?.contactEmail || company?.contactPhone ? (
                <div className="job-company-contact">
                  <strong>Liên hệ tuyển dụng</strong>
                  {company.contactEmail ? (
                    <a href={`mailto:${company.contactEmail}`}>
                      <Mail size={15} />
                      {company.contactEmail}
                    </a>
                  ) : null}
                  {company.contactPhone ? (
                    <a href={`tel:${company.contactPhone}`}>
                      <Phone size={15} />
                      {company.contactPhone}
                    </a>
                  ) : null}
                </div>
              ) : null}

              <Link className="job-company-all-jobs" to="/viec-lam">
                <BriefcaseBusiness size={16} />
                Xem tất cả việc làm
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
