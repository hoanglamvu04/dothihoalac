import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  House,
  Newspaper,
  UserRound,
  UsersRound,
} from 'lucide-react';

import './MobileBottomNav.css';

const ITEMS = [
  {
    to: '/',
    label: 'Trang chủ',
    icon: House,
    match: (pathname) => pathname === '/',
    prefetch: () => import('../../pages/public/HomePage'),
  },
  {
    to: '/tin-tuc',
    label: 'Tin tức',
    icon: Newspaper,
    match: (pathname) => pathname === '/tin-tuc' || pathname.startsWith('/tin-tuc/'),
    prefetch: () => import('../../pages/public/ArticlesPage'),
  },
  {
    to: '/tim-kiem',
    label: 'Khám phá',
    icon: Compass,
    featured: true,
    match: (pathname) => pathname === '/tim-kiem' || pathname.startsWith('/tim-kiem/'),
  },
  {
    to: '/cong-dong',
    label: 'Cộng đồng',
    icon: UsersRound,
    match: (pathname) => pathname === '/cong-dong' || pathname.startsWith('/cong-dong/'),
    prefetch: () => import('../../pages/public/CommunityPage'),
  },
  {
    to: '/tai-khoan',
    label: 'Tài khoản',
    icon: UserRound,
    match: (pathname) => pathname === '/tai-khoan' || pathname.startsWith('/tai-khoan/'),
    prefetch: () => import('../../pages/account/AccountOverviewPage'),
  },
];

function warmItem(item) {
  if (!item?.prefetch) return;
  void item.prefetch().catch(() => {});
}

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
              className={[
                'mobile-bottom-nav__item',
                active ? 'is-active' : '',
                item.featured ? 'is-featured' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={active ? 'page' : undefined}
              onPointerEnter={() => warmItem(item)}
              onTouchStart={() => warmItem(item)}
              onFocus={() => warmItem(item)}
            >
              <span className="mobile-bottom-nav__icon" aria-hidden="true">
                <Icon
                  size={item.featured ? 25 : 21}
                  strokeWidth={active || item.featured ? 2.35 : 2}
                />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
