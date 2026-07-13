import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

export default function AdminArticlesPage(){const toast=useToast();const[items,setItems]=useState([]);const[meta,setMeta]=useState({});const[page,setPage]=useState(1);const[status,setStatus]=useState('');const[loading,setLoading]=useState(true);useEffect(()=>{setLoading(true);adminApi.articles({page,limit:20,status:status||undefined}).then(r=>{setItems(r.items);setMeta(r.meta)}).catch(e=>toast.error(apiErrorMessage(e))).finally(()=>setLoading(false))},[page,status]);return <div><Seo title="Quản lý tin tức"/><div className="panel-heading"><div><h2>Tin tức biên tập</h2><p>Tạo bài, quản lý trạng thái và lịch xuất bản.</p></div><Link className="btn btn--primary btn--sm" to="/quan-tri/bai-viet/moi">Tạo bài mới</Link></div><div className="filter-tabs">{[['','Tất cả'],['draft','Nháp'],['pending_review','Chờ duyệt'],['approved','Đã duyệt'],['scheduled','Lên lịch'],['published','Đã xuất bản']].map(([v,l])=><button type="button" key={v} className={status===v?'is-active':''} onClick={()=>{setStatus(v);setPage(1)}}>{l}</button>)}</div>{loading?<LoadingBlock/>:items.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tiêu đề</th><th>Trạng thái</th><th>Ngày tạo</th><th>Đường dẫn</th></tr></thead><tbody>{items.map(item=><tr key={item._id}><td><strong>{item.title}</strong><small>{item.summary}</small></td><td><Badge tone="soft">{CONTENT_STATUS[item.status]||item.status}</Badge></td><td>{formatDateTime(item.createdAt)}</td><td>{item.status==='published'?<Link to={`/tin-tuc/${item.slug}`}>Xem bài</Link>:<span>Chưa công khai</span>}</td></tr>)}</tbody></table></div>:<EmptyState title="Chưa có bài viết"/>}<Pagination meta={meta} onPageChange={setPage}/><p className="form-note">Server hiện chưa có endpoint lấy chi tiết bài nháp theo ID, nên client ưu tiên luồng tạo bài mới và kiểm duyệt.</p></div>}
