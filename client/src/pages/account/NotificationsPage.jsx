import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { notificationApi } from '../../api/interaction.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatRelativeTime } from '../../utils/formatters';

import './AccountPages.css';

export default function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationApi.list({ page, limit: 20 });
      setItems(result.items || []);
      setMeta(result.meta || {});
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleItems = useMemo(
    () =>
      filter === 'unread'
        ? items.filter((item) => !item.readAt)
        : items,
    [filter, items],
  );

  const unreadCount = items.filter((item) => !item.readAt).length;

  const markRead = async (item) => {
    if (item.readAt) return;

    try {
      await notificationApi.read(item._id);
      setItems((current) =>
        current.map((value) =>
          value._id === item._id
            ? { ...value, readAt: new Date().toISOString() }
            : value,
        ),
      );
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const readAll = async () => {
    if (!unreadCount || working) return;
    setWorking(true);

    try {
      await notificationApi.readAll();
      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt || new Date().toISOString(),
        })),
      );
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setWorking(false);
    }
  };

  const remove = async (id) => {
    try {
      await notificationApi.remove(id);
      setItems((current) => current.filter((item) => item._id !== id));
      toast.success('Đã xóa thông báo.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div className="account-page-view">
      <Seo title="Thông báo" />

      <div className="account-page-heading">
        <div>
          <span className="account-page-heading__eyebrow">
            <BellRing size={15} />
            Trung tâm thông báo
          </span>
          <h2>Thông báo của bạn</h2>
          <p>Theo dõi kiểm duyệt bài viết, bình luận, phản hồi và cập nhật tài khoản.</p>
        </div>

        <div className="account-form-actions">
          <button type="button" className="account-page-button account-page-button--neutral" onClick={load} disabled={loading}>
            <RefreshCw size={16} /> Làm mới
          </button>
          <button type="button" className="account-page-button account-page-button--soft" onClick={readAll} disabled={!unreadCount || working}>
            <CheckCheck size={16} /> Đọc tất cả
          </button>
        </div>
      </div>

      <div className="account-filter-tabs" aria-label="Lọc thông báo">
        <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>
          Tất cả ({items.length})
        </button>
        <button type="button" className={filter === 'unread' ? 'is-active' : ''} onClick={() => setFilter('unread')}>
          Chưa đọc ({unreadCount})
        </button>
      </div>

      <section className="account-page-card">
        {loading ? (
          <LoadingBlock />
        ) : visibleItems.length ? (
          <div className="account-notification-list">
            {visibleItems.map((item) => (
              <article
                key={item._id}
                className={`account-notification-item ${item.readAt ? '' : 'is-unread'}`}
                onClick={() => markRead(item)}
              >
                <span className="account-notification-item__icon">
                  <Bell size={20} />
                </span>

                <div>
                  <strong>{item.title || 'Thông báo'}</strong>
                  {item.message ? <p>{item.message}</p> : null}
                  <time>{formatRelativeTime(item.createdAt)}</time>
                </div>

                <button
                  type="button"
                  className="account-notification-item__delete"
                  aria-label="Xóa thông báo"
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(item._id);
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title={filter === 'unread' ? 'Không còn thông báo chưa đọc' : 'Chưa có thông báo'}
            description="Các cập nhật mới về tài khoản và nội dung sẽ xuất hiện tại đây."
          />
        )}
      </section>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
