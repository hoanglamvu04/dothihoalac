import { useEffect, useState } from 'react';
import Seo from '../../components/common/Seo';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

export default function AdminLogsPage(){const toast=useToast();const[items,setItems]=useState([]);const[meta,setMeta]=useState({});const[page,setPage]=useState(1);const[loading,setLoading]=useState(true);useEffect(()=>{setLoading(true);adminApi.activityLogs({page,limit:30}).then((result)=>{setItems(result.items);setMeta(result.meta)}).catch((error)=>toast.error(apiErrorMessage(error))).finally(()=>setLoading(false))},[page]);return <div><Seo title="Nhật ký quản trị"/><div className="panel-heading"><div><h2>Nhật ký quản trị</h2><p>Theo dõi các thao tác quan trọng để phục vụ kiểm tra và truy vết.</p></div></div>{loading?<LoadingBlock/>:items.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Thao tác</th><th>Quản trị viên</th><th>Đối tượng</th><th>IP</th><th>Thời gian</th></tr></thead><tbody>{items.map((item)=><tr key={item._id}><td><strong>{item.action}</strong></td><td>{item.adminId?.displayName||'—'}<small>@{item.adminId?.username}</small></td><td>{item.targetType||'—'}<small>{item.targetId?String(item.targetId):''}</small></td><td><code>{item.ipAddress||'—'}</code></td><td>{formatDateTime(item.createdAt)}</td></tr>)}</tbody></table></div>:<EmptyState title="Chưa có nhật ký"/>}<Pagination meta={meta} onPageChange={setPage}/></div>}
