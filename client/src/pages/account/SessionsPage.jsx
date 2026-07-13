import { useEffect, useState } from 'react';
import { Monitor, Smartphone, Trash2 } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

export default function SessionsPage() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const toast = useToast();
  const load = () => { setLoading(true); userApi.sessions().then(setItems).catch((error) => toast.error(apiErrorMessage(error))).finally(() => setLoading(false)); };
  useEffect(load, []);
  const revoke = async (id) => { try { await userApi.revokeSession(id); toast.success('Đã thu hồi phiên đăng nhập.'); load(); } catch (error) { toast.error(apiErrorMessage(error)); } };
  return <div><Seo title="Phiên đăng nhập" /><h2>Thiết bị đang đăng nhập</h2><p>Thu hồi các phiên bạn không nhận ra hoặc không còn sử dụng.</p>{loading ? <LoadingBlock /> : <div className="session-list">{items.map((session) => <article key={session._id}>{session.userAgent?.toLowerCase().includes('mobile') ? <Smartphone size={24} /> : <Monitor size={24} />}<div><strong>{session.deviceName || 'Trình duyệt web'}</strong><span>{session.ipAddress || 'Không rõ IP'}</span><small>Hoạt động {formatDateTime(session.lastActiveAt)}</small></div><Button variant="danger" size="sm" onClick={() => revoke(session._id)}><Trash2 size={16} /> Thu hồi</Button></article>)}</div>}</div>;
}
