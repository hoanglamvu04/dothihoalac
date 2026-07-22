import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function isAccountRoute(pathname) {
  return pathname === '/tai-khoan' || pathname.startsWith('/tai-khoan/');
}

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const previousPathRef = useRef(pathname);

  useLayoutEffect(() => {
    const previousPath = previousPathRef.current;
    const movingInsideAccount =
      isAccountRoute(previousPath) && isAccountRoute(pathname);

    if (!movingInsideAccount) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      });
    }

    previousPathRef.current = pathname;
  }, [pathname]);

  return null;
}
