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
import { contentTypeLabel } from '../../utils/content';
import { formatDateTime } from '../../utils/formatters';

export default function ModerationQueuePage() {
  const toast = useToast(); const [items,setItems]=useState([]); const [meta,setMeta]=useState({}); const [page,setPage]=useState(1); const [type,setType]=useState(''); const [loading,setLoading]=useState(true); const [selected,setSelected]=useState(null); const [form,setForm]=useState({ action:'approve', note:'', reasonCode:'', publishNow:true });
  const load=()=>{setLoading(true);adminApi.moderationQueue({page,limit:15,type:type||undefined}).then((r)=>{setItems(r.items);setMeta(r.meta);}).catch((e)=>toast.error(apiErrorMessage(e))).finally(()=>setLoading(false));};
  useEffect(load,[page,type]);
  const submit=async(e)=>{e.preventDefault();try{const route=form.action==='request_revision'?'request-revision':form.action;await adminApi.moderate(selected._id,route,{note:form.note,reasonCode:form.reasonCode,publishNow:form.publishNow});toast.success('Đã xử lý nội dung.');setSelected(null);load();}catch(error){toast.error(apiErrorMessage(error));}};
  return <div><Seo title="Kiểm duyệt nội dung" /><div className="panel-heading"><div><h2>Hàng chờ kiểm duyệt</h2><p>Duyệt, yêu cầu sửa hoặc từ chối nội dung.</p></div><select value={type} onChange={(e)=>{setType(e.target.value);setPage(1);}}><option value="">Mọi loại</option><option value="community">Cộng đồng</option><option value="property">Bất động sản</option><option value="job">Việc làm</option><option value="article">Tin tức</option></select></div>{loading?<LoadingBlock/>:items.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nội dung</th><th>Loại</th><th>Tác giả</th><th>Ngày tạo</th><th></th></tr></thead><tbody>{items.map((item)=><tr key={item._id}><td><strong>{item.title}</strong><small>{item.summary}</small></td><td><Badge tone="soft">{contentTypeLabel(item.contentType)}</Badge></td><td>{item.authorId?.displayName || '—'}<small>@{item.authorId?.username}</small></td><td>{formatDateTime(item.createdAt)}</td><td><Button size="sm" onClick={()=>setSelected(item)}>Xử lý</Button></td></tr>)}</tbody></table></div>:<EmptyState title="Không có nội dung chờ duyệt"/>}<Pagination meta={meta} onPageChange={setPage}/><Modal open={Boolean(selected)} onClose={()=>setSelected(null)} title="Xử lý nội dung"><form className="stack-form" onSubmit={submit}><div className="moderation-preview"><Badge tone="soft">{contentTypeLabel(selected?.contentType)}</Badge><h3>{selected?.title}</h3><p>{selected?.summary}</p></div><FormField label="Hành động"><select value={form.action} onChange={(e)=>setForm({...form,action:e.target.value})}><option value="approve">Duyệt</option><option value="request_revision">Yêu cầu chỉnh sửa</option><option value="reject">Từ chối</option><option value="hide">Ẩn</option></select></FormField>{form.action==='approve'?<label className="checkbox-row"><input type="checkbox" checked={form.publishNow} onChange={(e)=>setForm({...form,publishNow:e.target.checked})}/><span>Xuất bản ngay sau khi duyệt.</span></label>:null}<FormField label="Mã lý do"><input value={form.reasonCode} onChange={(e)=>setForm({...form,reasonCode:e.target.value})}/></FormField><FormField label="Ghi chú gửi tác giả"><textarea rows="5" value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})}/></FormField><Button type="submit">Xác nhận xử lý</Button></form></Modal></div>;
}
