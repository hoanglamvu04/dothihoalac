import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  ExternalLink,
  FileText,
  Flag,
  FolderKanban,
  FolderTree,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  MessageSquareWarning,
  Rss,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import '../../styles/admin.css';
import './AdminLayoutProjectNav.css';
import './AdminModernShell.css';

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
        to: '/quan-tri/media',
        label: 'Thư viện media',
        icon: Images,
        permissions: ['manage_media', 'manage_system'],
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

function itemMatchesPath(item, pathname) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function AdminLayoutImpl() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const commandInputRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
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

  const commandItems = useMemo(
    () => visibleNavGroups.flatMap((group) => group.items.map((item) => ({
      ...item,
      group: group.label,
    }))),
    [visibleNavGroups],
  );

  const activeItem = useMemo(
    () => commandItems
      .filter((item) => itemMatchesPath(item, location.pathname))
      .sort((a, b) => b.to.length - a.to.length)[0] || commandItems[0] || null,
    [commandItems, location.pathname],
  );

  const filteredCommandItems = useMemo(() => {
    const keyword = commandQuery.trim().toLocaleLowerCase('vi-VN');
    if (!keyword) return commandItems;
    return commandItems.filter((item) => (
      `${item.label} ${item.group}`.toLocaleLowerCase('vi-VN').includes(keyword)
    ));
  }, [commandItems, commandQuery]);

  useEffect(() => {
    setMobileOpen(false);
    setCommandOpen(false);
    setCommandQuery('');
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      collapsed ? '1' : '0',
    );
  }, [collapsed]);

  useEffect(() => {
    const handleShortcut = (event) => {
      const commandKey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (commandKey && !studioMode) {
        event.preventDefault();
        setCommandOpen((value) => !value);
        return;
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [studioMode]);

  useEffect(() => {
    if (!commandOpen) return undefined;
    const timer = window.setTimeout(() => commandInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [commandOpen]);

  const signOut = async () => {
    await logout();
    navigate('/dang-nhap', { replace: true });
  };

  const openCommandItem = (item) => {
    setCommandOpen(false);
    setCommandQuery('');
    navigate(item.to);
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
        {!studioMode ? (
          <header className="admin-topbar">
            <div className="admin-topbar__context">
              <span>{activeItem?.group || 'Quản trị'}</span>
              <strong>{activeItem?.label || 'Tổng quan vận hành'}</strong>
            </div>

            <div className="admin-topbar__actions">
              <button type="button" className="admin-command-trigger" onClick={() => setCommandOpen(true)}>
                <Search size={17} />
                <span>Đi tới chức năng...</span>
                <kbd>Ctrl K</kbd>
              </button>
              <Link className="admin-site-link" to="/" target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                <span>Website</span>
              </Link>
            </div>
          </header>
        ) : null}

        <div className="admin-page">
          <Outlet />
        </div>
      </main>

      {commandOpen && !studioMode ? (
        <div className="admin-command-backdrop" onMouseDown={() => setCommandOpen(false)}>
          <section
            className="admin-command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Đi tới chức năng quản trị"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-command-palette__search">
              <Search size={20} />
              <input
                ref={commandInputRef}
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && filteredCommandItems[0]) {
                    event.preventDefault();
                    openCommandItem(filteredCommandItems[0]);
                  }
                }}
                placeholder="Tìm trang, chức năng quản trị..."
                aria-label="Tìm chức năng quản trị"
              />
              <button type="button" onClick={() => setCommandOpen(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>

            <div className="admin-command-results">
              {filteredCommandItems.length ? filteredCommandItems.map(({ to, label, group, icon: Icon, end }) => (
                <button
                  type="button"
                  key={to}
                  className="admin-command-result"
                  onClick={() => openCommandItem({ to, label, group, icon: Icon, end })}
                >
                  <span className="admin-command-result__icon"><Icon size={18} /></span>
                  <span className="admin-command-result__copy">
                    <strong>{label}</strong>
                    <small>{group}</small>
                  </span>
                  <ArrowRight className="admin-command-result__arrow" size={17} />
                </button>
              )) : (
                <div className="admin-command-empty">Không tìm thấy chức năng phù hợp.</div>
              )}
            </div>

            <footer className="admin-command-palette__footer">
              <span>Enter để mở kết quả đầu tiên</span>
              <span>Esc để đóng</span>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
