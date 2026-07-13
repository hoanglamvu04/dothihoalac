import { Link } from 'react-router-dom';
import { BadgeCheck, Bell, FileText, Home, ShieldCheck } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export default function AccountOverviewPage() {
  const { user } = useAuth();
  return <div><Seo title="Tổng quan tài khoản" /><div className="account-welcome"><Avatar name={user?.displayName} src={user?.profile?.avatarMediaId} size="xl" /><div><span>Xin chào</span><h2>{user?.displayName}</h2><p>@{user?.username}</p><div className="content-card__labels">{user?.emailVerifiedAt ? <Badge tone="success"><BadgeCheck size={14} /> Email đã xác thực</Badge> : <Badge tone="warning">Email chưa xác thực</Badge>}{user?.phoneVerifiedAt ? <Badge tone="success"><ShieldCheck size={14} /> SĐT đã xác thực</Badge> : <Badge tone="warning">SĐT chưa xác thực</Badge>}</div></div></div><div className="quick-action-grid"><Link to="/dang-bai/cong-dong"><FileText size={24} /><strong>Đăng bài cộng đồng</strong><span>Thảo luận, hỏi đáp hoặc chia sẻ.</span></Link><Link to="/dang-bai/nha-dat"><Home size={24} /><strong>Đăng tin nhà đất</strong><span>Yêu cầu xác thực số điện thoại.</span></Link><Link to="/tai-khoan/thong-bao"><Bell size={24} /><strong>Xem thông báo</strong><span>Theo dõi duyệt bài và tương tác.</span></Link></div>{!user?.emailVerifiedAt || !user?.phoneVerifiedAt ? <div className="account-alert"><h3>Hoàn thiện xác thực tài khoản</h3><p>Xác thực email giúp bảo vệ tài khoản; xác thực số điện thoại cho phép đăng tin bất động sản.</p><div>{!user?.emailVerifiedAt ? <Link className="btn btn--outline btn--sm" to="/xac-thuc-email">Xác thực email</Link> : null}{!user?.phoneVerifiedAt ? <Link className="btn btn--primary btn--sm" to="/xac-thuc-so-dien-thoai">Xác thực số điện thoại</Link> : null}</div></div> : null}</div>;
}
