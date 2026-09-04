import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import {
  BriefcaseBusiness,
  Building2,
  House,
  LogIn,
  LogOut,
  Newspaper,
  UserPlus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import {
  DesktopThemeToggle,
  MobileThemePicker,
} from '../theme/ThemeSwitcher';
import './PrimaryNavigation.css';

const PRIMARY_ITEMS = [
  {
    key: 'home',
    to: '/',
    label: 'Trang chủ',
    icon: House,
    match: (pathname) => pathname === '/',
    prefetch: () => import('../../pages/public/HomePage'),
  },
  {
    key: 'jobs',
    to: '/viec-lam',
    label: 'Việc làm',
    icon: BriefcaseBusiness,
    match: (pathname) => pathname === '/viec-lam' || pathname.startsWith('/viec-lam/'),
    prefetch: () => import('../../pages/public/JobsPage'),
  },
  {
    key: 'community',
    to: '/cong-dong',
    label: 'Cộng đồng',
    icon: UsersRound,
    match: (pathname) => pathname === '/cong-dong' || pathname.startsWith('/cong-dong/'),
    prefetch: () => import('../../pages/public/CommunityPage'),
  },
  {
    key: 'news',
    to: '/tin-tuc',
    label: 'Tin tức',
    icon: Newspaper,
    match: (pathname) => pathname === '/tin-tuc' || pathname.startsWith('/tin-tuc/'),
    prefetch: () => import('../../pages/public/ArticlesPage'),
    children: [
      { to: '/tin-tuc', label: 'Tất cả tin tức' },
      { to: '/tin-tuc?category=quy-hoach', label: 'Quy hoạch' },
      { to: '/tin-tuc?category=ha-tang-giao-thong', label: 'Hạ tầng' },
      { to: '/tin-tuc?category=du-an-dtxd', label: 'Dự án ĐTXD' },
    ],
  },
  {
    key: 'account',
    to: '/tai-khoan',
    label: 'Tài khoản',
    icon: UserRound,
    match: (pathname) => pathname === '/tai-khoan' || pathname.startsWith('/tai-khoan/'),
    prefetch: () => import('../../pages/account/AccountOverviewPage'),
  },
  {
    key: 'property',
    to: '/bat-dong-san',
    label: 'Bất động sản',
    icon: Building2,
    match: (pathname) =>
      pathname === '/bat-dong-san' ||
      pathname.startsWith('/bat-dong-san/') ||
      pathname === '/nha-dat' ||
      pathname.startsWith('/nha-dat/'),
    prefetch: () => import('../../pages/public/PropertiesPage'),
  },
];

function warmItem(item) {
  if (!item?.prefetch) return;
  void item.prefetch().catch(() => {});
}

function usePortalTarget(selector) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let frame = null;

    const resolveTarget = () => {
      const nextTarget = document.querySelector(selector);
      if (!nextTarget) return false;
      setTarget(nextTarget);
      return true;
    };

    if (resolveTarget()) return undefined;

    const observer = new MutationObserver(() => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(resolveTarget);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [selector]);

  return target;
}

function closeMobileMenu() {
  document.querySelector('.dthl-mobile-nav__header button')?.click();
}

function DesktopNavigation() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';

  return (
    <nav className="dthl-primary-nav" aria-label="Điều hướng nội dung chính">
      {PRIMARY_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);

        return (
          <div
            className={`dthl-primary-nav__item${active ? ' is-active' : ''}${item.children ? ' has-children' : ''}`}
            key={item.key}
            onPointerEnter={() => warmItem(item)}
          >
            <Link
              className={`dthl-primary-nav__link${active ? ' is-active' : ''}`}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              onFocus={() => warmItem(item)}
              onTouchStart={() => warmItem(item)}
            >
              <span className="dthl-primary-nav__icon" aria-hidden="true">
                <Icon size={17} strokeWidth={2.2} />
              </span>
              <span>{item.label}</span>
            </Link>

            {item.children ? (
              <div className="dthl-primary-nav__submenu">
                <strong>Tin tức Hòa Lạc</strong>
                {item.children.map((child) => (
                  <Link key={child.to} to={child.to}>{child.label}</Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      <DesktopThemeToggle />
    </nav>
  );
}

function MobileSession() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await logout();
    } finally {
      closeMobileMenu();
      navigate('/');
      setLoggingOut(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="dthl-primary-mobile-session dthl-primary-mobile-session--guest">
        <Link to="/dang-nhap" onClick={closeMobileMenu}>
          <LogIn size={17} />
          Đăng nhập
        </Link>
        <Link to="/dang-ky" onClick={closeMobileMenu}>
          <UserPlus size={17} />
          Đăng ký
        </Link>
      </div>
    );
  }

  const displayName = user?.displayName || user?.username || 'Tài khoản';

  return (
    <div className="dthl-primary-mobile-session">
      <div className="dthl-primary-mobile-session__identity">
        <span><UserRound size={18} /></span>
        <div>
          <strong>{displayName}</strong>
          <small>{user?.email || 'Thành viên Đô Thị Hòa Lạc'}</small>
        </div>
      </div>
      <button type="button" onClick={handleLogout} disabled={loggingOut}>
        <LogOut size={17} />
        {loggingOut ? 'Đang thoát...' : 'Đăng xuất'}
      </button>
    </div>
  );
}

function MobileNavigation() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';

  return (
    <div className="dthl-primary-mobile-wrap">
      <nav className="dthl-primary-mobile" aria-label="Điều hướng chính trên điện thoại">
        {PRIMARY_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);

          return (
            <Link
              key={item.key}
              to={item.to}
              className={`dthl-primary-mobile__item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onPointerEnter={() => warmItem(item)}
              onTouchStart={() => warmItem(item)}
              onFocus={() => warmItem(item)}
              onClick={closeMobileMenu}
            >
              <span className="dthl-primary-mobile__icon" aria-hidden="true">
                <Icon size={21} strokeWidth={active ? 2.4 : 2.1} />
              </span>
              <strong>{item.label}</strong>
            </Link>
          );
        })}
      </nav>

      <MobileThemePicker />
      <MobileSession />
    </div>
  );
}

export default function PrimaryNavigation() {
  const desktopTarget = usePortalTarget('.dthl-header-nav__inner');
  const mobileTarget = usePortalTarget('.dthl-mobile-nav__links');

  return (
    <>
      {desktopTarget ? createPortal(<DesktopNavigation />, desktopTarget) : null}
      {mobileTarget ? createPortal(<MobileNavigation />, mobileTarget) : null}
    </>
  );
}
