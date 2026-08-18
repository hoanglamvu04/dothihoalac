import {
  useCallback,
  useEffect,
  useMemo,
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
  UserRound,
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

const PAGE_LIMIT = 12;

const EMPTY_RESULT = {
  data: {
    contents: [],
    users: [],
    areas: [],
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

const CONTENT_GROUPS = SEARCH_TYPES.filter((item) =>
  ['article', 'property', 'job', 'community'].includes(item.value),
);

const SUGGESTED_SEARCHES = [
  'Quy hoạch Hòa Lạc',
  'Khu Công nghệ cao',
  'Bất động sản Hòa Lạc',
  'Việc làm Hòa Lạc',
  'Hạ tầng giao thông',
  'Thạch Thất',
];

function normalizeResult(value) {
  const data =
    value?.data && typeof value.data === 'object'
      ? value.data
      : {};

  return {
    data: {
      contents: Array.isArray(data.contents) ? data.contents : [],
      users: Array.isArray(data.users) ? data.users : [],
      areas: Array.isArray(data.areas) ? data.areas : [],
    },
    meta:
      value?.meta && typeof value.meta === 'object'
        ? value.meta
        : {},
  };
}

function loadRecentSearches() {
  try {
    const values = getRecentSearches();
    return Array.isArray(values)
      ? values.filter(Boolean).slice(0, 6)
      : [];
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
  const value = Number(
    meta?.totalPages ?? meta?.pageCount ?? meta?.pages ?? 1,
  );

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
                <Building2 size={25} />
              ) : item.contentType === 'job' ? (
                <BriefcaseBusiness size={25} />
              ) : item.contentType === 'community' ? (
                <MessageCircle size={25} />
              ) : (
                <Newspaper size={25} />
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
        {item.summary ? <p>{truncate(item.summary, 180)}</p> : null}
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
      .run({ q, type, page, limit: PAGE_LIMIT })
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
  }, [page, q, reloadKey, type]);

  const contents = result.data.contents || [];
  const users = result.data.users || [];
  const areas = result.data.areas || [];
  const visibleCount = contents.length + users.length + areas.length;
  const total = getTotal(result.meta, visibleCount);
  const totalPages = getTotalPages(result.meta);
  const selectedType =
    SEARCH_TYPES.find((item) => item.value === type) || SEARCH_TYPES[0];

  const groupedContents = useMemo(() => {
    const map = new Map(CONTENT_GROUPS.map((item) => [item.value, []]));

    for (const item of contents) {
      if (map.has(item.contentType)) {
        map.get(item.contentType).push(item);
      }
    }

    return map;
  }, [contents]);

  const submit = useCallback(
    (event) => {
      event.preventDefault();
      const normalizedQuery = query.trim();

      if (!normalizedQuery) {
        searchInputRef.current?.focus();
        return;
      }

      setSearchParams({
        q: normalizedQuery,
        type,
        page: '1',
      });
    },
    [query, setSearchParams, type],
  );

  const searchTerm = useCallback(
    (term, nextType = 'all') => {
      const normalizedTerm = String(term || '').trim();
      if (!normalizedTerm) return;

      setQuery(normalizedTerm);
      setSearchParams({ q: normalizedTerm, type: nextType, page: '1' });
    },
    [setSearchParams],
  );

  const changeType = useCallback(
    (value) => {
      if (!q) return;
      setSearchParams({ q, type: value, page: '1' });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 20);
    },
    [q, setSearchParams],
  );

  const changePage = useCallback(
    (value) => {
      const nextPage = Math.max(Number(value) || 1, 1);
      setSearchParams({ q, type, page: String(nextPage) });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 20);
    },
    [q, setSearchParams, type],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResult(EMPTY_RESULT);
    setError(null);
    setSearchParams({});
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [setSearchParams]);

  const hasResults = visibleCount > 0;
  const contentTypeSelected = CONTENT_GROUPS.some((item) => item.value === type);

  const renderContentGroup = (group, items, showSwitch = false) => {
    if (!items.length) return null;
    const Icon = group.icon;

    return (
      <section className="search-result-group" key={group.value}>
        <header className="search-result-group__heading">
          <div>
            <Icon size={18} />
            <h2>{group.label}</h2>
            <span>{items.length}</span>
          </div>
          {showSwitch ? (
            <button type="button" onClick={() => changeType(group.value)}>
              Xem riêng mục này <ArrowRight size={15} />
            </button>
          ) : null}
        </header>

        <div className="search-content-list">
          {items.map((item, index) => (
            <SearchContentItem
              item={item}
              key={itemId(item, group.value, index)}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="search-page">
      <Seo
        title={q ? `Tìm kiếm: ${q}` : 'Tìm kiếm'}
        description="Tìm tin tức, bất động sản, việc làm, cộng đồng, thành viên và khu vực trên Đô Thị Hòa Lạc."
      />

      <div className="search-page-container">
        <header className="search-page-header">
          <div className="search-page-title">
            <span>Tìm kiếm</span>
            <h1>{q ? `Kết quả cho “${q}”` : 'Bạn đang cần tìm gì?'}</h1>
            <p>Tìm đúng nhóm nội dung thay vì phải lọc qua một trang tổng hợp dài.</p>
          </div>

          <form className="search-page-form" onSubmit={submit} role="search">
            <Search size={21} />
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
                <X size={17} />
              </button>
            ) : null}
            <button type="submit" className="search-page-form__submit">
              <Search size={17} />
              <span>Tìm</span>
            </button>
          </form>
        </header>

        {!q ? (
          <section className="search-start">
            {recentSearches.length ? (
              <div>
                <h2><Clock3 size={17} /> Gần đây</h2>
                <div className="search-chip-list">
                  {recentSearches.map((term) => (
                    <button type="button" key={term} onClick={() => searchTerm(term)}>
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <h2><Search size={17} /> Gợi ý</h2>
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
                return (
                  <button
                    type="button"
                    key={item.value}
                    className={type === item.value ? 'is-active' : ''}
                    onClick={() => changeType(item.value)}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="search-results-summary">
              <p>
                {loading
                  ? 'Đang tìm kiếm…'
                  : error
                    ? 'Không thể tải kết quả.'
                    : hasResults
                      ? `${total.toLocaleString('vi-VN')} kết quả · ${selectedType.label}`
                      : `Không tìm thấy kết quả trong ${selectedType.label.toLowerCase()}.`}
              </p>
              <button type="button" onClick={clearSearch}>
                <X size={15} /> Xóa tìm kiếm
              </button>
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
                {type === 'all' ? (
                  <>
                    {CONTENT_GROUPS.map((group) =>
                      renderContentGroup(group, groupedContents.get(group.value) || [], true),
                    )}

                    {users.length ? (
                      <section className="search-result-group">
                        <header className="search-result-group__heading">
                          <div><UsersRound size={18} /><h2>Thành viên</h2><span>{users.length}</span></div>
                          <button type="button" onClick={() => changeType('user')}>
                            Xem riêng mục này <ArrowRight size={15} />
                          </button>
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
                          <div><MapPin size={18} /><h2>Khu vực</h2><span>{areas.length}</span></div>
                          <button type="button" onClick={() => changeType('area')}>
                            Xem riêng mục này <ArrowRight size={15} />
                          </button>
                        </header>
                        <div className="search-area-list">
                          {areas.map((area, index) => (
                            <AreaResult area={area} key={itemId(area, 'area', index)} />
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </>
                ) : contentTypeSelected ? (
                  renderContentGroup(selectedType, contents)
                ) : type === 'user' ? (
                  <section className="search-result-group">
                    <div className="search-people-list">
                      {users.map((user, index) => (
                        <UserResult user={user} key={itemId(user, 'user', index)} />
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="search-result-group">
                    <div className="search-area-list">
                      {areas.map((area, index) => (
                        <AreaResult area={area} key={itemId(area, 'area', index)} />
                      ))}
                    </div>
                  </section>
                )}
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
                    {SUGGESTED_SEARCHES.slice(0, 4).map((term) => (
                      <button type="button" key={term} onClick={() => searchTerm(term)}>
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!loading &&
            !error &&
            hasResults &&
            (type === 'all' || contentTypeSelected) &&
            totalPages > 1 ? (
              <div className="search-pagination">
                <Pagination
                  meta={{
                    ...result.meta,
                    page,
                    currentPage: page,
                    total,
                    totalPages,
                    limit: PAGE_LIMIT,
                  }}
                  onPageChange={changePage}
                />
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
