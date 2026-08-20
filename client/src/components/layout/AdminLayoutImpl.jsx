import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  FileText,
  Flag,
  FolderKanban,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  MessageSquareWarning,
  Rss,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import './AdminLayoutProjectNav.css';

const SIDEBAR_STORAGE_KEY = 'dthl-admin-sidebar-collapsed';

const ROLE_LABELS = {
  system_admin: 'System Admin',
  user_admin: 'Quản trị người dùng',
  chief_editor: 'Trưởng ban biên tập',
  editor: 'Biên tập viên',
  moderator: 'Kiểm duyệt viên',
  contributor: 'Cộng tác viên',
};

const ROLE_PRIORITY = [
  'system_admin',
  'user_admin',
  'chief_editor',
  'editor',
  'moderator',
  'contributor',
];

const MODERATION_PERMISSIONS = [
  'approve_article',
  'publish_article',
  'moderate_community',
  'moderate_property',
  'moderate_job',
  'moderate_comment',
];

const REPORT_PERMISSIONS = [
  'manage_users',
  'moderate_community',
  'moderate_property',
  'moderate_job',
  'moderate_comment',
];

const navGroups = [
  {
    label: 'Tổng quan',
    items: [
      { to: '/quan-tri', label: 'Tổng quan vận hành', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Nội dung & dữ liệu',
    items: [
      {
        to: '/quan-tri/bai-viet',
        label: 'Bài viết / Tin tức',
        icon: FileText,
        permissions: ['create_article', 'edit_article', 'approve_article', 'publish_article'],
      },
      {
        to: '/quan-tri/du-an',
        label: 'Project Tracker',
        icon: FolderKanban,
        permissions: ['manage_system'],
      },
      {
        to: '/quan-tri/theo-doi-nguon',
        label: 'Theo dõi nguồn',
        icon: Rss,
        permissions: ['create_article', 'edit_article', 'manage_system'],
      },
      {
        to: '/quan-tri/binh-luan',
        label: 'Bình luận',
        icon: MessageCircle,
        permissions: ['moderate_comment'],
      },
    ],
  },
  {
    label: 'Cộng đồng & thị trường',
    items: [
      {
        to: '/quan-tri/cong-dong',
        label: 'Cộng đồng',
        icon: MessageSquareText,
        permissions: ['moderate_community'],
      },
      {
        to: '/quan-tri/nha-dat',
        label: 'Bất động sản',
        icon: Building2,
        permissions: ['moderate_property'],
      },
      {
        to: '/quan-tri/viec-lam',
        label: 'Việc làm',
        icon: BriefcaseBusiness,
        permissions: ['moderate_job'],
      },
    ],
  },
  {
    label: 'Vận hành & kiểm soát',
    items: [
      {
        to: '/quan-tri/kiem-duyet',
        label: 'Hàng chờ kiểm duyệt',
        icon: MessageSquareWarning,
        permissions: MODERATION_PERMISSIONS,
      },
      {
        to: '/quan-tri/nguoi-dung',
        label: 'Người dùng & phân quyền',
        icon: Users,
        permissions: ['manage_users'],
        roles: ['system_admin'],
      },
      {
        to: '/quan-tri/bao-cao',
        label: 'Báo cáo vi phạm',
        icon: Flag,
        permissions: REPORT_PERMISSIONS,
      },
      {
        to: '/quan-tri/khach-hang',
        label: 'Khách hàng tiềm năng',
        icon: BarChart3,
        permissions: ['manage_leads'],
      },
      {
        to: '/quan-tri/quang-cao',
        label: 'Quảng cáo',
        icon: Megaphone,
        permissions: ['manage_system'],
      },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      {
        to: '/quan-tri/phan-loai',
        label: 'Danh mục và khu vực',
        icon: FolderTree,
        permissions: ['manage_taxonomy', 'manage_system'],
      },
      {
        to: '/quan-tri/google-workspace',
        label: 'Google Workspace',
        icon: Cloud,
        permissions: ['create_article', 'edit_article', 'manage_system'],
      },
      {
        to: '/quan-tri/he-thong',
        label: 'Trang và cấu hình',
        icon: Settings,
        permissions: ['manage_system'],
      },
      {
        to: '/quan-tri/nhat-ky',
        label: 'Nhật ký quản trị',
        icon: ShieldCheck,
        permissions: ['view_audit_log', 'manage_system'],
      },
    ],
  },
];

function isStudioPath(pathname) {
  return (
    pathname === '/quan-tri/bai-viet/moi' ||
    pathname === '/quan-tri/bai-viet/docs/moi' ||
    /^\/quan-tri\/bai-viet\/[^/]+\/(sua|docs)$/.test(pathname)
  );
}

function canAccessItem(user, item) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const permissionMatch = !item.permissions?.length ||
    item.permissions.some((permission) => permissions.includes(permission));
  const roleMatch = !item.roles?.length ||
    item.roles.some((role) => roles.includes(role));

  if (item.permissions?.length && item.roles?.length) {
    return permissionMatch || roleMatch;
  }
  return permissionMatch && roleMatch;
}

function primaryStaffRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const slug = ROLE_PRIORITY.find((role) => roles.includes(role));
  return slug ? ROLE_LABELS[slug] : 'Nhân sự quản trị';
}

export default function AdminLayoutImpl() {
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

  const visibleNavGroups = useMemo(
    () => navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccessItem(user, item)),
      }))
      .filter((group) => group.items.length),
    [user],
  );

  useEffect(() => {
    void import('../../styles/admin.css');
  }, []);

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
          <span className="admin-brand-mark">
            <img src="/Logo.png" alt="" aria-hidden="true" />
          </span>
          <span className="admin-brand-copy">
            <strong>Đô Thị Hòa Lạc</strong>
            <small>Operations & Content Studio</small>
          </span>
        </Link>

        <nav className="admin-nav admin-nav--grouped">
          {visibleNavGroups.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <span className="admin-nav-group__label">{group.label}</span>
              <div className="admin-nav-group__items">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={Boolean(end)} title={collapsed ? label : undefined}>
                    <Icon size={19} strokeWidth={1.9} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-profile-copy">
            <strong>{displayName}</strong>
            <small>{primaryStaffRole(user)}</small>
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
