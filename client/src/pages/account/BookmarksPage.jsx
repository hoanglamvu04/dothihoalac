import { useEffect, useState } from 'react';
import Seo from '../../components/common/Seo';
import GenericContentCard from '../../components/content/GenericContentCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function BookmarksPage() {
  const toast = useToast(); const [items, setItems] = useState([]); const [meta, setMeta] = useState({}); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); userApi.myBookmarks({ page, limit: 15 }).then((result) => { setItems(result.items); setMeta(result.meta); }).catch((error) => toast.error(apiErrorMessage(error))).finally(() => setLoading(false)); }, [page]);
  return <div><Seo title="Nội dung đã lưu" /><h2>Nội dung đã lưu</h2><p>Danh sách bài viết, tin nhà đất và việc làm bạn đã đánh dấu.</p>{loading ? <LoadingBlock /> : items.length ? <div className="generic-list">{items.map((bookmark) => bookmark.contentId ? <GenericContentCard key={bookmark._id} item={bookmark.contentId} /> : null)}</div> : <EmptyState title="Chưa lưu nội dung nào" actionLabel="Khám phá tin mới" actionTo="/tin-tuc" />}<Pagination meta={meta} onPageChange={setPage} /></div>;
}
