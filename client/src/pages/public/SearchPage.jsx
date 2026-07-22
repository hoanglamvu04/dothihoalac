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
  BriefcaseBusiness,
  Building2,
  Clock3,
  FileText,
  History,
  MapPin,
  MessageCircle,
  Newspaper,
  Search,
  SearchX,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import GenericContentCard from '../../components/content/GenericContentCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import Avatar from '../../components/common/Avatar';

import { searchApi } from '../../api/content.api';
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
  {
    value: 'all',
    label: 'Tất cả',
    icon: Search,
  },
  {
    value: 'article',
    label: 'Tin tức',
    icon: Newspaper,
  },
  {
    value: 'community',
    label: 'Cộng đồng',
    icon: MessageCircle,
  },
  {
    value: 'property',
    label: 'Bất động sản',
    icon: Building2,
  },
  {
    value: 'job',
    label: 'Việc làm',
    icon: BriefcaseBusiness,
  },
  {
    value: 'user',
    label: 'Thành viên',
    icon: UsersRound,
  },
  {
    value: 'area',
    label: 'Khu vực',
    icon: MapPin,
  },
];

const SUGGESTED_SEARCHES = [
  'Quy hoạch Hòa Lạc',
  'Đường Vành đai',
  'Nhà đất Thạch Thất',
  'Việc làm Hòa Lạc',
  'Homestay Hòa Lạc',
  'Khu Công nghệ cao',
];

const DISCOVERY_LINKS = [
  {
    to: '/tin-tuc',
    icon: Newspaper,
    title: 'Tin tức',
    description:
      'Tin mới, quy hoạch, hạ tầng và thông tin địa phương.',
  },
  {
    to: '/cong-dong',
    icon: MessageCircle,
    title: 'Cộng đồng',
    description:
      'Hỏi đáp, thảo luận, phản ánh và chia sẻ trải nghiệm.',
  },
  {
    to: '/nha-dat',
    icon: Building2,
    title: 'Nhà đất',
    description:
      'Tin mua bán, cho thuê, sang nhượng và nhu cầu bất động sản.',
  },
  {
    to: '/viec-lam',
    icon: BriefcaseBusiness,
    title: 'Việc làm',
    description:
      'Cơ hội tuyển dụng, thực tập và việc làm tại Hòa Lạc.',
  },
];

function normalizeResult(value) {
  const data =
    value?.data &&
    typeof value.data === 'object'
      ? value.data
      : {};

  return {
    data: {
      contents: Array.isArray(data.contents)
        ? data.contents
        : [],

      users: Array.isArray(data.users)
        ? data.users
        : [],

      areas: Array.isArray(data.areas)
        ? data.areas
        : [],
    },

    meta:
      value?.meta &&
      typeof value.meta === 'object'
        ? value.meta
        : {},
  };
}

function loadRecentSearches() {
  try {
    const values = getRecentSearches();

    return Array.isArray(values)
      ? values.filter(Boolean).slice(0, 8)
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

  return Number.isFinite(value)
    ? value
    : fallback;
}

function getTotalPages(meta) {
  const value = Number(
    meta?.totalPages ??
      meta?.pageCount ??
      meta?.pages ??
      1,
  );

  return Number.isFinite(value) && value > 0
    ? value
    : 1;
}

function getItemId(item, prefix, index) {
  return String(
    item?._id ||
      item?.id ||
      item?.slug ||
      item?.username ||
      `${prefix}-${index}`,
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const resultsRef = useRef(null);
  const searchInputRef = useRef(null);

  const q =
    searchParams.get('q')?.trim() || '';

  const type =
    searchParams.get('type') || 'all';

  const page = Math.max(
    Number(searchParams.get('page')) || 1,
    1,
  );

  const [query, setQuery] = useState(q);

  const [result, setResult] =
    useState(EMPTY_RESULT);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [reloadKey, setReloadKey] =
    useState(0);

  const [recentSearches, setRecentSearches] =
    useState(() => loadRecentSearches());

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

      setRecentSearches(
        loadRecentSearches(),
      );
    } catch {
      // Không làm gián đoạn quá trình tìm kiếm.
    }

    searchApi
      .run({
        q,
        type,
        page,
        limit: PAGE_LIMIT,
      })
      .then((response) => {
        if (!active) {
          return;
        }

        setResult(
          normalizeResult(response),
        );
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setResult(EMPTY_RESULT);
        setError(requestError);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    page,
    q,
    reloadKey,
    type,
  ]);

  const contents =
    result.data.contents || [];

  const users =
    result.data.users || [];

  const areas =
    result.data.areas || [];

  const visibleCount =
    contents.length +
    users.length +
    areas.length;

  const total = getTotal(
    result.meta,
    visibleCount,
  );

  const totalPages =
    getTotalPages(result.meta);

  const selectedType = useMemo(
    () =>
      SEARCH_TYPES.find(
        (item) => item.value === type,
      ) || SEARCH_TYPES[0],
    [type],
  );

  const hasResults =
    visibleCount > 0;

  const submit = useCallback(
    (event) => {
      event.preventDefault();

      const normalizedQuery =
        query.trim();

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
    [
      query,
      setSearchParams,
      type,
    ],
  );

  const searchTerm = useCallback(
    (term, nextType = 'all') => {
      const normalizedTerm =
        String(term || '').trim();

      if (!normalizedTerm) {
        return;
      }

      setQuery(normalizedTerm);

      setSearchParams({
        q: normalizedTerm,
        type: nextType,
        page: '1',
      });
    },
    [setSearchParams],
  );

  const changeType = useCallback(
    (value) => {
      if (!q) {
        return;
      }

      setSearchParams({
        q,
        type: value,
        page: '1',
      });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 30);
    },
    [
      q,
      setSearchParams,
    ],
  );

  const changePage = useCallback(
    (value) => {
      const nextPage = Math.max(
        Number(value) || 1,
        1,
      );

      setSearchParams({
        q,
        type,
        page: String(nextPage),
      });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 30);
    },
    [
      q,
      setSearchParams,
      type,
    ],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResult(EMPTY_RESULT);
    setError(null);

    setSearchParams({});

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }, [setSearchParams]);

  const retry = useCallback(() => {
    setReloadKey(
      (current) => current + 1,
    );
  }, []);

  return (
    <section className="search-page">
      <Seo
        title={
          q
            ? `Tìm kiếm: ${q}`
            : 'Tìm kiếm'
        }
        description="Tìm kiếm tin tức, cộng đồng, bất động sản, việc làm, thành viên và khu vực trên Đô Thị Hòa Lạc."
      />

      <div className="search-page-container">
        <header className="search-page-hero">
          <div className="search-page-hero__content">
            <span className="search-page-hero__eyebrow">
              <Sparkles size={17} />
              Khám phá Hòa Lạc
            </span>

            <h1>
              Tìm trên Đô Thị Hòa Lạc
            </h1>

            <p>
              Tìm tin tức, quy hoạch, cộng
              đồng, bất động sản, việc làm,
              thành viên và các khu vực tại
              Hòa Lạc.
            </p>

            <form
              className="search-page-form"
              onSubmit={submit}
            >
              <Search size={22} />

              <input
                ref={searchInputRef}
                value={query}
                autoFocus
                autoComplete="off"
                aria-label="Từ khóa tìm kiếm"
                placeholder="Nhập từ khóa tìm kiếm..."
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
              />

              {query ? (
                <button
                  type="button"
                  className="search-page-form__clear"
                  aria-label="Xóa từ khóa"
                  onClick={() =>
                    setQuery('')
                  }
                >
                  <X size={18} />
                </button>
              ) : null}

              <button
                type="submit"
                className="search-page-form__submit"
              >
                <Search size={18} />
                Tìm kiếm
              </button>
            </form>
          </div>

          <div className="search-page-hero__summary">
            <div className="search-page-hero__summary-heading">
              <span>
                <Search size={25} />
              </span>

              <div>
                <strong>
                  Tìm kiếm toàn hệ thống
                </strong>

                <small>
                  Nội dung được phân loại
                  theo chuyên mục
                </small>
              </div>
            </div>

            <div className="search-page-hero__summary-list">
              <div>
                <Newspaper size={17} />
                <span>
                  Tin tức và quy hoạch
                </span>
              </div>

              <div>
                <Building2 size={17} />
                <span>
                  Nhà đất và việc làm
                </span>
              </div>

              <div>
                <UsersRound size={17} />
                <span>
                  Thành viên và khu vực
                </span>
              </div>
            </div>
          </div>
        </header>

        {!q ? (
          <>
            <section className="search-page-suggestions">
              <header className="search-section-heading">
                <span>
                  <History size={21} />
                </span>

                <div>
                  <small>
                    Tìm kiếm nhanh
                  </small>

                  <h2>
                    Từ khóa gần đây và gợi ý
                  </h2>

                  <p>
                    Chọn một từ khóa để bắt đầu
                    tìm kiếm ngay.
                  </p>
                </div>
              </header>

              {recentSearches.length ? (
                <div className="search-recent-section">
                  <strong>
                    <Clock3 size={17} />
                    Tìm kiếm gần đây
                  </strong>

                  <div className="search-term-list">
                    {recentSearches.map(
                      (term) => (
                        <button
                          type="button"
                          key={term}
                          onClick={() =>
                            searchTerm(term)
                          }
                        >
                          <History size={15} />
                          {term}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              <div className="search-recent-section">
                <strong>
                  <Sparkles size={17} />
                  Gợi ý tìm kiếm
                </strong>

                <div className="search-term-list">
                  {SUGGESTED_SEARCHES.map(
                    (term) => (
                      <button
                        type="button"
                        key={term}
                        onClick={() =>
                          searchTerm(term)
                        }
                      >
                        <Search size={15} />
                        {term}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </section>

            <section className="search-discovery">
              <header className="search-section-heading">
                <span>
                  <FileText size={21} />
                </span>

                <div>
                  <small>
                    Khám phá nội dung
                  </small>

                  <h2>
                    Truy cập các chuyên mục chính
                  </h2>

                  <p>
                    Duyệt nội dung theo từng nhóm
                    mà không cần nhập từ khóa.
                  </p>
                </div>
              </header>

              <div className="search-discovery__grid">
                {DISCOVERY_LINKS.map(
                  (item) => {
                    const ItemIcon =
                      item.icon;

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                      >
                        <span>
                          <ItemIcon
                            size={23}
                          />
                        </span>

                        <div>
                          <h3>
                            {item.title}
                          </h3>

                          <p>
                            {item.description}
                          </p>
                        </div>

                        <ArrowRight
                          size={18}
                        />
                      </Link>
                    );
                  },
                )}
              </div>
            </section>
          </>
        ) : (
          <section
            ref={resultsRef}
            className="search-results-section"
          >
            <header className="search-results-heading">
              <div>
                <span className="search-results-heading__eyebrow">
                  <Search size={16} />
                  Kết quả tìm kiếm
                </span>

                <h2>
                  Kết quả cho “{q}”
                </h2>

                {!loading && !error ? (
                  <p>
                    {hasResults ? (
                      <>
                        Tìm thấy{' '}
                        <strong>
                          {total.toLocaleString(
                            'vi-VN',
                          )}
                        </strong>{' '}
                        kết quả trong nhóm{' '}
                        <strong>
                          {selectedType.label}
                        </strong>
                        .
                      </>
                    ) : (
                      'Không có dữ liệu phù hợp với từ khóa này.'
                    )}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={clearSearch}
              >
                <X size={16} />
                Xóa tìm kiếm
              </button>
            </header>

            <div className="search-tabs">
              {SEARCH_TYPES.map(
                (item) => {
                  const TypeIcon =
                    item.icon;

                  return (
                    <button
                      type="button"
                      key={item.value}
                      className={
                        type === item.value
                          ? 'is-active'
                          : ''
                      }
                      onClick={() =>
                        changeType(
                          item.value,
                        )
                      }
                    >
                      <TypeIcon
                        size={17}
                      />
                      {item.label}
                    </button>
                  );
                },
              )}
            </div>

            <div className="search-results-body">
              {loading ? (
                <div className="search-loading">
                  <LoadingBlock />
                </div>
              ) : error ? (
                <div className="search-error">
                  <ErrorState error={error} />

                  <button
                    type="button"
                    onClick={retry}
                  >
                    Tìm kiếm lại
                  </button>
                </div>
              ) : hasResults ? (
                <>
                  {contents.length ? (
                    <section className="search-result-group">
                      <header>
                        <div>
                          <span>
                            <FileText
                              size={20}
                            />
                          </span>

                          <div>
                            <h3>
                              Nội dung
                            </h3>

                            <p>
                              Bài viết, tin đăng
                              và nội dung phù hợp.
                            </p>
                          </div>
                        </div>

                        <strong>
                          {contents.length}
                        </strong>
                      </header>

                      <div className="search-content-list">
                        {contents.map(
                          (item, index) => (
                            <article
                              key={getItemId(
                                item,
                                'content',
                                index,
                              )}
                            >
                              <GenericContentCard
                                item={item}
                              />
                            </article>
                          ),
                        )}
                      </div>
                    </section>
                  ) : null}

                  {users.length ? (
                    <section className="search-result-group">
                      <header>
                        <div>
                          <span>
                            <UsersRound
                              size={20}
                            />
                          </span>

                          <div>
                            <h3>
                              Thành viên
                            </h3>

                            <p>
                              Tài khoản thành viên
                              phù hợp với từ khóa.
                            </p>
                          </div>
                        </div>

                        <strong>
                          {users.length}
                        </strong>
                      </header>

                      <div className="search-people-grid">
                        {users.map(
                          (user, index) => (
                            <Link
                              key={getItemId(
                                user,
                                'user',
                                index,
                              )}
                              to={`/thanh-vien/${user.username}`}
                            >
                              <Avatar
                                name={
                                  user.displayName ||
                                  user.username
                                }
                                src={
                                  user.avatarUrl ||
                                  user.avatar
                                }
                              />

                              <div>
                                <strong>
                                  {user.displayName ||
                                    user.username}
                                </strong>

                                <span>
                                  @{user.username}
                                </span>

                                {user.bio ? (
                                  <p>
                                    {user.bio}
                                  </p>
                                ) : null}
                              </div>

                              <UserRound
                                size={19}
                              />
                            </Link>
                          ),
                        )}
                      </div>
                    </section>
                  ) : null}

                  {areas.length ? (
                    <section className="search-result-group">
                      <header>
                        <div>
                          <span>
                            <MapPin
                              size={20}
                            />
                          </span>

                          <div>
                            <h3>
                              Khu vực
                            </h3>

                            <p>
                              Địa phương và khu vực
                              liên quan đến từ khóa.
                            </p>
                          </div>
                        </div>

                        <strong>
                          {areas.length}
                        </strong>
                      </header>

                      <div className="search-area-grid">
                        {areas.map(
                          (area, index) => (
                            <Link
                              key={getItemId(
                                area,
                                'area',
                                index,
                              )}
                              to={`/khu-vuc/${area.slug}`}
                            >
                              <span>
                                <MapPin
                                  size={21}
                                />
                              </span>

                              <div>
                                <strong>
                                  {area.name}
                                </strong>

                                {area.description ? (
                                  <p>
                                    {
                                      area.description
                                    }
                                  </p>
                                ) : (
                                  <p>
                                    Xem nội dung thuộc
                                    khu vực này.
                                  </p>
                                )}
                              </div>

                              <ArrowRight
                                size={17}
                              />
                            </Link>
                          ),
                        )}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : (
                <div className="search-empty">
                  <EmptyState
                    title="Không tìm thấy kết quả"
                    description={`Không có dữ liệu phù hợp với “${q}”. Hãy thử từ khóa ngắn hơn hoặc chọn nhóm tìm kiếm khác.`}
                  />

                  <div className="search-empty__suggestions">
                    <strong>
                      <SearchX size={18} />
                      Thử một từ khóa khác
                    </strong>

                    <div className="search-term-list">
                      {SUGGESTED_SEARCHES.slice(
                        0,
                        4,
                      ).map((term) => (
                        <button
                          type="button"
                          key={term}
                          onClick={() =>
                            searchTerm(term)
                          }
                        >
                          <Search size={15} />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!loading &&
            !error &&
            hasResults &&
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

                <p>
                  Trang {page} trên tổng số{' '}
                  {totalPages} trang
                </p>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </section>
  );
}