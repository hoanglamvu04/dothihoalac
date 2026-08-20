import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Eye,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  XCircle,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { LoadingBlock } from '../../components/common/Loading';
import ContentImage from '../../components/content/ContentImage';
import ArticleBody from '../../components/content/ArticleBody';

import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { contentTypeLabel } from '../../utils/content';
import { formatCurrency, formatDateTime, formatNumber } from '../../utils/formatters';
import {
  LEGAL_STATUS,
  OWNER_TYPES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from '../../utils/constants';
import { PROPERTY_POST_TYPES } from '../../utils/propertyPosting';

import './ModerationQueuePage.css';

const ACTIONS = [
  {
    value: 'approve',
    label: 'Duyệt nội dung',
    description: 'Nội dung đạt yêu cầu và có thể chuyển sang bước tiếp theo.',
    icon: CheckCircle2,
    tone: 'approve',
  },
  {
    value: 'request_revision',
    label: 'Yêu cầu chỉnh sửa',
    description: 'Trả lại cho tác giả kèm ghi chú cụ thể.',
    icon: RotateCcw,
    tone: 'revision',
  },
  {
    value: 'reject',
    label: 'Từ chối',
    description: 'Không chấp nhận nội dung ở lần gửi này.',
    icon: XCircle,
    tone: 'reject',
  },
];

const TYPE_OPTIONS = [
  { value: 'community', label: 'Cộng đồng', permissions: ['moderate_community'] },
  { value: 'property', label: 'Bất động sản', permissions: ['moderate_property'] },
  { value: 'job', label: 'Việc làm', permissions: ['moderate_job'] },
  { value: 'article', label: 'Tin tức', permissions: ['approve_article', 'publish_article'] },
];

function hasAnyPermission(user, permissions = []) {
  const current = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.some((permission) => current.includes(permission));
}

function detailBodyHtml(detail) {
  return detail?.body?.bodyHtml || detail?.bodyHtml || '';
}

function propertyLabel(value) {
  return PROPERTY_POST_TYPES[value] || PROPERTY_TYPES[value] || value || '—';
}

function publicPreviewUrl(item) {
  if (!item?._id || !item?.slug) return '';
  if (item.contentType === 'property') {
    return `/bat-dong-san/${encodeURIComponent(item._id)}/${encodeURIComponent(item.slug)}`;
  }
  return '';
}

function moneyLabel(property) {
  if (!property) return '—';
  if (property.isNegotiable || property.priceUnit === 'negotiable') return 'Giá thỏa thuận';
  return formatCurrency(property.price, property.priceUnit);
}

export default function ModerationQueuePage() {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({
    action: 'approve',
    note: '',
    reasonCode: '',
    publishNow: true,
  });

  const canPublishArticle = hasAnyPermission(user, ['publish_article', 'manage_system']);
  const availableTypes = useMemo(
    () => TYPE_OPTIONS.filter((option) => hasAnyPermission(user, option.permissions)),
    [user],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.moderationQueue({
        page,
        limit: 15,
        type: type || undefined,
      });
      setItems(result?.items || []);
      setMeta(result?.meta || {});
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [page, type, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (type && !availableTypes.some((option) => option.value === type)) {
      setType('');
      setPage(1);
    }
  }, [availableTypes, type]);

  const counts = useMemo(() => {
    const total = Number(meta?.total ?? meta?.totalItems ?? items.length ?? 0);
    const property = items.filter((item) => item.contentType === 'property').length;
    const community = items.filter((item) => item.contentType === 'community').length;
    const other = Math.max(0, items.length - property - community);
    return { total, property, community, other };
  }, [items, meta]);

  const closeReview = useCallback(() => {
    if (actionLoading) return;
    setSelected(null);
    setDetail(null);
    setDetailLoading(false);
  }, [actionLoading]);

  const openReview = useCallback(async (item) => {
    setSelected(item);
    setDetail(null);
    setDetailLoading(true);
    setForm({
      action: 'approve',
      note: '',
      reasonCode: '',
      publishNow: item.contentType === 'article' ? canPublishArticle : true,
    });

    try {
      const result = item.contentType === 'article'
        ? await adminApi.articleDetail(item._id)
        : await adminApi.managedContentDetail(item.contentType, item._id);
      setDetail(result);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể tải chi tiết nội dung.'));
    } finally {
      setDetailLoading(false);
    }
  }, [canPublishArticle, toast]);

  const submit = async (event) => {
    event.preventDefault();
    if (!selected || actionLoading) return;

    if (
      ['request_revision', 'reject'].includes(form.action) &&
      form.note.trim().length < 3
    ) {
      toast.error('Vui lòng ghi rõ lý do để tác giả biết cần xử lý gì.');
      return;
    }

    const publishNow = form.action === 'approve'
      ? (selected.contentType === 'article' ? canPublishArticle && form.publishNow : form.publishNow)
      : false;

    setActionLoading(true);
    try {
      const route = form.action === 'request_revision' ? 'request-revision' : form.action;
      await adminApi.moderate(selected._id, route, {
        note: form.note.trim(),
        reasonCode: form.reasonCode.trim(),
        publishNow,
      });

      const message = form.action === 'approve'
        ? (publishNow ? 'Đã duyệt và xuất bản nội dung.' : 'Đã duyệt nội dung.')
        : form.action === 'request_revision'
          ? 'Đã gửi yêu cầu chỉnh sửa cho tác giả.'
          : 'Đã từ chối nội dung.';

      toast.success(message);
      setSelected(null);
      setDetail(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const reviewItem = detail || selected;
  const property = reviewItem?.property || null;
  const previewUrl = publicPreviewUrl(reviewItem);
  const selectedAction = ACTIONS.find((item) => item.value === form.action) || ACTIONS[0];
  const SelectedActionIcon = selectedAction.icon;
  const selectedCanPublishImmediately =
    reviewItem?.contentType !== 'article' || canPublishArticle;

  return (
    <div className="moderation-queue-page">
      <Seo title="Kiểm duyệt nội dung" />

      <header className="moderation-hero">
        <div>
          <span className="moderation-eyebrow">
            <ShieldCheck size={16} />
            Trung tâm kiểm duyệt
          </span>
          <h2>Hàng chờ kiểm duyệt</h2>
          <p>
            Hệ thống chỉ hiển thị nhóm nội dung nằm trong phạm vi quyền của tài khoản đang đăng nhập.
          </p>
        </div>

        <div className="moderation-hero__actions">
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
            aria-label="Lọc loại nội dung"
          >
            <option value="">Mọi loại được phép</option>
            {availableTypes.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="button" onClick={load} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'is-spinning' : ''} />
            Làm mới
          </button>
        </div>
      </header>

      <section className="moderation-stats" aria-label="Thống kê hàng chờ">
        <article>
          <span><FileSearch size={19} /></span>
          <div><small>Đang chờ</small><strong>{counts.total}</strong></div>
        </article>
        <article>
          <span><MapPin size={19} /></span>
          <div><small>BĐS trên trang</small><strong>{counts.property}</strong></div>
        </article>
        <article>
          <span><UserRound size={19} /></span>
          <div><small>Cộng đồng trên trang</small><strong>{counts.community}</strong></div>
        </article>
        <article>
          <span><Clock3 size={19} /></span>
          <div><small>Loại khác trên trang</small><strong>{counts.other}</strong></div>
        </article>
      </section>

      <section className="moderation-list-card">
        <div className="moderation-list-card__heading">
          <div>
            <h3>Nội dung cần xử lý</h3>
            <p>Nhấn trực tiếp vào tiêu đề để mở bản xem nhanh đầy đủ.</p>
          </div>
          <Badge tone="soft">{counts.total} nội dung</Badge>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : items.length ? (
          <div className="moderation-table-wrap">
            <table className="moderation-table">
              <thead>
                <tr>
                  <th>Nội dung</th>
                  <th>Loại</th>
                  <th>Tác giả</th>
                  <th>Gửi lúc</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <button
                        type="button"
                        className="moderation-title-link"
                        onClick={() => openReview(item)}
                      >
                        <strong>{item.title}</strong>
                        <small>{item.summary || 'Không có mô tả ngắn.'}</small>
                        <span><Eye size={14} /> Xem nhanh chi tiết</span>
                      </button>
                    </td>
                    <td><Badge tone="soft">{contentTypeLabel(item.contentType)}</Badge></td>
                    <td>
                      <div className="moderation-author">
                        <strong>{item.authorId?.displayName || '—'}</strong>
                        <small>@{item.authorId?.username || 'unknown'}</small>
                      </div>
                    </td>
                    <td>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="moderation-review-button"
                        onClick={() => openReview(item)}
                      >
                        <FileSearch size={16} />
                        Xem & duyệt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Không có nội dung chờ duyệt"
            description="Hàng chờ trong phạm vi quyền hiện đã được xử lý hết."
          />
        )}

        <Pagination meta={meta} onPageChange={setPage} />
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={closeReview}
        title="Xem nhanh & kiểm duyệt"
        size="xl"
      >
        <div className="moderation-review-layout">
          <section className="moderation-review-content">
            {detailLoading ? (
              <LoadingBlock />
            ) : (
              <>
                <div className="moderation-review-kicker">
                  <Badge tone="soft">{contentTypeLabel(reviewItem?.contentType)}</Badge>
                  <span><Clock3 size={14} /> {formatDateTime(reviewItem?.updatedAt || reviewItem?.createdAt)}</span>
                </div>

                <h2>{reviewItem?.title}</h2>
                {reviewItem?.summary ? <p className="moderation-review-summary">{reviewItem.summary}</p> : null}

                <div className="moderation-review-meta">
                  <span><UserRound size={16} /> {reviewItem?.authorId?.displayName || '—'} @{reviewItem?.authorId?.username || ''}</span>
                  {reviewItem?.primaryAreaId?.name ? (
                    <span><MapPin size={16} /> {reviewItem.primaryAreaId.name}</span>
                  ) : null}
                </div>

                {reviewItem?.thumbnailMediaId ? (
                  <div className="moderation-review-cover">
                    <ContentImage media={reviewItem.thumbnailMediaId} alt={reviewItem.title || 'Ảnh nội dung'} ratio="hero" />
                  </div>
                ) : null}

                {property ? (
                  <div className="moderation-property-panel">
                    <div className="moderation-section-heading">
                      <div>
                        <strong>Thông tin bất động sản</strong>
                        <small>Thông tin quan trọng để kiểm tra trước khi duyệt.</small>
                      </div>
                      {previewUrl ? (
                        <a href={previewUrl} target="_blank" rel="noreferrer">
                          <ExternalLink size={15} /> Mở trang xem trước
                        </a>
                      ) : null}
                    </div>
                    <dl className="moderation-fact-grid">
                      <div><dt>Giao dịch</dt><dd>{TRANSACTION_TYPES[property.transactionType] || property.transactionType || '—'}</dd></div>
                      <div><dt>Loại BĐS</dt><dd>{propertyLabel(property.propertyType)}</dd></div>
                      <div><dt>Người đăng</dt><dd>{OWNER_TYPES[property.ownerType] || property.ownerType || '—'}</dd></div>
                      <div><dt>Giá</dt><dd>{moneyLabel(property)}</dd></div>
                      <div><dt>Diện tích</dt><dd>{property.landArea ? `${formatNumber(property.landArea)} m²` : '—'}</dd></div>
                      <div><dt>Pháp lý</dt><dd>{LEGAL_STATUS[property.legalStatus] || property.legalStatus || '—'}</dd></div>
                      <div className="is-wide"><dt>Địa chỉ</dt><dd>{property.addressText || '—'}</dd></div>
                      <div><dt>Liên hệ</dt><dd>{property.contactName || '—'} · {property.contactPhone || '—'}</dd></div>
                      <div><dt>Hạng tin</dt><dd>{property.listingTier || 'standard'} · {property.listingDurationDays || 15} ngày</dd></div>
                    </dl>
                  </div>
                ) : null}

                {detailBodyHtml(reviewItem) ? (
                  <div className="moderation-review-body">
                    <div className="moderation-section-heading">
                      <div>
                        <strong>Nội dung đầy đủ</strong>
                        <small>Đọc trực tiếp trước khi đưa ra quyết định.</small>
                      </div>
                    </div>
                    <ArticleBody html={detailBodyHtml(reviewItem)} />
                  </div>
                ) : (
                  <div className="moderation-empty-body">
                    <TriangleAlert size={18} />
                    Chưa có phần nội dung chi tiết để hiển thị.
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="moderation-decision-panel">
            <div className="moderation-decision-panel__head">
              <span><ShieldCheck size={19} /></span>
              <div>
                <strong>Quyết định kiểm duyệt</strong>
                <small>Chọn một hành động rồi ghi chú khi cần.</small>
              </div>
            </div>

            <form onSubmit={submit}>
              <div className="moderation-action-grid">
                {ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.value}
                      type="button"
                      data-tone={action.tone}
                      className={form.action === action.value ? 'is-selected' : ''}
                      onClick={() => setForm((current) => ({ ...current, action: action.value }))}
                    >
                      <span><Icon size={18} /></span>
                      <div>
                        <strong>{action.label}</strong>
                        <small>{action.description}</small>
                      </div>
                    </button>
                  );
                })}
              </div>

              {form.action === 'approve' && selectedCanPublishImmediately ? (
                <label className="moderation-publish-toggle">
                  <input
                    type="checkbox"
                    checked={form.publishNow}
                    onChange={(event) => setForm((current) => ({ ...current, publishNow: event.target.checked }))}
                  />
                  <span>
                    <strong>Xuất bản ngay sau khi duyệt</strong>
                    <small>Tắt lựa chọn này nếu chỉ muốn đánh dấu “Đã duyệt”.</small>
                  </span>
                </label>
              ) : null}

              {form.action === 'approve' && reviewItem?.contentType === 'article' && !canPublishArticle ? (
                <div className="moderation-empty-body">
                  <ShieldCheck size={17} />
                  Bạn có quyền duyệt bài. Bài sẽ ở trạng thái Đã duyệt và chờ Trưởng ban biên tập xuất bản.
                </div>
              ) : null}

              <label className="moderation-field">
                <span>Mã lý do <small>(không bắt buộc)</small></span>
                <input
                  value={form.reasonCode}
                  onChange={(event) => setForm((current) => ({ ...current, reasonCode: event.target.value }))}
                  placeholder="Ví dụ: INFO_INCOMPLETE"
                />
              </label>

              <label className="moderation-field">
                <span>
                  Ghi chú gửi tác giả
                  {['request_revision', 'reject'].includes(form.action) ? <em>*</em> : null}
                </span>
                <textarea
                  rows="6"
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder={
                    form.action === 'approve'
                      ? 'Ghi chú nội bộ hoặc lời nhắn cho tác giả nếu cần...'
                      : 'Nêu rõ phần cần sửa hoặc lý do từ chối để tác giả xử lý nhanh...'
                  }
                />
              </label>

              <div className={`moderation-decision-summary is-${selectedAction.tone}`}>
                <SelectedActionIcon size={18} />
                <div>
                  <strong>{selectedAction.label}</strong>
                  <small>
                    {form.action === 'approve' && selectedCanPublishImmediately && form.publishNow
                      ? 'Nội dung sẽ chuyển sang Đã xuất bản ngay sau khi xác nhận.'
                      : selectedAction.description}
                  </small>
                </div>
              </div>

              <button
                type="submit"
                className={`moderation-submit-action is-${selectedAction.tone}`}
                disabled={actionLoading || detailLoading}
              >
                {actionLoading ? <LoaderCircle size={18} className="is-spinning" /> : <SelectedActionIcon size={18} />}
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận xử lý'}
              </button>
            </form>
          </aside>
        </div>
      </Modal>
    </div>
  );
}
