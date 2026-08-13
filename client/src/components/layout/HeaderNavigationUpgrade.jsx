import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Link,
  useLocation,
} from 'react-router-dom';

import './HeaderNavigationUpgrade.css';

const navigationItems = [
  {
    to: '/',
    label: 'Trang chủ',
    match: 'home',
  },
  {
    to: '/tin-tuc',
    label: 'Tin tức',
    match: 'news',
  },
  {
    to: '/tin-tuc?category=quy-hoach',
    label: 'Quy hoạch',
    category: 'quy-hoach',
  },
  {
    to: '/tin-tuc?category=ha-tang-giao-thong',
    label: 'Hạ tầng',
    category: 'ha-tang-giao-thong',
  },
  {
    to: '/tin-tuc?category=du-an-dtxd',
    label: 'Dự án ĐTXD',
    category: 'du-an-dtxd',
  },
  {
    to: '/tin-tuc?category=bat-dong-san',
    label: 'BĐS',
    category: 'bat-dong-san',
  },
  {
    to: '/cong-dong',
    label: 'Cộng đồng',
    match: 'community',
  },
  {
    to: '/nha-dat',
    label: 'Nhà đất',
    match: 'property',
  },
  {
    to: '/viec-lam',
    label: 'Việc làm',
    match: 'job',
  },
];

const HEADER_CATEGORY_SLUGS = new Set(
  navigationItems
    .map((item) => item.category)
    .filter(Boolean),
);

function usePortalTarget(selector) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let frame = null;

    const resolveTarget = () => {
      const nextTarget = document.querySelector(selector);

      if (nextTarget) {
        setTarget(nextTarget);
        return true;
      }

      return false;
    };

    if (resolveTarget()) {
      return undefined;
    }

    const observer = new MutationObserver(() => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        resolveTarget();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [selector]);

  return target;
}

function isItemActive(item, pathname, searchParams) {
  const selectedCategory = searchParams.get('category');

  if (item.match === 'home') {
    return pathname === '/';
  }

  if (item.category) {
    return (
      pathname === '/tin-tuc' &&
      selectedCategory === item.category
    );
  }

  if (item.match === 'news') {
    return (
      pathname.startsWith('/tin-tuc') &&
      !HEADER_CATEGORY_SLUGS.has(selectedCategory)
    );
  }

  if (item.match === 'community') {
    return pathname.startsWith('/cong-dong');
  }

  if (item.match === 'property') {
    return pathname.startsWith('/nha-dat');
  }

  if (item.match === 'job') {
    return pathname.startsWith('/viec-lam');
  }

  return false;
}

function NavigationLinks({ mobile = false }) {
  const location = useLocation();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  return navigationItems.map((item) => {
    const active = isItemActive(
      item,
      location.pathname,
      searchParams,
    );

    return (
      <Link
        key={item.to}
        to={item.to}
        className={[
          mobile
            ? 'dthl-mobile-nav-upgrade__link'
            : 'dthl-header-nav-upgrade__link',
          active ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {item.label}
      </Link>
    );
  });
}

export default function HeaderNavigationUpgrade() {
  const desktopTarget = usePortalTarget(
    '.dthl-header-nav__inner',
  );

  const mobileTarget = usePortalTarget(
    '.dthl-mobile-nav__links',
  );

  return (
    <>
      {desktopTarget
        ? createPortal(
            <nav
              className="dthl-header-nav-upgrade"
              aria-label="Điều hướng nội dung chính"
            >
              <NavigationLinks />
            </nav>,
            desktopTarget,
          )
        : null}

      {mobileTarget
        ? createPortal(
            <div className="dthl-mobile-nav-upgrade">
              <NavigationLinks mobile />
            </div>,
            mobileTarget,
          )
        : null}
    </>
  );
}
