import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Shield,
  User,
  X,
} from 'lucide-react';
import logoMark from '../../assets/logo-mark.svg';
import { useAuth } from '../../context/AuthContext';
import { notificationApi } from '../../api/interaction.api';
import Avatar from '../common/Avatar';
import { ADMIN_ROLES } from '../../utils/constants';

const navItems = [
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/tin-tuc?category=quy-hoach', label: 'Quy hoạch' },
  { to: '/cong-dong', label: 'Cộng đồng' },
  { to: '/nha-dat', label: 'Nhà đất' },
  { to: '/viec-lam', label: 'Việc làm' },
];

export default function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [unread, setUnread] = useState(0);
  const menuRef = useRef(null);

  const isAdmin = useMemo(
    () => user?.roles?.some((role) => ADMIN_ROLES.includes(role)),
    [user],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setUnread(0);
      return undefined;
    }
    let active = true;
    const load = async () => {
      try {
        const result = await notificationApi.unreadCount();
        if (active) setUnread(result?.count || 0);
      } catch {
        if (active) setUnread(0);
      }
    };
    load();
    const timer = window.setInterval(load, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const clean = query.trim();
    if (clean) navigate(`/tim-kiem?q=${encodeURIComponent(clean)}&type=all`);
    setMobileOpen(false);
  };

  const doLogout = async () => {
    await logout();
    setUserOpen(false);
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="site-header__top">
        <div className="container site-header__top-inner">
          <span>Nền tảng thông tin và cộng đồng Hòa Lạc</span>
          <div>
            <Link to="/gioi-thieu">Về chúng tôi</Link>
            <Link to="/lien-he">Liên hệ</Link>
          </div>
        </div>
      </div>
      <div className="site-header__main">
        <div className="container site-header__main-inner">
          <Link className="brand" to="/" aria-label="Đô Thị Hòa Lạc - Trang chủ">
            <img src={logoMark} alt="" />
            <span>
              <strong>Đô Thị Hòa Lạc</strong>
              <small>Thông tin đúng · Kết nối thật</small>
            </span>
          </Link>

          <form className="header-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm quy hoạch, nhà đất, việc làm..."
              aria-label="Tìm kiếm"
            />
          </form>

          <nav className="desktop-nav" aria-label="Điều hướng chính">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <Link className="btn btn--accent btn--sm header-post-button" to="/dang-bai">
              <Plus size={17} /> Đăng bài
            </Link>
            {isAuthenticated ? (
              <>
                <Link className="icon-button notification-button" to="/tai-khoan/thong-bao" aria-label="Thông báo">
                  <Bell size={21} />
                  {unread > 0 ? <span>{unread > 99 ? '99+' : unread}</span> : null}
                </Link>
                <div className="user-menu" ref={menuRef}>
                  <button type="button" className="user-menu__trigger" onClick={() => setUserOpen((value) => !value)}>
                    <Avatar name={user?.displayName} src={user?.profile?.avatarMediaId} size="sm" />
                    <span>{user?.displayName}</span>
                    <ChevronDown size={16} />
                  </button>
                  {userOpen ? (
                    <div className="user-menu__panel">
                      <Link to="/tai-khoan" onClick={() => setUserOpen(false)}>
                        <User size={17} /> Tài khoản của tôi
                      </Link>
                      <Link to="/tai-khoan/ho-so" onClick={() => setUserOpen(false)}>
                        <Settings size={17} /> Cài đặt hồ sơ
                      </Link>
                      {isAdmin ? (
                        <Link to="/quan-tri" onClick={() => setUserOpen(false)}>
                          <Shield size={17} /> Quản trị hệ thống
                        </Link>
                      ) : null}
                      <button type="button" onClick={doLogout}>
                        <LogOut size={17} /> Đăng xuất
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="auth-links">
                <Link to="/dang-nhap">Đăng nhập</Link>
                <Link className="btn btn--primary btn--sm" to="/dang-ky">Đăng ký</Link>
              </div>
            )}
            <button className="mobile-menu-button" type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="Mở menu">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="mobile-nav">
          <div className="container">
            <form className="mobile-search" onSubmit={submitSearch}>
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm..." />
            </form>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            <Link to="/dang-bai" onClick={() => setMobileOpen(false)}>Đăng bài</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
