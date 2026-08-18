import { NavLink } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Files,
  Lock,
  MonitorSmartphone,
  Pencil,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/tai-khoan', label: 'Tổng quan', icon: UserRound, end: true },
  { to: '/tai-khoan/ho-so', label: 'Hồ sơ cá nhân', icon: Pencil },
  { to: '/tai-khoan/bao-mat', label: 'Bảo mật', icon: Lock },
  { to: '/tai-khoan/phien-dang-nhap', label: 'Phiên đăng nhập', icon: MonitorSmartphone },
  { to: '/tai-khoan/thong-bao', label: 'Thông báo', icon: Bell },
  { to: '/tai-khoan/noi-dung', label: 'Nội dung của tôi', icon: Files },
  { to: '/tai-khoan/da-luu', label: 'Nội dung đã lưu', icon: Bookmark },
  { to: '/tai-khoan/bao-cao', label: 'Báo cáo đã gửi', icon: ShieldCheck },
];

export default function AccountContentNav({ profile }) {
  const { user } = useAuth();
  const displayName = profile?.displayName || user?.displayName || user?.username || 'Thành viên';
  const avatar = profile?.avatarMediaId || user?.profile?.avatarMediaId;

  return (
    <aside className="account-shell-sidebar">
      <div className="account-shell-sidebar__intro">
        <Avatar src={avatar} name={displayName} size="sm" />
        <div>
          <small>Xin chào,</small>
          <strong>{displayName}</strong>
        </div>
      </div>

      <nav className="account-shell-nav" aria-label="Điều hướng tài khoản">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'is-active' : '')}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
