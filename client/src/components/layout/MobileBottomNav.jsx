import { Link, useLocation } from 'react-router-dom';
import {
  BriefcaseBusiness,
  Building2,
  House,
  Newspaper,
  UserRound,
} from 'lucide-react';

import './MobileBottomNav.css';

const ITEMS = [
  {
    to: '/',
    label: 'Trang chủ',
    icon: House,
    match: (pathname) => pathname === '/',
  },
  {
    to: '/viec-lam',
    label: 'Việc làm',
    icon: BriefcaseBusiness,
    match: (pathname) => pathname === '/viec-lam' || pathname.startsWith('/viec-lam/'),
  },
  {
    to: '/bat-dong-san',
    label: 'Bất động sản',
    icon: Building2,
    match: (pathname) =>
      pathname === '/bat-dong-san' ||
      pathname.startsWith('/bat-dong-san/') ||
      pathname === '/nha-dat' ||
      pathname.startsWith('/nha-dat/'),
  },
  {
    to: '/tin-tuc',
    label: 'Tin tức',
    icon: Newspaper,
    match: (pathname) => pathname === '/tin-tuc' || pathname.startsWith('/tin-tuc/'),
  },
  {
    to: '/tai-khoan',
    label: 'Tài khoản',
    icon: UserRound,
    match: (pathname) => pathname === '/tai-khoan' || pathname.startsWith('/tai-khoan/'),
  },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';

  return (
    <nav className="mobile-bottom-nav" aria-label="Điều hướng chính trên điện thoại">
      <div className="mobile-bottom-nav__inner">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`mobile-bottom-nav__item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="mobile-bottom-nav__icon" aria-hidden="true">
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
