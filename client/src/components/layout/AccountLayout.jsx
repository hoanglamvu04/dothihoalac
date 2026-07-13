import { NavLink, Outlet } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  FileText,
  Home,
  ListChecks,
  Lock,
  MonitorSmartphone,
  UserRound,
} from 'lucide-react';
import PageHeader from '../common/PageHeader';

const links = [
  ['/tai-khoan', 'Tổng quan', Home],
  ['/tai-khoan/ho-so', 'Hồ sơ cá nhân', UserRound],
  ['/tai-khoan/bao-mat', 'Bảo mật', Lock],
  ['/tai-khoan/phien-dang-nhap', 'Phiên đăng nhập', MonitorSmartphone],
  ['/tai-khoan/thong-bao', 'Thông báo', Bell],
  ['/tai-khoan/bai-viet', 'Bài viết của tôi', FileText],
  ['/tai-khoan/tin-nha-dat', 'Tin bất động sản', ListChecks],
  ['/tai-khoan/da-luu', 'Nội dung đã lưu', Bookmark],
  ['/tai-khoan/bao-cao', 'Báo cáo đã gửi', ListChecks],
];

export default function AccountLayout() {
  return (
    <section className="page-section account-section">
      <div className="container">
        <PageHeader eyebrow="Tài khoản" title="Quản lý tài khoản" description="Cập nhật hồ sơ, nội dung và các thiết lập bảo mật." />
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar">
            {links.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} end={to === '/tai-khoan'}>
                <Icon size={18} /> {label}
              </NavLink>
            ))}
          </aside>
          <div className="dashboard-content"><Outlet /></div>
        </div>
      </div>
    </section>
  );
}
