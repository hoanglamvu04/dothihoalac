import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  Bell,
  Bookmark,
  ChevronDown,
  Files,
  Heart,
  History,
  Lock,
  MessageCircle,
  MonitorSmartphone,
  Pencil,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';

const linksBeforeActivity = [
  { to: '/tai-khoan', label: 'Tổng quan', icon: UserRound, end: true },
  { to: '/tai-khoan/ho-so', label: 'Hồ sơ cá nhân', icon: Pencil },
  { to: '/tai-khoan/bao-mat', label: 'Bảo mật', icon: Lock },
  { to: '/tai-khoan/phien-dang-nhap', label: 'Phiên đăng nhập', icon: MonitorSmartphone },
  { to: '/tai-khoan/thong-bao', label: 'Thông báo', icon: Bell },
];

const activityLinks = [
  { to: '/tai-khoan/hoat-dong', label: 'Tổng quan hoạt động', icon: Activity, end: true },
  { to: '/tai-khoan/hoat-dong/tim-kiem', label: 'Lịch sử tìm kiếm', icon: Search },
  { to: '/tai-khoan/hoat-dong/binh-luan', label: 'Bình luận đã gửi', icon: MessageCircle },
  { to: '/tai-khoan/hoat-dong/da-thich', label: 'Bài viết đã thích', icon: Heart },
];

const linksAfterActivity = [
  { to: '/tai-khoan/noi-dung', label: 'Nội dung của tôi', icon: Files },
  { to: '/tai-khoan/da-luu', label: 'Nội dung đã lưu', icon: Bookmark },
  { to: '/tai-khoan/bao-cao', label: 'Báo cáo đã gửi', icon: ShieldCheck },
];

function NavItems({ items }) {
  return items.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) => (isActive ? 'is-active' : '')}
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  ));
}

export default function AccountContentNav({ profile }) {
  const { user } = useAuth();
  const location = useLocation();
  const displayName = profile?.displayName || user?.displayName || user?.username || 'Thành viên';
  const avatar = profile?.avatarMediaId || user?.profile?.avatarMediaId;
  const activityActive = location.pathname.startsWith('/tai-khoan/hoat-dong');
  const [activityOpen, setActivityOpen] = useState(activityActive);

  useEffect(() => {
    if (activityActive) setActivityOpen(true);
  }, [activityActive]);

  return (
    <aside className="account-shell-sidebar">
      <div className="account-shell-sidebar__intro">
        <Avatar src={avatar} name={displayName} size="sm" />
        <div>
          <small>Tài khoản</small>
          <strong>{displayName}</strong>
        </div>
      </div>

      <nav className="account-shell-nav" aria-label="Điều hướng tài khoản">
        <NavItems items={linksBeforeActivity} />

        <details
          className={`account-shell-nav__more ${activityActive ? 'is-active' : ''}`}
          open={activityOpen}
          onToggle={(event) => setActivityOpen(event.currentTarget.open)}
        >
          <summary className={activityActive ? 'is-active' : ''}>
            <span>
              <History size={18} />
              <span>Nhật ký hoạt động</span>
            </span>
            <ChevronDown className="account-shell-nav__chevron" size={15} />
          </summary>

          <div>
            <NavItems items={activityLinks} />
          </div>
        </details>

        <NavItems items={linksAfterActivity} />
      </nav>
    </aside>
  );
}
