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
} from 'react-router-dom';

import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Hourglass,
  Layers3,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  UsersRound,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Pagination from '../../components/common/Pagination';
import { LoadingBlock } from '../../components/common/Loading';

import { userApi } from '../../api/user.api';

import {
  communityApi,
  jobApi,
  propertyApi,
} from '../../api/content.api';

import {
  apiErrorMessage,
} from '../../api/http';

import {
  useToast,
} from '../../context/ToastContext';

import './MyPostsPage.css';

const STATUS_FILTERS = [
  {
    value: '',
    label: 'Tất cả',
  },
  {
    value: 'draft',
    label: 'Bản nháp',
  },
  {
    value: 'pending_review',
    label: 'Chờ duyệt',
  },
  {
    value: 'needs_revision',
    label: 'Cần sửa',
  },
  {
    value: 'published',
    label: 'Đã xuất bản',
  },
  {
    value: 'rejected',
    label: 'Bị từ chối',
  },
];

const STATUS_CONFIG = {
  draft: {
    label: 'Bản nháp',
    description:
      'Nội dung chưa được gửi kiểm duyệt.',
    className: 'is-draft',
  },

  pending_review: {
    label: 'Chờ duyệt',
    description:
      'Ban quản trị đang kiểm tra nội dung.',
    className: 'is-pending',
  },

  needs_revision: {
    label: 'Cần sửa',
    description:
      'Cần cập nhật trước khi gửi duyệt lại.',
    className: 'is-revision',
  },

  published: {
    label: 'Đã xuất bản',
    description:
      'Nội dung đang được hiển thị công khai.',
    className: 'is-published',
  },

  rejected: {
    label: 'Bị từ chối',
    description:
      'Nội dung chưa đáp ứng quy định đăng bài.',
    className: 'is-rejected',
  },
};

const TYPE_CONFIG = {
  community: {
    label: 'Cộng đồng',
    icon: UsersRound,
    className: 'is-community',
  },

  property: {
    label: 'Nhà đất',
    icon: Building2,
    className: 'is-property',
  },

  job: {
    label: 'Việc làm',
    icon: BriefcaseBusiness,
    className: 'is-job',
  },
};

const CONTENT_TYPE_OPTIONS = [
  {
    value: '',
    label: 'Tất cả nội dung',
  },
  {
    value: 'community',
    label: 'Cộng đồng',
  },
  {
    value: 'property',
    label: 'Nhà đất',
  },
  {
    value: 'job',
    label: 'Việc làm',
  },
];

const SORT_OPTIONS = [
  {
    value: 'updated_desc',
    label: 'Mới cập nhật',
  },
  {
    value: 'created_desc',
    label: 'Mới tạo',
  },
  {
    value: 'created_asc',
    label: 'Cũ nhất',
  },
  {
    value: 'title_asc',
    label: 'Tên A–Z',
  },
];

const CREATE_OPTIONS = [
  {
    to: '/dang-bai/cong-dong',
    label: 'Đăng bài cộng đồng',
    description:
      'Chia sẻ thông tin và thảo luận.',
    icon: UsersRound,
  },
  {
    to: '/dang-bai/nha-dat',
    label: 'Đăng tin nhà đất',
    description:
      'Đăng bán, cho thuê hoặc tìm kiếm.',
    icon: Building2,
  },
  {
    to: '/dang-bai/viec-lam',
    label: 'Đăng tin việc làm',
    description:
      'Chia sẻ cơ hội tuyển dụng.',
    icon: BriefcaseBusiness,
  },
];

function getTotal(result) {
  return Number(
    result?.meta?.total ??
      result?.meta?.totalItems ??
      result?.total ??
      0,
  );
}

function getMediaUrl(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return (
    value.secureUrl ||
    value.url ||
    value.publicUrl ||
    value.src ||
    ''
  );
}

function getThumbnailUrl(item) {
  return (
    getMediaUrl(item?.thumbnailMediaId) ||
    getMediaUrl(item?.coverMediaId) ||
    getMediaUrl(item?.featuredImage) ||
    getMediaUrl(item?.image) ||
    getMediaUrl(item?.thumbnail) ||
    ''
  );
}

function getExcerpt(item) {
  return (
    item?.excerpt ||
    item?.summary ||
    item?.description ||
    item?.contentPreview ||
    ''
  );
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value) {
  if (!value) {
    return 'Chưa xác định';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Chưa xác định';
  }

  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(date);
}

function getItemDate(item) {
  return (
    item?.updatedAt ||
    item?.publishedAt ||
    item?.createdAt ||
    null
  );
}

function getReviewReason(item) {
  return (
    item?.moderationReason ||
    item?.reviewNote ||
    item?.rejectionReason ||
    item?.revisionReason ||
    item?.moderation?.reason ||
    ''
  );
}

function getPublicPath(item) {
  if (item?.publicUrl) {
    return item.publicUrl;
  }

  if (item?.url) {
    return item.url;
  }

  if (!item?.slug) {
    return '';
  }

  const paths = {
    community: `/cong-dong/${item.slug}`,
    property: `/nha-dat/${item.slug}`,
    job: `/viec-lam/${item.slug}`,
  };

  return paths[item.contentType] || '';
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function MyPostCard({
  item,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onSubmit,
  onCopyLink,
}) {
  const statusConfig =
    STATUS_CONFIG[item?.status] || {
      label: item?.status || 'Không xác định',
      description:
        'Trạng thái nội dung chưa xác định.',
      className: '',
    };

  const typeConfig =
    TYPE_CONFIG[item?.contentType] || {
      label: 'Nội dung',
      icon: FileText,
      className: '',
    };

  const TypeIcon = typeConfig.icon;

  const thumbnailUrl =
    getThumbnailUrl(item);

  const excerpt = stripHtml(
    getExcerpt(item),
  );

  const reviewReason =
    getReviewReason(item);

  const publicPath =
    getPublicPath(item);

  const canSubmit = [
    'draft',
    'needs_revision',
    'rejected',
  ].includes(item?.status);

  const viewCount = Number(
    item?.stats?.viewCount ??
      item?.viewCount ??
      0,
  );

  const title =
    item?.title ||
    item?.name ||
    'Nội dung chưa có tiêu đề';

  return (
    <article className="my-post-card">
      <div className="my-post-card__thumbnail">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="my-post-card__thumbnail-fallback">
            <TypeIcon size={30} />
          </div>
        )}

        <span
          className={[
            'my-post-card__type-badge',
            typeConfig.className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <TypeIcon size={14} />
          {typeConfig.label}
        </span>
      </div>

      <div className="my-post-card__content">
        <div className="my-post-card__top">
          <div className="my-post-card__heading">
            <span
              className={[
                'my-post-card__status',
                statusConfig.className,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {statusConfig.label}
            </span>

            <h3>{title}</h3>
          </div>

          <div className="my-post-card__menu-wrap">
            <button
              type="button"
              className="my-post-card__more"
              aria-label="Mở menu bài viết"
              aria-expanded={menuOpen}
              onClick={() =>
                onToggleMenu(item._id)
              }
            >
              <MoreHorizontal size={20} />
            </button>

            {menuOpen ? (
              <div className="my-post-card__menu">
                {publicPath ? (
                  <Link
                    to={publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onCloseMenu}
                  >
                    <ExternalLink size={17} />
                    Mở nội dung
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    onEdit(item);
                    onCloseMenu();
                  }}
                >
                  <Edit3 size={17} />
                  Chỉnh sửa
                </button>

                {publicPath ? (
                  <button
                    type="button"
                    onClick={() => {
                      onCopyLink(item);
                      onCloseMenu();
                    }}
                  >
                    <Copy size={17} />
                    Sao chép liên kết
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="my-post-card__meta">
          <span>
            <Clock3 size={14} />
            Cập nhật {formatDate(
              getItemDate(item),
            )}
          </span>

          {item?.status ===
          'published' ? (
            <span>
              <Eye size={14} />
              {viewCount.toLocaleString(
                'vi-VN',
              )}{' '}
              lượt xem
            </span>
          ) : null}
        </div>

        {excerpt ? (
          <p className="my-post-card__excerpt">
            {excerpt}
          </p>
        ) : (
          <p className="my-post-card__excerpt is-empty">
            Nội dung chưa có phần mô tả
            ngắn.
          </p>
        )}

        {[
          'needs_revision',
          'rejected',
        ].includes(item?.status) &&
        reviewReason ? (
          <div className="my-post-card__review-note">
            <AlertTriangle size={17} />

            <div>
              <strong>
                {item.status ===
                'needs_revision'
                  ? 'Nội dung cần chỉnh sửa'
                  : 'Lý do từ chối'}
              </strong>

              <p>{reviewReason}</p>
            </div>
          </div>
        ) : null}

        <div className="my-post-card__footer">
          <p>
            {statusConfig.description}
          </p>

          <div className="my-post-card__actions">
            {publicPath &&
            item?.status ===
              'published' ? (
              <Link
                className="my-post-button my-post-button--secondary"
                to={publicPath}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye size={16} />
                Xem bài
              </Link>
            ) : null}

            <button
              type="button"
              className="my-post-button my-post-button--secondary"
              onClick={() => onEdit(item)}
            >
              <Edit3 size={16} />
              Chỉnh sửa
            </button>

            {canSubmit ? (
              <button
                type="button"
                className="my-post-button my-post-button--primary"
                onClick={() =>
                  onSubmit(item)
                }
              >
                <Send size={16} />
                Gửi duyệt
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MyPostsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const createMenuRef = useRef(null);

  const [items, setItems] =
    useState([]);

  const [meta, setMeta] =
    useState({});

  const [page, setPage] =
    useState(1);

  const [status, setStatus] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [
    contentType,
    setContentType,
  ] = useState('');

  const [sort, setSort] =
    useState('updated_desc');

  const [loading, setLoading] =
    useState(true);

  const [
    countsLoading,
    setCountsLoading,
  ] = useState(true);

  const [
    createMenuOpen,
    setCreateMenuOpen,
  ] = useState(false);

  const [
    openMenuId,
    setOpenMenuId,
  ] = useState(null);

  const [
    statusCounts,
    setStatusCounts,
  ] = useState({
    all: 0,
    draft: 0,
    pending_review: 0,
    needs_revision: 0,
    published: 0,
    rejected: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result =
        await userApi.myPosts({
          page,
          limit: 15,
          status:
            status || undefined,
        });

      setItems(
        result?.items || [],
      );

      setMeta(
        result?.meta || {},
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    status,
    toast,
  ]);

  const loadCounts =
    useCallback(async () => {
      setCountsLoading(true);

      try {
        const statuses = [
          '',
          'draft',
          'pending_review',
          'needs_revision',
          'published',
          'rejected',
        ];

        const results =
          await Promise.all(
            statuses.map(
              (statusValue) =>
                userApi.myPosts({
                  page: 1,
                  limit: 1,
                  status:
                    statusValue ||
                    undefined,
                }),
            ),
          );

        setStatusCounts({
          all: getTotal(results[0]),
          draft: getTotal(
            results[1],
          ),
          pending_review:
            getTotal(results[2]),
          needs_revision:
            getTotal(results[3]),
          published: getTotal(
            results[4],
          ),
          rejected: getTotal(
            results[5],
          ),
        });
      } catch {
        setStatusCounts(
          (current) => current,
        );
      } finally {
        setCountsLoading(false);
      }
    }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(
          event.target,
        )
      ) {
        setCreateMenuOpen(false);
      }

      if (
        !event.target.closest(
          '.my-post-card__menu-wrap',
        )
      ) {
        setOpenMenuId(null);
      }
    };

    const closeWithEscape = (
      event,
    ) => {
      if (event.key === 'Escape') {
        setCreateMenuOpen(false);
        setOpenMenuId(null);
      }
    };

    document.addEventListener(
      'mousedown',
      closeMenus,
    );

    document.addEventListener(
      'keydown',
      closeWithEscape,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        closeMenus,
      );

      document.removeEventListener(
        'keydown',
        closeWithEscape,
      );
    };
  }, []);

  const filteredItems =
    useMemo(() => {
      const cleanSearch =
        normalizeText(search);

      const nextItems =
        items.filter((item) => {
          const matchesType =
            !contentType ||
            item?.contentType ===
              contentType;

          const searchableText =
            normalizeText(
              [
                item?.title,
                item?.name,
                getExcerpt(item),
              ]
                .filter(Boolean)
                .join(' '),
            );

          const matchesSearch =
            !cleanSearch ||
            searchableText.includes(
              cleanSearch,
            );

          return (
            matchesType &&
            matchesSearch
          );
        });

      return [...nextItems].sort(
        (first, second) => {
          if (sort === 'title_asc') {
            return String(
              first?.title ||
                first?.name ||
                '',
            ).localeCompare(
              String(
                second?.title ||
                  second?.name ||
                  '',
              ),
              'vi',
            );
          }

          const firstCreated =
            new Date(
              first?.createdAt || 0,
            ).getTime();

          const secondCreated =
            new Date(
              second?.createdAt || 0,
            ).getTime();

          if (
            sort === 'created_asc'
          ) {
            return (
              firstCreated -
              secondCreated
            );
          }

          if (
            sort === 'created_desc'
          ) {
            return (
              secondCreated -
              firstCreated
            );
          }

          const firstUpdated =
            new Date(
              first?.updatedAt ||
                first?.createdAt ||
                0,
            ).getTime();

          const secondUpdated =
            new Date(
              second?.updatedAt ||
                second?.createdAt ||
                0,
            ).getTime();

          return (
            secondUpdated -
            firstUpdated
          );
        },
      );
    }, [
      items,
      search,
      contentType,
      sort,
    ]);

  const actionCount =
    statusCounts.needs_revision +
    statusCounts.rejected;

  const stats = [
    {
      label: 'Tổng nội dung',
      value: statusCounts.all,
      description:
        'Toàn bộ nội dung đã tạo',
      icon: Layers3,
      className: 'is-total',
    },
    {
      label: 'Đang chờ duyệt',
      value:
        statusCounts.pending_review,
      description:
        'Đang được ban quản trị kiểm tra',
      icon: Hourglass,
      className: 'is-pending',
    },
    {
      label: 'Đã xuất bản',
      value:
        statusCounts.published,
      description:
        'Đang hiển thị công khai',
      icon: CheckCircle2,
      className: 'is-published',
    },
    {
      label: 'Cần xử lý',
      value: actionCount,
      description:
        'Cần sửa hoặc chưa được duyệt',
      icon: AlertTriangle,
      className: 'is-action',
    },
  ];

  const submit = async (item) => {
    try {
      const apiByType = {
        community: communityApi,
        property: propertyApi,
        job: jobApi,
      };

      const targetApi =
        apiByType[item.contentType];

      if (!targetApi?.submit) {
        toast.error(
          'Không xác định được loại nội dung.',
        );

        return;
      }

      await targetApi.submit(
        item._id,
      );

      toast.success(
        'Đã gửi nội dung đi duyệt.',
      );

      await Promise.all([
        load(),
        loadCounts(),
      ]);
    } catch (error) {
      toast.error(
        apiErrorMessage(error),
      );
    }
  };

  const edit = (item) => {
    const paths = {
      community:
        '/dang-bai/cong-dong',
      property:
        '/dang-bai/nha-dat',
      job: '/dang-bai/viec-lam',
    };

    const basePath =
      paths[item.contentType];

    if (!basePath) {
      toast.error(
        'Không xác định được trang chỉnh sửa.',
      );

      return;
    }

    navigate(
      `${basePath}?edit=${item._id}`,
      {
        state: {
          item,
        },
      },
    );
  };

  const copyLink = async (
    item,
  ) => {
    const path =
      getPublicPath(item);

    if (!path) {
      toast.error(
        'Nội dung chưa có liên kết công khai.',
      );

      return;
    }

    const url = path.startsWith(
      'http',
    )
      ? path
      : `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(
        url,
      );

      toast.success(
        'Đã sao chép liên kết.',
      );
    } catch {
      toast.error(
        'Không thể sao chép liên kết.',
      );
    }
  };

  const clearFilters = () => {
    setSearch('');
    setContentType('');
    setSort('updated_desc');
    setStatus('');
    setPage(1);
  };

  const hasLocalFilters =
    Boolean(search) ||
    Boolean(contentType) ||
    sort !== 'updated_desc';

  return (
    <div className="my-posts-page">
      <Seo title="Bài viết của tôi" />

      <header className="my-posts-hero">
        <div>
          <span className="my-posts-eyebrow">
            <FileText size={15} />
            Trung tâm nội dung
          </span>

          <h2>Bài viết của tôi</h2>

          <p>
            Theo dõi, chỉnh sửa và quản
            lý toàn bộ nội dung bạn đã
            tạo trên Đô Thị Hòa Lạc.
          </p>
        </div>

        <div
          ref={createMenuRef}
          className="my-posts-create"
        >
          <button
            type="button"
            className="my-posts-create__trigger"
            aria-expanded={
              createMenuOpen
            }
            onClick={() =>
              setCreateMenuOpen(
                (current) => !current,
              )
            }
          >
            <Plus size={18} />
            Tạo nội dung
            <ChevronDown
              size={17}
              className={
                createMenuOpen
                  ? 'is-open'
                  : ''
              }
            />
          </button>

          {createMenuOpen ? (
            <div className="my-posts-create__menu">
              {CREATE_OPTIONS.map(
                ({
                  to,
                  label,
                  description,
                  icon: Icon,
                }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() =>
                      setCreateMenuOpen(
                        false,
                      )
                    }
                  >
                    <span>
                      <Icon size={19} />
                    </span>

                    <div>
                      <strong>
                        {label}
                      </strong>

                      <small>
                        {description}
                      </small>
                    </div>
                  </Link>
                ),
              )}
            </div>
          ) : null}
        </div>
      </header>

      <section className="my-posts-stats">
        {stats.map(
          ({
            label,
            value,
            description,
            icon: Icon,
            className,
          }) => (
            <article
              key={label}
              className={[
                'my-posts-stat',
                className,
              ].join(' ')}
            >
              <span className="my-posts-stat__icon">
                <Icon size={21} />
              </span>

              <div>
                <strong>
                  {countsLoading
                    ? '—'
                    : value.toLocaleString(
                        'vi-VN',
                      )}
                </strong>

                <span>{label}</span>

                <small>
                  {description}
                </small>
              </div>
            </article>
          ),
        )}
      </section>

      <section className="my-posts-panel">
        <div className="my-posts-toolbar">
          <label className="my-posts-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Tìm theo tiêu đề hoặc nội dung..."
              aria-label="Tìm bài viết"
            />

            {search ? (
              <button
                type="button"
                aria-label="Xóa từ khóa"
                onClick={() =>
                  setSearch('')
                }
              >
                <X size={16} />
              </button>
            ) : null}
          </label>

          <div className="my-posts-toolbar__filters">
            <label className="my-posts-select">
              <SlidersHorizontal
                size={16}
              />

              <select
                value={contentType}
                onChange={(event) =>
                  setContentType(
                    event.target.value,
                  )
                }
                aria-label="Loại nội dung"
              >
                {CONTENT_TYPE_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="my-posts-select">
              <Clock3 size={16} />

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target.value,
                  )
                }
                aria-label="Sắp xếp"
              >
                {SORT_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </label>

            {hasLocalFilters ? (
              <button
                type="button"
                className="my-posts-reset"
                onClick={clearFilters}
              >
                <RotateCcw size={16} />
                Đặt lại
              </button>
            ) : null}
          </div>
        </div>

        <div className="my-posts-tabs">
          {STATUS_FILTERS.map(
            ({ value, label }) => {
              const countKey =
                value || 'all';

              return (
                <button
                  type="button"
                  key={value}
                  className={
                    status === value
                      ? 'is-active'
                      : ''
                  }
                  onClick={() => {
                    setStatus(value);
                    setPage(1);
                  }}
                >
                  <span>{label}</span>

                  <small>
                    {statusCounts[
                      countKey
                    ] || 0}
                  </small>
                </button>
              );
            },
          )}
        </div>

        <div className="my-posts-results-header">
          <div>
            <h3>
              {STATUS_FILTERS.find(
                (filter) =>
                  filter.value ===
                  status,
              )?.label || 'Tất cả'}
            </h3>

            <p>
              Hiển thị{' '}
              {filteredItems.length}{' '}
              nội dung trên trang này.
            </p>
          </div>
        </div>

        <div className="my-posts-content">
          {loading ? (
            <LoadingBlock />
          ) : filteredItems.length ? (
            <div className="my-posts-list">
              {filteredItems.map(
                (item) => (
                  <MyPostCard
                    key={item._id}
                    item={item}
                    menuOpen={
                      openMenuId ===
                      item._id
                    }
                    onToggleMenu={(
                      itemId,
                    ) =>
                      setOpenMenuId(
                        (current) =>
                          current ===
                          itemId
                            ? null
                            : itemId,
                      )
                    }
                    onCloseMenu={() =>
                      setOpenMenuId(
                        null,
                      )
                    }
                    onEdit={edit}
                    onSubmit={submit}
                    onCopyLink={
                      copyLink
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <div className="my-posts-empty">
              <span>
                <FileText size={34} />
              </span>

              <h3>
                {items.length
                  ? 'Không tìm thấy nội dung phù hợp'
                  : 'Bạn chưa có nội dung nào'}
              </h3>

              <p>
                {items.length
                  ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc đang sử dụng.'
                  : 'Chia sẻ thông tin, đăng tin nhà đất hoặc cơ hội việc làm với cộng đồng Hòa Lạc.'}
              </p>

              {items.length ? (
                <button
                  type="button"
                  onClick={clearFilters}
                >
                  <RotateCcw size={17} />
                  Xóa bộ lọc
                </button>
              ) : (
                <Link to="/dang-bai">
                  <Plus size={17} />
                  Tạo nội dung đầu tiên
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {!loading &&
      filteredItems.length ? (
        <div className="my-posts-pagination">
          <Pagination
            meta={meta}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <p className="my-posts-note">
        Nội dung ở trạng thái bản nháp,
        cần sửa hoặc bị từ chối có thể
        được cập nhật và gửi lại để kiểm
        duyệt.
      </p>
    </div>
  );
}