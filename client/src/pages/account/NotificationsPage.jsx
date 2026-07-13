import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { notificationApi } from '../../api/interaction.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatRelativeTime } from '../../utils/formatters';

export default function NotificationsPage() {
  const [items, setItems] = useState([]); const [meta, setMeta] = useState({}); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const toast = useToast();
  const load = () => { setLoading(true); notificationApi.list({ page, limit: 20 }).then((result) => { setItems(result.items); setMeta(result.meta); }).catch((error) => toast.error(apiErrorMessage(error))).finally(() => setLoading(false)); };
  useEffect(load, [page]);
  const read = async (item) => { if (!item.readAt) { await notificationApi.read(item._id); setItems((current) => current.map((value) => value._id === item._id ? { ...value, readAt: new Date().toISOString() } : value)); } };
  const readAll = async () => { await notificationApi.readAll(); setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))); };
  const remove = async (id) => { await notificationApi.remove(id); setItems((current) => current.filter((item) => item._id !== id)); };
  return <div><Seo title="Thông báo" /><div className="panel-heading"><div><h2>Thông báo</h2><p>Cập nhật về bài viết, bình luận và tài khoản.</p></div><Button variant="outline" size="sm" onClick={readAll}><CheckCheck size={16} /> Đánh dấu tất cả đã đọc</Button></div>{loading ? <LoadingBlock /> : items.length ? <div className="notification-list">{items.map((item) => <article key={item._id} className={item.readAt ? '' : 'is-unread'} onClick={() => read(item)}><div className="notification-list__icon"><Bell size={20} /></div><div><strong>{item.title || 'Thông báo'}</strong>{item.message ? <p>{item.message}</p> : null}<span>{formatRelativeTime(item.createdAt)}</span></div><button type="button" onClick={(event) => { event.stopPropagation(); remove(item._id); }}><Trash2 size={17} /></button></article>)}</div> : <EmptyState title="Chưa có thông báo" />}<Pagination meta={meta} onPageChange={setPage} /></div>;
}
