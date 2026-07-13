import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, Send } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import GenericContentCard from '../../components/content/GenericContentCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { propertyApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function MyListingsPage() {
  const toast = useToast(); const [items, setItems] = useState([]); const [meta, setMeta] = useState({}); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); userApi.myListings({ page, limit: 15 }).then((result) => { setItems(result.items); setMeta(result.meta); }).catch((error) => toast.error(apiErrorMessage(error))).finally(() => setLoading(false)); };
  useEffect(load, [page]);
  const act = async (action, id, message) => { try { await propertyApi[action](id); toast.success(message); load(); } catch (error) { toast.error(apiErrorMessage(error)); } };
  return <div><Seo title="Tin bất động sản của tôi" /><div className="panel-heading"><div><h2>Tin bất động sản</h2><p>Theo dõi duyệt tin, gia hạn và cập nhật trạng thái giao dịch.</p></div><Link className="btn btn--primary btn--sm" to="/dang-bai/nha-dat">Đăng tin mới</Link></div>{loading ? <LoadingBlock /> : items.length ? <div className="generic-list">{items.map((item) => <GenericContentCard key={item._id} item={item} showStatus actions={<>{['draft','needs_revision','rejected'].includes(item.status) ? <Button size="sm" onClick={() => act('submit', item._id, 'Đã gửi duyệt.')}><Send size={15} /> Gửi duyệt</Button> : null}{item.status === 'expired' ? <Button variant="outline" size="sm" onClick={() => act('renew', item._id, 'Đã gia hạn tin.')}><Clock3 size={15} /> Gia hạn</Button> : null}{item.status === 'published' ? <><Button variant="outline" size="sm" onClick={() => act('markSold', item._id, 'Đã đánh dấu đã bán.')}><CheckCircle2 size={15} /> Đã bán</Button><Button variant="outline" size="sm" onClick={() => act('markRented', item._id, 'Đã đánh dấu đã cho thuê.')}><CheckCircle2 size={15} /> Đã thuê</Button></> : null}</>} />)}</div> : <EmptyState title="Chưa có tin nhà đất" actionLabel="Đăng tin" actionTo="/dang-bai/nha-dat" />}<Pagination meta={meta} onPageChange={setPage} /></div>;
}
