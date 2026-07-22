import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Layers3,
  MessageCircle,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import GenericContentCard from '../../components/content/GenericContentCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';

import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { formatDateTime } from '../../utils/formatters';

import './AccountPages.css';
import './BookmarksPage.css';

const PAGE_LIMIT = 15;

const DISCOVERY_LINKS = [
  {
    title: 'Tin tức',
    description:
      'Theo dõi tin mới, quy hoạch và hạ tầng tại Hòa Lạc.',
    to: '/tin-tuc',
    icon: Newspaper,
  },
  {
    title: 'Cộng đồng',
    description:
      'Khám phá hỏi đáp, chia sẻ và thảo luận địa phương.',
    to: '/cong-dong',
    icon: MessageCircle,
  },
  {
    title: 'Nhà đất',
    description:
      'Tìm kiếm tin mua bán, cho thuê và sang nhượng.',
    to: '/nha-dat',
    icon: Building2,
  },
  {
    title: 'Việc làm',
    description:
      'Xem các cơ hội tuyển dụng mới tại khu vực Hòa Lạc.',
    to: '/viec-lam',
    icon: BriefcaseBusiness,
  },
];

function getTotal(meta, fallback = 0) {
  return Number(
    meta?.total ??
      meta?.totalItems ??
      meta?.itemCount ??
      fallback ??
      0,
  );
}

function getCurrentPage(meta, fallback = 1) {
  return Number(
    meta?.page ??
      meta?.currentPage ??
      fallback ??
      1,
  );
}

function getPageSize(meta, fallback = PAGE_LIMIT) {
  return Number(
    meta?.limit ??
      meta?.pageSize ??
      meta?.perPage ??
      fallback,
  );
}

function getTotalPages(meta, total, pageSize) {
  const value = Number(
    meta?.totalPages ??
      meta?.pageCount ??
      meta?.pages ??
      0,
  );

  if (value > 0) {
    return value;
  }

  if (!total || !pageSize) {
    return 1;
  }

  return Math.max(
    Math.ceil(total / pageSize),
    1,
  );
}

function getBookmarkId(bookmark, index) {
  return String(
    bookmark?._id ||
      bookmark?.id ||
      bookmark?.contentId?._id ||
      bookmark?.contentId?.id ||
      `bookmark-${index}`,
  );
}

export default function BookmarksPage() {
  const resultsRef = useRef(null);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [reloadKey, setReloadKey] =
    useState(0);

  const loadBookmarks = useCallback(
    async ({
      background = false,
    } = {}) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const result =
          await userApi.myBookmarks({
            page,
            limit: PAGE_LIMIT,
          });

        const nextItems = Array.isArray(
          result?.items,
        )
          ? result.items
          : [];

        const nextMeta =
          result?.meta &&
          typeof result.meta === 'object'
            ? result.meta
            : {};

        const total = getTotal(
          nextMeta,
          nextItems.length,
        );

        const pageSize = getPageSize(
          nextMeta,
          PAGE_LIMIT,
        );

        const totalPages = getTotalPages(
          nextMeta,
          total,
          pageSize,
        );

        /*
         * Khi xóa bookmark ở trang cuối,
         * trang hiện tại có thể lớn hơn
         * tổng số trang mới.
         */
        if (
          totalPages > 0 &&
          page > totalPages
        ) {
          setPage(totalPages);
          return;
        }

        setItems(nextItems);
        setMeta(nextMeta);
      } catch (requestError) {
        setItems([]);
        setMeta({});

        setError(
          apiErrorMessage(requestError) ||
            'Không thể tải nội dung đã lưu.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page],
  );

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!active) {
        return;
      }

      await loadBookmarks();
    };

    run();

    return () => {
      active = false;
    };
  }, [
    loadBookmarks,
    reloadKey,
  ]);

  const visibleBookmarks = useMemo(
    () =>
      items.filter(
        (bookmark) =>
          bookmark?.contentId,
      ),
    [items],
  );

  const unavailableCount =
    items.length -
    visibleBookmarks.length;

  const total = getTotal(
    meta,
    visibleBookmarks.length,
  );

  const currentPage = getCurrentPage(
    meta,
    page,
  );

  const pageSize = getPageSize(
    meta,
    PAGE_LIMIT,
  );

  const totalPages = getTotalPages(
    meta,
    total,
    pageSize,
  );

  const fromItem =
    total > 0
      ? (currentPage - 1) *
          pageSize +
        1
      : 0;

  const toItem =
    total > 0
      ? Math.min(
          fromItem +
            visibleBookmarks.length -
            1,
          total,
        )
      : 0;

  const handlePageChange =
    useCallback((nextPage) => {
      const normalizedPage =
        Math.max(
          Number(nextPage) || 1,
          1,
        );

      setPage(normalizedPage);

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView(
          {
            behavior: 'smooth',
            block: 'start',
          },
        );
      }, 30);
    }, []);

  const handleReload =
    useCallback(() => {
      setReloadKey(
        (current) => current + 1,
      );
    }, []);

  return (
    <div className="account-page-view bookmarks-page">
      <Seo
        title="Nội dung đã lưu"
        description="Quản lý các bài viết, tin bất động sản, việc làm và nội dung cộng đồng bạn đã lưu."
      />

      <header className="bookmarks-hero">
        <div className="bookmarks-hero__content">
          <span className="bookmarks-hero__eyebrow">
            <BookmarkCheck size={17} />
            Thư viện cá nhân
          </span>

          <h1>Nội dung đã lưu</h1>

          <p>
            Lưu lại bài viết, tin nhà đất,
            việc làm và nội dung cộng đồng
            để dễ dàng xem lại khi cần.
          </p>

          <div className="bookmarks-hero__actions">
            <Link
              className="bookmarks-primary-action"
              to="/tin-tuc"
            >
              <Search size={17} />
              Khám phá tin mới
            </Link>

            <button
              type="button"
              className="bookmarks-secondary-action"
              disabled={
                loading || refreshing
              }
              onClick={() =>
                loadBookmarks({
                  background: true,
                })
              }
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? 'is-spinning'
                    : ''
                }
              />

              {refreshing
                ? 'Đang làm mới'
                : 'Làm mới danh sách'}
            </button>
          </div>
        </div>

        <div className="bookmarks-hero__visual">
          <div className="bookmarks-hero__icon">
            <Bookmark size={45} />
          </div>

          <div className="bookmarks-hero__visual-content">
            <strong>
              Lưu nội dung hữu ích
            </strong>

            <p>
              Nhấn biểu tượng lưu trên mỗi
              bài viết để thêm nội dung vào
              thư viện cá nhân.
            </p>
          </div>
        </div>
      </header>

      <section className="bookmarks-summary">
        <article>
          <span>
            <BookmarkCheck size={22} />
          </span>

          <div>
            <small>
              Tổng nội dung đã lưu
            </small>

            <strong>
              {loading
                ? '—'
                : total.toLocaleString(
                    'vi-VN',
                  )}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <Layers3 size={22} />
          </span>

          <div>
            <small>
              Đang hiển thị
            </small>

            <strong>
              {loading
                ? '—'
                : visibleBookmarks.length}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <Clock3 size={22} />
          </span>

          <div>
            <small>
              Trang hiện tại
            </small>

            <strong>
              {loading
                ? '—'
                : `${currentPage}/${totalPages}`}
            </strong>
          </div>
        </article>
      </section>

      <section
        ref={resultsRef}
        className="bookmarks-content-card"
      >
        <header className="bookmarks-content-card__header">
          <div>
            <span className="bookmarks-content-card__eyebrow">
              <Sparkles size={16} />
              Danh sách của bạn
            </span>

            <h2>Nội dung đã đánh dấu</h2>

            {!loading && !error ? (
              <p>
                {total > 0 ? (
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
                    nội dung.
                  </>
                ) : (
                  'Thư viện của bạn hiện đang trống.'
                )}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            disabled={
              loading || refreshing
            }
            onClick={() =>
              loadBookmarks({
                background: true,
              })
            }
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? 'is-spinning'
                  : ''
              }
            />

            Làm mới
          </button>
        </header>

        <div className="bookmarks-content-card__body">
          {loading ? (
            <LoadingBlock />
          ) : error ? (
            <div className="bookmarks-error">
              <span>
                <AlertCircle size={30} />
              </span>

              <h3>
                Không thể tải nội dung đã lưu
              </h3>

              <p>{error}</p>

              <button
                type="button"
                onClick={handleReload}
              >
                <RefreshCw size={17} />
                Thử tải lại
              </button>
            </div>
          ) : visibleBookmarks.length ? (
            <>
              {unavailableCount > 0 ? (
                <div className="bookmarks-warning">
                  <AlertCircle size={18} />

                  <p>
                    Có{' '}
                    <strong>
                      {unavailableCount}
                    </strong>{' '}
                    nội dung đã bị gỡ hoặc
                    không còn khả dụng nên
                    không được hiển thị.
                  </p>
                </div>
              ) : null}

              <div className="bookmarks-list">
                {visibleBookmarks.map(
                  (bookmark, index) => (
                    <article
                      className="bookmarks-list__item"
                      key={getBookmarkId(
                        bookmark,
                        index,
                      )}
                    >
                      {bookmark.createdAt ? (
                        <div className="bookmarks-list__saved-time">
                          <BookmarkCheck
                            size={14}
                          />

                          <span>
                            Đã lưu{' '}
                            {formatDateTime(
                              bookmark.createdAt,
                            )}
                          </span>
                        </div>
                      ) : null}

                      <GenericContentCard
                        item={
                          bookmark.contentId
                        }
                      />
                    </article>
                  ),
                )}
              </div>
            </>
          ) : (
            <div className="bookmarks-empty-wrapper">
              <EmptyState
                title="Chưa lưu nội dung nào"
                description="Khi gặp nội dung hữu ích, hãy nhấn nút lưu để xem lại tại thư viện cá nhân."
                actionLabel="Khám phá tin mới"
                actionTo="/tin-tuc"
              />
            </div>
          )}
        </div>
      </section>

      {!loading &&
      !error &&
      visibleBookmarks.length &&
      totalPages > 1 ? (
        <div className="bookmarks-pagination">
          <Pagination
            meta={{
              ...meta,
              page: currentPage,
              currentPage,
              total,
              totalPages,
              limit: pageSize,
            }}
            onPageChange={
              handlePageChange
            }
          />

          <p>
            Trang {currentPage} trên tổng số{' '}
            {totalPages} trang
          </p>
        </div>
      ) : null}

      <section className="bookmarks-discovery">
        <header className="bookmarks-discovery__header">
          <div>
            <span>
              <Search size={20} />
            </span>

            <div>
              <small>
                Khám phá thêm
              </small>

              <h2>
                Tìm nội dung hữu ích để lưu
              </h2>

              <p>
                Truy cập các chuyên mục chính
                của Đô Thị Hòa Lạc.
              </p>
            </div>
          </div>

          <Link to="/">
            Về trang chủ
            <ArrowRight size={16} />
          </Link>
        </header>

        <div className="bookmarks-discovery__grid">
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
                    <ItemIcon size={22} />
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
                    size={17}
                    className="bookmarks-discovery__arrow"
                  />
                </Link>
              );
            },
          )}
        </div>
      </section>
    </div>
  );
}