import { useEffect, useState } from 'react';
import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { REPORT_REASONS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

export default function ReportsPage() {
  const toast = useToast(); const [items, setItems] = useState([]); const [meta, setMeta] = useState({}); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); userApi.myReports({ page, limit: 15 }).then((result) => { setItems(result.items); setMeta(result.meta); }).catch((error) => toast.error(apiErrorMessage(error))).finally(() => setLoading(false)); }, [page]);
  return <div><Seo title="Báo cáo đã gửi" /><h2>Báo cáo nội dung</h2><p>Theo dõi trạng thái những báo cáo bạn đã gửi.</p>{loading ? <LoadingBlock /> : items.length ? <div className="report-list">{items.map((item) => <article key={item._id}><div><Badge tone={item.status === 'resolved' ? 'success' : 'soft'}>{item.status}</Badge><strong>{REPORT_REASONS[item.reason] || item.reason}</strong><span>{item.targetType} · {formatDateTime(item.createdAt)}</span>{item.description ? <p>{item.description}</p> : null}{item.resolutionNote ? <blockquote>{item.resolutionNote}</blockquote> : null}</div></article>)}</div> : <EmptyState title="Bạn chưa gửi báo cáo nào" />}<Pagination meta={meta} onPageChange={setPage} /></div>;
}
