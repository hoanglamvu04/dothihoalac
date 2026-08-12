import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  FilePenLine,
  FilePlus2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { CONTENT_STATUS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

import './AdminArticlesPage.css';

const statuses = [
  ['', 'Tất cả'],
  ['draft', 'Nháp'],
  ['pending_review', 'Chờ duyệt'],
  ['approved', 'Đã duyệt'],
  ['scheduled', 'Lên lịch'],
  ['published', 'Đã xuất bản'],
];

const newTabProps = {
  target: '_blank',
  rel: 'noopener noreferrer',
};

function coverUrl(item) {
  const media = item?.thumbnailMediaId;

  if (!media || typeof media === 'string') {
    return '';
  }

  return media.secureUrl || media.url || '';
}

function openPublicUrl(path) {
  if (!path) return;

  const url = new URL(
    path,
    window.location.origin,
  ).toString();

  const tab = window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  );

  if (tab) tab.opener = null;
}

export default function AdminArticlesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState('');
  const [publishingId, setPublishingId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);

    adminApi
      .articles({
        page,
        limit: 20,
        status: status || undefined,
        q: appliedQuery || undefined,
      })
      .then((result) => {
        setItems(result.items);
        setMeta(result.meta);
        setSelectedIds([]);
      })
      .catch((error) =>
        toast.error(apiErrorMessage(error)),
      )
      .finally(() => setLoading(false));
  }, [appliedQuery, page, reloadKey, status, toast]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  };

  const replaceItem = (nextItem) => {
    const id = String(nextItem?._id || '');
    if (!id) return;

    setItems((current) =>
      current.map((item) =>
        String(item._id) === id
          ? nextItem
          : item,
      ),
    );
  };

  const pageIds = items.map((item) => String(item._id));
  const allPageSelected =
    pageIds.length > 0 &&
    pageIds.every((id) => selectedIds.includes(id));

  const toggleSelected = (id) => {
    const normalizedId = String(id || '');
    if (!normalizedId || deleting) return;

    setSelectedIds((current) =>
      current.includes(normalizedId)
        ? current.filter((value) => value !== normalizedId)
        : [...current, normalizedId],
    );
  };

  const togglePageSelection = () => {
    if (deleting || !pageIds.length) return;

    setSelectedIds(
      allPageSelected ? [] : pageIds,
    );
  };

  const deleteSelected = async () => {
    if (
      !selectedIds.length ||
      deleting ||
      syncingId ||
      publishingId
    ) {
      return;
    }

    const selectedSet = new Set(selectedIds);
    const publishedCount = items.filter(
      (item) =>
        selectedSet.has(String(item._id)) &&
        item.status === 'published',
    ).length;

    const warning = publishedCount
      ? `\n\nCó ${publishedCount} bài đang xuất bản. Các bài này sẽ biến mất khỏi website ngay.`
      : '';

    const accepted = window.confirm(
      `Xóa ${selectedIds.length} bài viết đã chọn?${warning}\n\nThao tác sẽ ẩn các bài khỏi website và danh sách quản trị hiện tại.`,
    );

    if (!accepted) return;

    setDeleting(true);

    try {
      const result = await adminApi.bulkDeleteArticles(
        selectedIds,
      );

      const deletedCount = Number(
        result?.deletedCount || 0,
      );

      toast.success(
        `Đã xóa ${deletedCount} bài viết.`,
      );

      const removedWholePage =
        selectedIds.length >= items.length;

      setSelectedIds([]);

      if (removedWholePage && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const syncArticle = async (item) => {
    const id = String(item?._id || '');

    if (
      !id ||
      !item?.article?.googleDocId ||
      syncingId ||
      publishingId ||
      deleting
    ) {
      return;
    }

    setSyncingId(id);

    try {
      const synced =
        await adminApi.syncGoogleDoc(id);

      replaceItem(synced);

      toast.success(
        `Đã đồng bộ Google Docs: ${synced?.title || item.title}. Ảnh đầu tiên đã được dùng làm ảnh bìa.`,
      );
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSyncingId('');
    }
  };

  const publishArticle = async (item) => {
    const id = String(item?._id || '');

    if (
      !id ||
      !item?.article?.googleDocId ||
      syncingId ||
      publishingId ||
      deleting
    ) {
      return;
    }

    const isPublished =
      item.status === 'published';

    const accepted = window.confirm(
      isPublished
        ? 'Đồng bộ Google Docs mới nhất và cập nhật bài đang xuất bản?'
        : 'Xuất bản bài này? Hệ thống sẽ tự đồng bộ Google Docs mới nhất, nhận ảnh về Cloudinary rồi mới đăng.',
    );

    if (!accepted) return;

    setPublishingId(id);

    try {
      const result =
        await adminApi.publishGoogleDoc(id);

      if (result?.item) {
        replaceItem(result.item);
      }

      toast.success(
        isPublished
          ? 'Đã đồng bộ và cập nhật bài viết.'
          : 'Đã đồng bộ và xuất bản bài viết.',
      );

      const shouldOpen = window.confirm(
        `${isPublished ? 'Đã cập nhật' : 'Đã xuất bản'} bài viết.\n\nTiêu đề: ${result?.item?.title || item.title}\n\nMở bài ngoài website ngay?`,
      );

      if (shouldOpen && result?.previewUrl) {
        openPublicUrl(result.previewUrl);
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPublishingId('');
    }
  };

  return (
    <div>
      <Seo title="Quản lý bài viết" />

      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">
            Content Studio
          </p>
          <h1>Bài viết / Tin tức</h1>
          <p>
            Google Docs là phòng soạn chính. Soạn tiêu đề, nội dung và chèn ảnh ngay trong Docs; bấm Đồng bộ để kéo dữ liệu về DTHL. Ảnh đầu tiên trong tài liệu là ảnh bìa, các ảnh sau hiển thị đúng trong nội dung bài.
          </p>
        </div>

        <div className="admin-row-actions">
          <Link
            className="admin-primary"
            to="/quan-tri/bai-viet/moi"
            {...newTabProps}
          >
            <FilePlus2 size={15} />
            Bài mới trên Google Docs ↗
          </Link>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="filter-tabs">
          {statuses.map(([value, label]) => (
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
              {label}
            </button>
          ))}
        </div>

        <form
          className="admin-search"
          onSubmit={submitSearch}
        >
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Tìm tiêu đề hoặc mô tả…"
          />

          <button
            className="admin-secondary"
            type="submit"
          >
            <Search size={14} /> Tìm
          </button>
        </form>
      </div>

      {!loading && items.length ? (
        <div className="admin-article-bulk-toolbar">
          <label className="admin-article-select-page">
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={togglePageSelection}
              disabled={deleting}
            />
            <span>
              {selectedIds.length
                ? `${selectedIds.length} bài đã chọn`
                : `Chọn ${items.length} bài trên trang`}
            </span>
          </label>

          <button
            type="button"
            className="admin-article-bulk-delete"
            disabled={
              !selectedIds.length ||
              deleting ||
              Boolean(syncingId) ||
              Boolean(publishingId)
            }
            onClick={deleteSelected}
          >
            <Trash2 size={14} />
            {deleting
              ? 'Đang xóa…'
              : `Xóa đã chọn${selectedIds.length ? ` (${selectedIds.length})` : ''}`}
          </button>
        </div>
      ) : null}

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-article-list-table">
            <thead>
              <tr>
                <th className="admin-article-select-col">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={togglePageSelection}
                    disabled={deleting}
                    aria-label="Chọn tất cả bài trên trang"
                  />
                </th>
                <th>Ảnh bìa</th>
                <th>Tiêu đề</th>
                <th>Danh mục</th>
                <th>Google Docs</th>
                <th>Đồng bộ</th>
                <th>Trạng thái</th>
                <th>Xuất bản</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const itemId = String(
                  item._id,
                );

                const docUrl =
                  item?.article?.googleDocUrl ||
                  '';

                const hasDocs = Boolean(
                  item?.article?.googleDocId,
                );

                const imageUrl =
                  coverUrl(item);

                const syncing =
                  syncingId === itemId;

                const publishing =
                  publishingId === itemId;

                const busy = Boolean(
                  syncingId ||
                  publishingId ||
                  deleting,
                );

                const selected =
                  selectedIds.includes(itemId);

                return (
                  <tr
                    key={item._id}
                    className={selected ? 'is-selected' : ''}
                  >
                    <td className="admin-article-select-col">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelected(itemId)}
                        disabled={deleting}
                        aria-label={`Chọn bài ${item.title}`}
                      />
                    </td>

                    <td>
                      <div className="admin-article-cover-cell">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className="admin-article-cover-placeholder">
                            ▧
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="admin-article-title-cell">
                      <strong>
                        {item.title}
                      </strong>
                      <small>
                        {item.summary ||
                          'Chưa có mô tả ngắn'}
                      </small>
                    </td>

                    <td>
                      {item.primaryCategoryId
                        ?.name || '—'}
                    </td>

                    <td>
                      {docUrl ? (
                        <a
                          className="admin-article-doc-link"
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Mở Docs ↗
                        </a>
                      ) : (
                        <span className="admin-table-muted">
                          Tạo khi mở
                        </span>
                      )}
                    </td>

                    <td>
                      {hasDocs ? (
                        <button
                          type="button"
                          className="admin-doc-sync"
                          disabled={busy}
                          onClick={() =>
                            syncArticle(item)
                          }
                          title="Lấy tiêu đề, mô tả, ảnh bìa và nội dung mới nhất từ Google Docs"
                        >
                          <RefreshCw size={13} />
                          {syncing
                            ? 'Đang đồng bộ…'
                            : 'Đồng bộ'}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td>
                      <Badge
                        tone={
                          item.status ===
                          'published'
                            ? 'success'
                            : item.status ===
                                'pending_review'
                              ? 'warning'
                              : 'soft'
                        }
                      >
                        {CONTENT_STATUS[
                          item.status
                        ] || item.status}
                      </Badge>

                      {item?.article
                        ?.googleDocSyncedAt ? (
                        <small className="admin-article-sync-time">
                          Docs:{' '}
                          {formatDateTime(
                            item.article
                              .googleDocSyncedAt,
                          )}
                        </small>
                      ) : null}
                    </td>

                    <td>
                      {hasDocs ? (
                        <button
                          type="button"
                          className={`admin-doc-publish ${
                            item.status ===
                            'published'
                              ? 'is-update'
                              : ''
                          }`}
                          disabled={busy}
                          onClick={() =>
                            publishArticle(item)
                          }
                        >
                          {publishing
                            ? 'Đang xử lý…'
                            : item.status ===
                                'published'
                              ? 'Cập nhật ↗'
                              : 'Xuất bản ↗'}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td>
                      <div className="admin-row-actions">
                        <Link
                          to={`/quan-tri/bai-viet/${item._id}/sua`}
                          {...newTabProps}
                        >
                          <FilePenLine size={13} />
                          Sửa ↗
                        </Link>

                        {item.status ===
                        'published' ? (
                          <Link
                            to={`/tin-tuc/${item.slug}`}
                            {...newTabProps}
                          >
                            <ExternalLink
                              size={13}
                            />
                            Xem ↗
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Chưa có bài viết phù hợp" />
      )}

      <Pagination
        meta={meta}
        onPageChange={setPage}
      />
    </div>
  );
}
