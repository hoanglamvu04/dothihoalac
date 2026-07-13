import { useEffect, useState } from 'react';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { REPORT_REASONS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

const statusLabels = { pending: 'Chờ xử lý', reviewing: 'Đang xem xét', resolved: 'Đã xử lý', rejected: 'Không chấp nhận', duplicate: 'Trùng lặp' };

export default function AdminReportsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]); const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1); const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status: 'resolved', resolutionNote: '' });
  const load = () => { setLoading(true); adminApi.reports({ page, limit: 20, status: status || undefined }).then((result) => { setItems(result.items); setMeta(result.meta); }).catch((error) => toast.error(apiErrorMessage(error))).finally(() => setLoading(false)); };
  useEffect(load, [page, status]);
  const submit = async (event) => { event.preventDefault(); try { await adminApi.resolveReport(selected._id, form); toast.success('Đã xử lý báo cáo.'); setSelected(null); load(); } catch (error) { toast.error(apiErrorMessage(error)); } };
  return <div><Seo title="Báo cáo vi phạm" /><div className="panel-heading"><div><h2>Báo cáo vi phạm</h2><p>Ưu tiên lừa đảo, riêng tư, quấy rối và nội dung có rủi ro cao.</p></div></div><div className="filter-tabs">{[['','Tất cả'],['pending','Chờ xử lý'],['reviewing','Đang xem xét'],['resolved','Đã xử lý'],['rejected','Không chấp nhận']].map(([value,label])=><button type="button" key={value} className={status===value?'is-active':''} onClick={()=>{setStatus(value);setPage(1)}}>{label}</button>)}</div>{loading?<LoadingBlock/>:items.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Đối tượng</th><th>Lý do</th><th>Người báo cáo</th><th>Trạng thái</th><th>Thời gian</th><th /></tr></thead><tbody>{items.map((item)=><tr key={item._id}><td><strong>{item.targetType}</strong><small>{String(item.targetId)}</small></td><td>{REPORT_REASONS[item.reason]||item.reason}<small>{item.description}</small></td><td>{item.reporterId?.displayName||'—'}<small>@{item.reporterId?.username}</small></td><td><Badge tone={item.status==='pending'?'warning':'soft'}>{statusLabels[item.status]||item.status}</Badge></td><td>{formatDateTime(item.createdAt)}</td><td><Button size="sm" onClick={()=>{setSelected(item);setForm({status:item.status==='pending'?'resolved':item.status,resolutionNote:item.resolutionNote||''})}}>Xử lý</Button></td></tr>)}</tbody></table></div>:<EmptyState title="Không có báo cáo phù hợp"/>}<Pagination meta={meta} onPageChange={setPage}/><Modal open={Boolean(selected)} onClose={()=>setSelected(null)} title="Xử lý báo cáo"><form className="stack-form" onSubmit={submit}><div className="moderation-preview"><Badge tone="warning">{REPORT_REASONS[selected?.reason]||selected?.reason}</Badge><p>{selected?.description||'Không có mô tả bổ sung.'}</p></div><FormField label="Kết quả"><select value={form.status} onChange={(event)=>setForm({...form,status:event.target.value})}><option value="reviewing">Đang xem xét</option><option value="resolved">Đã xử lý</option><option value="rejected">Không chấp nhận báo cáo</option><option value="duplicate">Báo cáo trùng lặp</option></select></FormField><FormField label="Ghi chú kết quả"><textarea rows="6" value={form.resolutionNote} onChange={(event)=>setForm({...form,resolutionNote:event.target.value})}/></FormField><Button type="submit">Lưu kết quả</Button></form></Modal></div>;
}
