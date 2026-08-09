import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ExternalLink,
  FileText,
  Flag,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  MessageSquareWarning,
  Settings,
  Users,
  X,
  CloudCog,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  ['/quan-tri', 'Tổng quan', LayoutDashboard],
  ['/quan-tri/kiem-duyet', 'Hàng chờ kiểm duyệt', MessageSquareWarning],
  ['/quan-tri/bai-viet', 'Tin tức biên tập', FileText],
  ['/quan-tri/khach-hang', 'Khách hàng tiềm năng', BarChart3],
  ['/quan-tri/nguoi-dung', 'Người dùng', Users],
  ['/quan-tri/bao-cao', 'Báo cáo vi phạm', Flag],
  ['/quan-tri/phan-loai', 'Danh mục và khu vực', FolderTree],
  ['/quan-tri/google-workspace', 'Google Workspace', CloudCog],
  ['/quan-tri/he-thong', 'Trang, banner, cấu hình', Settings],
  ['/quan-tri/nhat-ky', 'Nhật ký quản trị', Megaphone],
];

const pageNames = {
  '/quan-tri': 'Tổng quan vận hành',
  '/quan-tri/kiem-duyet': 'Hàng chờ kiểm duyệt',
  '/quan-tri/bai-viet': 'Trung tâm biên tập',
  '/quan-tri/khach-hang': 'Khách hàng tiềm năng',
  '/quan-tri/nguoi-dung': 'Người dùng',
  '/quan-tri/bao-cao': 'Báo cáo vi phạm',
  '/quan-tri/phan-loai': 'Danh mục & khu vực',
  '/quan-tri/google-workspace': 'Google Workspace',
  '/quan-tri/he-thong': 'Cấu hình hệ thống',
  '/quan-tri/nhat-ky': 'Nhật ký quản trị',
};

function initials(value = '') {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (parts.length ? parts.slice(-2).map((part) => part[0]).join('') : 'AD').toUpperCase();
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const pageName = useMemo(() => {
    if (location.pathname.startsWith('/quan-tri/bai-viet/')) {
      return location.pathname.endsWith('/moi')
        ? 'Soạn bài mới'
        : 'Chỉnh sửa bài viết';
    }
    return pageNames[location.pathname] || 'Trung tâm vận hành';
  }, [location.pathname]);

  const displayName = user?.displayName || user?.profile?.displayName || user?.username || 'Quản trị viên';
  const email = user?.email || '';

  const handleLogout = async () => {
    await logout();
    navigate('/dang-nhap', { replace: true });
  };

  return (
    <div className={`admin-studio-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <aside className="admin-studio-sidebar" aria-label="Điều hướng quản trị">
        <Link className="admin-studio-brand" to="/quan-tri">
          <span className="admin-studio-brand-mark">ĐTHL</span>
          <span className="admin-studio-brand-copy">
            <strong>Đô Thị Hòa Lạc</strong>
            <span>Content & Community Studio</span>
          </span>
        </Link>

        <nav className="admin-studio-nav">
          <div className="admin-studio-nav-label">Vận hành nội dung</div>
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/quan-tri'}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              <Icon size={17} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-studio-user">
          <div className="admin-studio-user-card">
            <span className="admin-studio-avatar">{initials(displayName)}</span>
            <span className="admin-studio-user-copy">
              <strong>{displayName}</strong>
              <span>{email || 'Đang đăng nhập'}</span>
            </span>
            <button
              type="button"
              className="admin-studio-logout"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="admin-studio-overlay"
        aria-label="Đóng menu quản trị"
        onClick={() => setMenuOpen(false)}
      />

      <div className="admin-studio-main">
        <header className="admin-studio-topbar">
          <div className="admin-studio-topbar-left">
            <button
              type="button"
              className="admin-studio-mobile-toggle"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label={menuOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="admin-studio-page-name">
              <span>Đô Thị Hòa Lạc · Admin</span>
              <strong>{pageName}</strong>
            </div>
          </div>

          <div className="admin-studio-topbar-actions">
            <Link className="admin-studio-top-action" to="/tin-tuc">
              <FileText size={14} />
              <span>Xem tin tức</span>
            </Link>
            <Link className="admin-studio-top-action" to="/" target="_blank">
              <ExternalLink size={14} />
              <span>Mở website</span>
            </Link>
          </div>
        </header>

        <main className="admin-studio-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
