import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Cloud,
  FileText,
  Flag,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  MessageSquareWarning,
  Rss,
  Settings,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const SIDEBAR_STORAGE_KEY = 'dthl-admin-sidebar-collapsed';

const links = [
  ['/quan-tri', 'Tổng quan', LayoutDashboard, true],
  ['/quan-tri/kiem-duyet', 'Hàng chờ kiểm duyệt', MessageSquareWarning],
  ['/quan-tri/bai-viet', 'Bài viết / Tin tức', FileText],
  ['/quan-tri/theo-doi-nguon', 'Theo dõi nguồn', Rss],
  ['/quan-tri/viec-lam', 'Việc làm', BriefcaseBusiness],
  ['/quan-tri/nguoi-dung', 'Người dùng', Users],
  ['/quan-tri/bao-cao', 'Báo cáo vi phạm', Flag],
  ['/quan-tri/khach-hang', 'Khách hàng tiềm năng', BarChart3],
  ['/quan-tri/phan-loai', 'Danh mục và khu vực', FolderTree],
  ['/quan-tri/google-workspace', 'Google Workspace', Cloud],
  ['/quan-tri/he-thong', 'Trang, banner, cấu hình', Settings],
  ['/quan-tri/nhat-ky', 'Nhật ký quản trị', Megaphone],
];

function isStudioPath(pathname) {
  return (
    pathname === '/quan-tri/bai-viet/moi' ||
    pathname === '/quan-tri/bai-viet/docs/moi' ||
    /^\/quan-tri\/bai-viet\/[^/]+\/(sua|docs)$/.test(pathname)
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => (
    window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  ));

  const studioMode = useMemo(
    () => isStudioPath(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      collapsed ? '1' : '0',
    );
  }, [collapsed]);

  const signOut = async () => {
    await logout();
    navigate('/dang-nhap', { replace: true });
  };

  const displayName =
    user?.displayName ||
    user?.profile?.displayName ||
    user?.username ||
    'Quản trị viên';

  return (
    <div
      className={[
        'admin-shell',
        collapsed ? 'is-collapsed' : '',
        mobileOpen ? 'is-mobile-open' : '',
        studioMode ? 'is-studio' : '',
      ].filter(Boolean).join(' ')}
    >
      <aside className="admin-sidebar" aria-label="Điều hướng quản trị">
        <Link className="admin-brand" to="/quan-tri">
          <span className="admin-brand-mark">ĐT</span>
          <span className="admin-brand-copy">
            <strong>Đô Thị Hòa Lạc</strong>
            <small>Content & Community Studio</small>
          </span>
        </Link>

        <nav className="admin-nav">
          {links.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={Boolean(end)} title={collapsed ? label : undefined}>
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-profile-copy">
            <strong>{displayName}</strong>
            <small>{user?.email || 'Đang đăng nhập quản trị'}</small>
          </div>
          <button type="button" onClick={signOut} title="Đăng xuất">
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>

        <button
          type="button"
          className="admin-sidebar-collapse"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Mở rộng thanh quản trị' : 'Thu gọn thanh quản trị'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <div className="admin-mobile-bar">
        <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="Mở menu quản trị">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link to="/quan-tri">ĐÔ THỊ HÒA LẠC · ADMIN</Link>
        <Link to="/" target="_blank" rel="noreferrer">Website</Link>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="admin-mobile-backdrop"
          aria-label="Đóng menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <main className="admin-main">
        <div className="admin-page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
