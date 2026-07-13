import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit3, Send } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import GenericContentCard from '../../components/content/GenericContentCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { communityApi, jobApi, propertyApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function MyPostsPage() {
  const navigate = useNavigate(); const toast = useToast(); const [items, setItems] = useState([]); const [meta, setMeta] = useState({}); const [page, setPage] = useState(1); const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); userApi.myPosts({ page, limit: 15, status: status || undefined }).then((result) => { setItems(result.items); setMeta(result.meta); }).catch((error) => toast.error(apiErrorMessage(error))).finally(() => setLoading(false)); };
  useEffect(load, [page, status]);
  const submit = async (item) => { try { const map = { community: communityApi, property: propertyApi, job: jobApi }; await map[item.contentType]?.submit(item._id); toast.success('Đã gửi nội dung đi duyệt.'); load(); } catch (error) { toast.error(apiErrorMessage(error)); } };
  const edit = (item) => { const paths = { community: '/dang-bai/cong-dong', property: '/dang-bai/nha-dat', job: '/dang-bai/viec-lam' }; navigate(`${paths[item.contentType]}?edit=${item._id}`, { state: { item } }); };
  return <div><Seo title="Bài viết của tôi" /><div className="panel-heading"><div><h2>Bài viết của tôi</h2><p>Quản lý bản nháp và trạng thái kiểm duyệt.</p></div><Link className="btn btn--primary btn--sm" to="/dang-bai">Tạo nội dung</Link></div><div className="filter-tabs">{[['','Tất cả'],['draft','Bản nháp'],['pending_review','Chờ duyệt'],['needs_revision','Cần sửa'],['published','Đã xuất bản'],['rejected','Bị từ chối']].map(([value,label]) => <button type="button" key={value} className={status === value ? 'is-active' : ''} onClick={() => { setStatus(value); setPage(1); }}>{label}</button>)}</div>{loading ? <LoadingBlock /> : items.length ? <div className="generic-list">{items.map((item) => <GenericContentCard key={item._id} item={item} showStatus actions={<><Button variant="outline" size="sm" onClick={() => edit(item)}><Edit3 size={15} /> Sửa</Button>{['draft','needs_revision','rejected'].includes(item.status) ? <Button size="sm" onClick={() => submit(item)}><Send size={15} /> Gửi duyệt</Button> : null}</>} />)}</div> : <EmptyState title="Chưa có bài viết" actionLabel="Đăng bài" actionTo="/dang-bai" />}<Pagination meta={meta} onPageChange={setPage} /><p className="form-note">Lưu ý: server hiện chưa có endpoint lấy chi tiết bản nháp theo ID. Khi sửa, client dùng dữ liệu từ trang danh sách và chỉ gửi các trường bạn nhập lại.</p></div>;
}
