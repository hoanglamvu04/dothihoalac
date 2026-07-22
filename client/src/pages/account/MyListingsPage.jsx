import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Edit3,
  FileClock,
  FileText,
  Home,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import GenericContentCard from '../../components/content/GenericContentCard';
import Pagination from '../../components/common/Pagination';
import { LoadingBlock } from '../../components/common/Loading';

import { userApi } from '../../api/user.api';
import { propertyApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';

import { useToast } from '../../context/ToastContext';

import './MyListingsPage.css';

const NEEDS_ACTION_STATUSES = [
  'draft',
  'needs_revision',
  'rejected',
  'expired',
];

const PENDING_STATUSES = [
  'pending',
  'pending_review',
  'under_review',
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getTotal(meta, items) {
  return Number(
    meta?.total ??
      meta?.totalItems ??
      meta?.itemCount ??
      items.length ??
      0,
  );
}

function isSaleListing(item) {
  return [
    'sale',
    'sell',
    'transfer',
  ].includes(item?.transactionType);
}

function isRentalListing(item) {
  return [
    'rent',
    'rental',
    'lease',
    'for_rent',
  ].includes(item?.transactionType);
}

export default function MyListingsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result =
        await userApi.myListings({
          page,
          limit: 15,
        });

      setItems(result?.items || []);
      setMeta(result?.meta || {});
    } catch (error) {
      toast.error(
        apiErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const keyword =
      normalizeText(search);

    if (!keyword) {
      return items;
    }

    return items.filter((item) => {
      const searchableText =
        normalizeText(
          [
            item?.title,
            item?.summary,
            item?.excerpt,
            item?.addressText,
            item?.primaryAreaId?.name,
            item?.propertyType,
          ]
            .filter(Boolean)
            .join(' '),
        );

      return searchableText.includes(
        keyword,
      );
    });
  }, [items, search]);

  const stats = useMemo(() => {
    const publishedCount =
      items.filter(
        (item) =>
          item.status === 'published',
      ).length;

    const pendingCount =
      items.filter((item) =>
        PENDING_STATUSES.includes(
          item.status,
        ),
      ).length;

    const actionCount =
      items.filter((item) =>
        NEEDS_ACTION_STATUSES.includes(
          item.status,
        ),
      ).length;

    return {
      total: getTotal(meta, items),
      published: publishedCount,
      pending: pendingCount,
      action: actionCount,
    };
  }, [items, meta]);

  const edit = (item) => {
    navigate(
      `/dang-bai/nha-dat?edit=${item._id}`,
      {
        state: {
          item,
        },
      },
    );
  };

  const act = async ({
    action,
    item,
    successMessage,
    confirmation,
  }) => {
    if (
      confirmation &&
      !window.confirm(confirmation)
    ) {
      return;
    }

    const loadingKey =
      `${action}:${item._id}`;

    setActionLoading(loadingKey);

    try {
      const actionHandler =
        propertyApi[action];

      if (
        typeof actionHandler !==
        'function'
      ) {
        throw new Error(
          'Thao tác này chưa được hỗ trợ.',
        );
      }

      await actionHandler(item._id);

      toast.success(successMessage);

      await load();
    } catch (error) {
      toast.error(
        apiErrorMessage(error),
      );
    } finally {
      setActionLoading('');
    }
  };

  const isActionLoading = (
    action,
    itemId,
  ) =>
    actionLoading ===
    `${action}:${itemId}`;

  return (
    <div className="my-listings-page">
      <Seo title="Tin bất động sản của tôi" />

      <header className="my-listings-hero">
        <div className="my-listings-hero__content">
          <span className="my-listings-eyebrow">
            <Building2 size={16} />
            Trung tâm bất động sản
          </span>

          <h2>
            Tin bất động sản của tôi
          </h2>

          <p>
            Theo dõi kiểm duyệt, cập nhật
            thông tin, gia hạn và quản lý
            trạng thái giao dịch của từng
            tin đăng.
          </p>
        </div>

        <Link
          className="my-listings-create-button"
          to="/dang-bai/nha-dat"
        >
          <Plus size={18} />
          Đăng tin mới
        </Link>
      </header>

      <section
        className="my-listings-stats"
        aria-label="Thống kê tin đăng"
      >
        <article className="my-listings-stat is-total">
          <span className="my-listings-stat__icon">
            <FileText size={22} />
          </span>

          <div>
            <strong>
              {stats.total.toLocaleString(
                'vi-VN',
              )}
            </strong>

            <span>Tổng số tin</span>

            <small>
              Toàn bộ tin đã đăng
            </small>
          </div>
        </article>

        <article className="my-listings-stat is-published">
          <span className="my-listings-stat__icon">
            <ShieldCheck size={22} />
          </span>

          <div>
            <strong>
              {stats.published}
            </strong>

            <span>Đang hiển thị</span>

            <small>
              Trên trang hiện tại
            </small>
          </div>
        </article>

        <article className="my-listings-stat is-pending">
          <span className="my-listings-stat__icon">
            <FileClock size={22} />
          </span>

          <div>
            <strong>
              {stats.pending}
            </strong>

            <span>Chờ duyệt</span>

            <small>
              Đang được kiểm tra
            </small>
          </div>
        </article>

        <article className="my-listings-stat is-action">
          <span className="my-listings-stat__icon">
            <AlertTriangle size={22} />
          </span>

          <div>
            <strong>
              {stats.action}
            </strong>

            <span>Cần xử lý</span>

            <small>
              Bản nháp, cần sửa hoặc hết hạn
            </small>
          </div>
        </article>
      </section>

      <section className="my-listings-panel">
        <div className="my-listings-toolbar">
          <div>
            <h3>Danh sách tin đăng</h3>

            <p>
              Quản lý các tin bất động sản
              thuộc tài khoản của bạn.
            </p>
          </div>

          <label className="my-listings-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Tìm theo tiêu đề, khu vực..."
              aria-label="Tìm kiếm tin bất động sản"
            />

            {search ? (
              <button
                type="button"
                aria-label="Xóa từ khóa tìm kiếm"
                onClick={() =>
                  setSearch('')
                }
              >
                <X size={16} />
              </button>
            ) : null}
          </label>
        </div>

        <div className="my-listings-result-bar">
          <div>
            <strong>
              {search
                ? 'Kết quả tìm kiếm'
                : 'Tất cả tin đăng'}
            </strong>

            <span>
              Hiển thị{' '}
              {filteredItems.length}{' '}
              tin trên trang này
            </span>
          </div>

          <button
            type="button"
            className="my-listings-reload"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? 'is-spinning'
                  : ''
              }
            />

            Làm mới
          </button>
        </div>

        <div className="my-listings-content">
          {loading ? (
            <LoadingBlock />
          ) : filteredItems.length ? (
            <div className="my-listings-list">
              {filteredItems.map(
                (item) => {
                  const showSoldAction =
                    isSaleListing(item) ||
                    !isRentalListing(item);

                  const showRentedAction =
                    isRentalListing(item) ||
                    !isSaleListing(item);

                  return (
                    <article
                      className="my-listings-item"
                      key={item._id}
                    >
                      <GenericContentCard
                        item={item}
                        showStatus
                        actions={
                          <div className="my-listings-item__actions">
                            <button
                              type="button"
                              className="my-listing-button my-listing-button--secondary"
                              onClick={() =>
                                edit(item)
                              }
                            >
                              <Edit3 size={15} />
                              Chỉnh sửa
                            </button>

                            {[
                              'draft',
                              'needs_revision',
                              'rejected',
                            ].includes(
                              item.status,
                            ) ? (
                              <button
                                type="button"
                                className="my-listing-button my-listing-button--primary"
                                disabled={Boolean(
                                  actionLoading,
                                )}
                                onClick={() =>
                                  act({
                                    action:
                                      'submit',
                                    item,
                                    successMessage:
                                      'Đã gửi tin đi duyệt.',
                                  })
                                }
                              >
                                {isActionLoading(
                                  'submit',
                                  item._id,
                                ) ? (
                                  <LoaderCircle
                                    className="is-spinning"
                                    size={15}
                                  />
                                ) : (
                                  <Send
                                    size={15}
                                  />
                                )}

                                Gửi duyệt
                              </button>
                            ) : null}

                            {item.status ===
                            'expired' ? (
                              <button
                                type="button"
                                className="my-listing-button my-listing-button--secondary"
                                disabled={Boolean(
                                  actionLoading,
                                )}
                                onClick={() =>
                                  act({
                                    action:
                                      'renew',
                                    item,
                                    successMessage:
                                      'Đã gia hạn tin.',
                                  })
                                }
                              >
                                {isActionLoading(
                                  'renew',
                                  item._id,
                                ) ? (
                                  <LoaderCircle
                                    className="is-spinning"
                                    size={15}
                                  />
                                ) : (
                                  <Clock3
                                    size={15}
                                  />
                                )}

                                Gia hạn
                              </button>
                            ) : null}

                            {item.status ===
                            'published' ? (
                              <>
                                {showSoldAction ? (
                                  <button
                                    type="button"
                                    className="my-listing-button my-listing-button--success"
                                    disabled={Boolean(
                                      actionLoading,
                                    )}
                                    onClick={() =>
                                      act({
                                        action:
                                          'markSold',
                                        item,
                                        successMessage:
                                          'Đã đánh dấu bất động sản đã bán.',
                                        confirmation:
                                          'Xác nhận bất động sản này đã bán? Tin sẽ không còn hiển thị như một tin đang giao dịch.',
                                      })
                                    }
                                  >
                                    {isActionLoading(
                                      'markSold',
                                      item._id,
                                    ) ? (
                                      <LoaderCircle
                                        className="is-spinning"
                                        size={15}
                                      />
                                    ) : (
                                      <CheckCircle2
                                        size={15}
                                      />
                                    )}

                                    Đã bán
                                  </button>
                                ) : null}

                                {showRentedAction ? (
                                  <button
                                    type="button"
                                    className="my-listing-button my-listing-button--success"
                                    disabled={Boolean(
                                      actionLoading,
                                    )}
                                    onClick={() =>
                                      act({
                                        action:
                                          'markRented',
                                        item,
                                        successMessage:
                                          'Đã đánh dấu bất động sản đã cho thuê.',
                                        confirmation:
                                          'Xác nhận bất động sản này đã được cho thuê? Tin sẽ không còn hiển thị như một tin đang giao dịch.',
                                      })
                                    }
                                  >
                                    {isActionLoading(
                                      'markRented',
                                      item._id,
                                    ) ? (
                                      <LoaderCircle
                                        className="is-spinning"
                                        size={15}
                                      />
                                    ) : (
                                      <Home
                                        size={15}
                                      />
                                    )}

                                    Đã cho thuê
                                  </button>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        }
                      />
                    </article>
                  );
                },
              )}
            </div>
          ) : (
            <div className="my-listings-empty">
              <span>
                <Building2 size={36} />
              </span>

              <h3>
                {items.length
                  ? 'Không tìm thấy tin phù hợp'
                  : 'Bạn chưa có tin bất động sản'}
              </h3>

              <p>
                {items.length
                  ? 'Hãy thử thay đổi từ khóa tìm kiếm.'
                  : 'Đăng tin bán hoặc cho thuê bất động sản để tiếp cận người quan tâm tại Hòa Lạc.'}
              </p>

              {items.length ? (
                <button
                  type="button"
                  onClick={() =>
                    setSearch('')
                  }
                >
                  <RefreshCw size={17} />
                  Xóa tìm kiếm
                </button>
              ) : (
                <Link to="/dang-bai/nha-dat">
                  <Plus size={17} />
                  Đăng tin đầu tiên
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {!loading &&
      filteredItems.length ? (
        <div className="my-listings-pagination">
          <Pagination
            meta={meta}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <p className="my-listings-note">
        Chỉ đánh dấu đã bán hoặc đã cho
        thuê sau khi giao dịch thực tế đã
        hoàn tất.
      </p>
    </div>
  );
}