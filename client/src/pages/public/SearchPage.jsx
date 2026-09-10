import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Clock3,
  MapPin,
  MessageCircle,
  Newspaper,
  Search,
  SearchX,
  UsersRound,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Avatar from '../../components/common/Avatar';
import ContentImage from '../../components/content/ContentImage';
import ContentMeta from '../../components/content/ContentMeta';
import { searchApi } from '../../api/content.api';
import { contentPath } from '../../utils/content';
import { truncate } from '../../utils/formatters';
import {
  getRecentSearches,
  saveRecentSearch,
} from '../../utils/storage';

import './SearchPage.css';
import '../../styles/search-page-sidebar-polish.css';

const PAGE_LIMIT = 12;

const EMPTY_FACETS = {
  all: 0,
  article: 0,
  property: 0,
  job: 0,
  community: 0,
  user: 0,
  area: 0,
};

const EMPTY_RESULT = {
  data: {
    contents: [],
    users: [],
    areas: [],
    facets: EMPTY_FACETS,
    sort: 'relevance',
  },
  meta: {},
};

const SEARCH_TYPES = [
  { value: 'all', label: 'Tất cả', icon: Search },
  { value: 'article', label: 'Tin tức', icon: Newspaper },
  { value: 'property', label: 'Bất động sản', icon: Building2 },
  { value: 'job', label: 'Việc làm', icon: BriefcaseBusiness },
  { value: 'community', label: 'Cộng đồng', icon: MessageCircle },
  { value: 'user', label: 'Thành viên', icon: UsersRound },
  { value: 'area', label: 'Khu vực', icon: MapPin },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Liên quan' },
  { value: 'newest', label: 'Mới nhất' },
];

const SUGGESTED_SEARCHES = [
  'Tin tức Hòa Lạc',
  'Quy hoạch Hòa Lạc',
  'Việc làm Hòa Lạc',
  'Bất động sản Hòa Lạc',
  'Đại học Quốc gia Hà Nội',
  'Thạch Thất',
  'Tây Phương',
  'Hạ Bằng',
];

const KEYWORD_SEARCHES = [
  'Hòa Lạc',
  'ĐHQG Hà Nội',
  'Thạch Thất',
  'Tây Phương',
  'Hạ Bằng',
  'Quy hoạch',
  'Bất động sản',
  'Việc làm',
  'Giáo dục',
  'Chuyển đổi số',
];

function normalizeResult(value) {
  const data = value?.data && typeof value.data === 'object' ? value.data : {};
  const rawFacets = data.facets && typeof data.facets === 'object' ? data.facets : {};

  return {
    data: {
      contents: Array.isArray(data.contents) ? data.contents : [],
      users: Array.isArray(data.users) ? data.users : [],
      areas: Array.isArray(data.areas) ? data.areas : [],
      facets: {
        ...EMPTY_FACETS,
        ...rawFacets,
      },
      sort: data.sort === 'newest' ? 'newest' : 'relevance',
    },
    meta: value?.meta && typeof value.meta === 'object' ? value.meta : {},
  };
}

function loadRecentSearches() {
  try {
    const values = getRecentSearches();
    return Array.isArray(values) ? values.filter(Boolean).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function getTotal(meta, fallback) {
  const value = Number(
    meta?.total ??
      meta?.totalItems ??
      meta?.itemCount ??
      meta?.count ??
      fallback,
  );

  return Number.isFinite(value) ? value : fallback;
}

function getTotalPages(meta) {
  const value = Number(meta?.totalPages ?? meta?.pageCount ?? meta?.pages ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function itemId(item, prefix, index) {
  return String(
    item?._id ||
      item?.id ||
      item?.slug ||
      item?.username ||
      `${prefix}-${index}`,
  );
}

function SearchContentItem({ item }) {
  const href = contentPath(item);
  const category =
    item?.primaryCategoryId?.name ||
    SEARCH_TYPES.find((entry) => entry.value === item?.contentType)?.label ||
    'Nội dung';

  return (
    <article className="search-result-item">
      <Link className="search-result-item__media" to={href} tabIndex={-1}>
        <ContentImage
          media={item.thumbnailMediaId}
          alt={item.title}
          className="search-result-item__image"
          fallback={
            <span className="search-result-item__placeholder">
              {item.contentType === 'property' ? (
                <Building2 size={28} />
              ) : item.contentType === 'job' ? (
                <BriefcaseBusiness size={28} />
              ) : item.contentType === 'community' ? (
                <MessageCircle size={28} />
              ) : (
                <Newspaper size={28} />
              )}
            </span>
          }
        />
      </Link>

      <div className="search-result-item__body">
        <span className="search-result-item__category">{category}</span>
        <h3>
          <Link to={href}>{item.title}</Link>
        </h3>
        {item.summary ? <p>{truncate(item.summary, 190)}</p> : null}
        <ContentMeta item={item} compact />
      </div>
    </article>
  );
}

function UserResult({ user }) {
  return (
    <Link className="search-person-item" to={`/thanh-vien/${user.username}`}>
      <Avatar
        name={user.displayName || user.username}
        src={user.avatarUrl || user.avatar}
      />
      <span>
        <strong>{user.displayName || user.username}</strong>
        <small>@{user.username}</small>
      </span>
      <ArrowRight size={17} />
    </Link>
  );
}

function AreaResult({ area }) {
  return (
    <Link className="search-area-item" to={`/khu-vuc/${area.slug}`}>
      <span className="search-area-item__icon">
        <MapPin size={19} />
      </span>
      <span>
        <strong>{area.name}</strong>
        <small>{truncate(area.description || 'Xem nội dung tại khu vực này.', 90)}</small>
      </span>
      <ArrowRight size={17} />
    </Link>
  );
}

function ResultSkeleton() {
  return (
    <div className="search-skeleton" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item}>
          <span />
          <section>
            <i />
            <i />
            <i />
          </section>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resultsRef = useRef(null);
  const searchInputRef = useRef(null);

  const q = searchParams.get('q')?.trim() || '';
  const requestedType = searchParams.get('type') || 'all';
  const type = SEARCH_TYPES.some((item) => item.value === requestedType)
    ? requestedType
    : 'all';
  const requestedSort = searchParams.get('sort') || 'relevance';
  const sort = SORT_OPTIONS.some((item) => item.value === requestedSort)
    ? requestedSort
    : 'relevance';
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);

  const [query, setQuery] = useState(q);
  const [result, setResult] = useState(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);

  useEffect(() => {
    setQuery(q);
  }, [q]);

  useEffect(() => {
    if (!q) {
      setResult(EMPTY_RESULT);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);

    try {
      saveRecentSearch(q);
      setRecentSearches(loadRecentSearches());
    } catch {
      // Lịch sử tìm kiếm chỉ là tiện ích phụ.
    }

    searchApi
      .run({ q, type, sort, page, limit: PAGE_LIMIT })
      .then((response) => {
        if (active) setResult(normalizeResult(response));
      })
      .catch((requestError) => {
        if (!active) return;
        setResult(EMPTY_RESULT);
        setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, q, reloadKey, sort, type]);

  const contents = result.data.contents || [];
  const users = result.data.users || [];
  const areas = result.data.areas || [];
  const facets = result.data.facets || EMPTY_FACETS;
  const visibleCount = contents.length + users.length + areas.length;
  const pageTotal = getTotal(result.meta, visibleCount);
  const displayTotal = Number(facets[type] ?? pageTotal) || 0;
  const totalPages = getTotalPages(result.meta);
  const selectedType =
    SEARCH_TYPES.find((item) => item.value === type) || SEARCH_TYPES[0];
  const contentSortEnabled = type !== 'user' && type !== 'area';

  const buildParams = useCallback(
    ({ nextQuery = q, nextType = type, nextSort = sort, nextPage = 1 } = {}) => {
      const params = {
        q: nextQuery,
        type: nextType,
        page: String(nextPage),
      };

      if (nextSort !== 'relevance') params.sort = nextSort;
      return params;
    },
    [q, sort, type],
  );

  const scrollToResults = useCallback(() => {
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 20);
  }, []);

  const submit = useCallback(
    (event) => {
      event.preventDefault();
      const normalizedQuery = query.trim();

      if (!normalizedQuery) {
        searchInputRef.current?.focus();
        return;
      }

      setSearchParams(buildParams({ nextQuery: normalizedQuery, nextPage: 1 }));
    },
    [buildParams, query, setSearchParams],
  );

  const searchTerm = useCallback(
    (term, nextType = 'all') => {
      const normalizedTerm = String(term || '').trim();
      if (!normalizedTerm) return;

      setQuery(normalizedTerm);
      setSearchParams(
        buildParams({
          nextQuery: normalizedTerm,
          nextType,
          nextPage: 1,
        }),
      );
    },
    [buildParams, setSearchParams],
  );

  const changeType = useCallback(
    (value) => {
      if (!q) return;
      setSearchParams(buildParams({ nextType: value, nextPage: 1 }));
      scrollToResults();
    },
    [buildParams, q, scrollToResults, setSearchParams],
  );

  const changeSort = useCallback(
    (event) => {
      if (!q) return;
      const nextSort = event.target.value === 'newest' ? 'newest' : 'relevance';
      setSearchParams(buildParams({ nextSort, nextPage: 1 }));
      scrollToResults();
    },
    [buildParams, q, scrollToResults, setSearchParams],
  );

  const changePage = useCallback(
    (value) => {
      const nextPage = Math.max(Number(value) || 1, 1);
      setSearchParams(buildParams({ nextPage }));
      scrollToResults();
    },
    [buildParams, scrollToResults, setSearchParams],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResult(EMPTY_RESULT);
    setError(null);
    setSearchParams({});
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [setSearchParams]);

  const hasResults = visibleCount > 0;

  const countForType = useCallback(
    (value) => Number(facets[value] || 0),
    [facets],
  );

  return (
    <main className="search-page">
      <Seo
        title={q ? `Tìm kiếm: ${q}` : 'Tìm kiếm'}
        description="Tìm tin tức, bất động sản, việc làm, cộng đồng, thành viên và khu vực trên Đô Thị Hòa Lạc."
        noindex
      />

      <section className="search-hero">
        <div className="search-page-container search-hero__inner">
          <div className="search-hero__content">
            <div className="search-page-title">
              <span>Tìm kiếm</span>
              <h1>{q ? `Kết quả cho “${q}”` : 'Bạn đang cần tìm gì?'}</h1>
              <p>
                Tìm thấy những nội dung hữu ích về Hòa Lạc và khu vực lân cận phù hợp với từ khóa của bạn.
              </p>
            </div>

            <form className="search-page-form" onSubmit={submit} role="search">
              <Search size={20} />
              <input
                ref={searchInputRef}
                value={query}
                autoComplete="off"
                aria-label="Từ khóa tìm kiếm"
                placeholder="Tin tức, quy hoạch, nhà đất, việc làm..."
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button
                  type="button"
                  className="search-page-form__clear"
                  aria-label="Xóa từ khóa"
                  onClick={() => setQuery('')}
                >
                  <X size={16} />
                </button>
              ) : null}
              <button type="submit" className="search-page-form__submit">
                <Search size={16} />
                <span>Tìm kiếm</span>
              </button>
            </form>
          </div>

          <div className="search-hero__visual" aria-hidden="true">
            <span className="search-hero__script">Hòa Lạc</span>
            <strong>Kết nối hôm nay</strong>
            <small>Kiến tạo ngày mai</small>
            <i className="search-hero__ridge search-hero__ridge--back" />
            <i className="search-hero__ridge search-hero__ridge--front" />
            <i className="search-hero__city" />
          </div>
        </div>
      </section>

      <div className="search-page-container search-page-content">
        {!q ? (
          <section className="search-start">
            {recentSearches.length ? (
              <div className="search-start__card">
                <h2><Clock3 size={18} /> Gần đây</h2>
                <div className="search-chip-list">
                  {recentSearches.map((term) => (
                    <button type="button" key={term} onClick={() => searchTerm(term)}>
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="search-start__card">
              <h2><Search size={18} /> Gợi ý tìm kiếm</h2>
              <div className="search-chip-list">
                {SUGGESTED_SEARCHES.map((term) => (
                  <button type="button" key={term} onClick={() => searchTerm(term)}>
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section ref={resultsRef} className="search-results">
            <nav className="search-tabs" aria-label="Nhóm kết quả tìm kiếm">
              {SEARCH_TYPES.map((item) => {
                const Icon = item.icon;
                const count = countForType(item.value);

                return (
                  <button
                    type="button"
                    key={item.value}
                    className={type === item.value ? 'is-active' : ''}
                    onClick={() => changeType(item.value)}
                  >
                    <Icon size={16} />
                    {item.label}
                    {count > 0 ? <small>{count.toLocaleString('vi-VN')}</small> : null}
                  </button>
                );
              })}
            </nav>

            <div className="search-workspace">
              <div className="search-results-main">
                <div className="search-results-summary">
                  <p>
                    {loading
                      ? 'Đang tìm kiếm…'
                      : error
                        ? 'Không thể tải kết quả.'
                        : hasResults
                          ? <><strong>{displayTotal.toLocaleString('vi-VN')}</strong> kết quả cho <b>“{q}”</b></>
                          : <>Không tìm thấy kết quả cho <b>“{q}”</b>.</>}
                  </p>
                  <div>
                    <span>{selectedType.label}</span>
                    {contentSortEnabled ? (
                      <label className="search-sort-control">
                        <span>Sắp xếp</span>
                        <select value={sort} onChange={changeSort} aria-label="Sắp xếp kết quả">
                          {SORT_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <button type="button" onClick={clearSearch}>
                      <X size={14} /> Xóa tìm kiếm
                    </button>
                  </div>
                </div>

                {loading ? (
                  <ResultSkeleton />
                ) : error ? (
                  <div className="search-error">
                    <ErrorState error={error} />
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                      Thử lại
                    </button>
                  </div>
                ) : hasResults ? (
                  <div className="search-results-body">
                    {contents.length ? (
                      <div className="search-content-list">
                        {contents.map((item, index) => (
                          <SearchContentItem item={item} key={itemId(item, 'content', index)} />
                        ))}
                      </div>
                    ) : null}

                    {users.length ? (
                      <section className="search-result-group">
                        <header className="search-result-group__heading">
                          <div>
                            <UsersRound size={18} />
                            <h2>Thành viên</h2>
                            <span>{countForType('user').toLocaleString('vi-VN')}</span>
                          </div>
                        </header>
                        <div className="search-people-list">
                          {users.map((user, index) => (
                            <UserResult user={user} key={itemId(user, 'user', index)} />
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {areas.length ? (
                      <section className="search-result-group">
                        <header className="search-result-group__heading">
                          <div>
                            <MapPin size={18} />
                            <h2>Khu vực</h2>
                            <span>{countForType('area').toLocaleString('vi-VN')}</span>
                          </div>
                        </header>
                        <div className="search-area-list">
                          {areas.map((area, index) => (
                            <AreaResult area={area} key={itemId(area, 'area', index)} />
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                ) : (
                  <div className="search-empty">
                    <EmptyState
                      title="Không tìm thấy kết quả"
                      description={`Không có dữ liệu phù hợp với “${q}”. Thử đổi nhóm hoặc dùng từ khóa ngắn hơn.`}
                    />
                    <div className="search-empty__suggestions">
                      <strong><SearchX size={17} /> Gợi ý khác</strong>
                      <div className="search-chip-list">
                        {SUGGESTED_SEARCHES.slice(0, 5).map((term) => (
                          <button type="button" key={term} onClick={() => searchTerm(term)}>
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!loading && !error && hasResults && totalPages > 1 ? (
                  <div className="search-pagination">
                    <Pagination
                      meta={{
                        ...result.meta,
                        page,
                        currentPage: page,
                        total: pageTotal,
                        totalPages,
                        limit: PAGE_LIMIT,
                      }}
                      onPageChange={changePage}
                    />
                  </div>
                ) : null}
              </div>

              <aside className="search-sidebar" aria-label="Bộ lọc và gợi ý tìm kiếm">
                <section className="search-sidebar-card search-quick-filter">
                  <h2>Bộ lọc nhanh</h2>
                  <div>
                    {SEARCH_TYPES.slice(1).map((item) => {
                      const Icon = item.icon;
                      const count = countForType(item.value);
                      return (
                        <button
                          type="button"
                          key={item.value}
                          className={type === item.value ? 'is-active' : ''}
                          onClick={() => changeType(item.value)}
                        >
                          <span><Icon size={16} /> {item.label}</span>
                          <small>{count.toLocaleString('vi-VN')}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="search-sidebar-card search-suggestion-card">
                  <h2>Gợi ý tìm kiếm</h2>
                  <div>
                    {SUGGESTED_SEARCHES.slice(0, 7).map((term) => (
                      <button type="button" key={term} onClick={() => searchTerm(term)}>
                        <Search size={14} />
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="search-sidebar-card search-keyword-card">
                  <h2>Từ khóa nổi bật</h2>
                  <div className="search-keyword-list">
                    {KEYWORD_SEARCHES.map((term) => (
                      <button type="button" key={term} onClick={() => searchTerm(term)}>
                        {term}
                      </button>
                    ))}
                  </div>
                </section>

                <Link className="search-sidebar-promo" to="/tin-tuc?category=quy-hoach">
                  <strong>Hòa Lạc</strong>
                  <span>Thành phố tri thức<br />vì một tương lai xanh</span>
                  <i><ArrowRight size={16} /></i>
                </Link>
              </aside>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
