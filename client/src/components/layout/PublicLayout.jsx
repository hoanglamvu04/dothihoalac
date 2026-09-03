import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import DeferredSiteFooter from './DeferredSiteFooter';
import MobileBottomNav from './MobileBottomNav';
import DeferredCommunityQuickComposer from '../community/DeferredCommunityQuickComposer';
import AdSlot from '../ads/AdSlot';

import './PublicInteractionFixes.css';

const PrimaryNavigation = lazy(() => import('./PrimaryNavigation'));
const CommunityAdRails = lazy(() => import('../community/CommunityAdRails'));

function pageTopAdSlot(pathname) {
  if (pathname === '/tin-tuc') return 'news_top';
  if (pathname.startsWith('/tin-tuc/')) return 'article_top';
  if (pathname === '/cong-dong') return 'community_top';
  if (
    pathname === '/bat-dong-san' ||
    pathname.startsWith('/bat-dong-san/') ||
    pathname === '/nha-dat' ||
    pathname.startsWith('/nha-dat/')
  ) return 'property_top';
  if (pathname === '/viec-lam' || pathname.startsWith('/viec-lam/')) return 'jobs_top';
  if (pathname === '/tim-kiem') return 'search_top';
  return '';
}

function loadRouteStyles(pathname) {
  if (pathname.startsWith('/tin-tuc')) {
    return Promise.all([
      import('../../styles/newsroom-mobile-v2.css'),
      import('../../styles/articles-modern-v2.css'),
      import('../../styles/articles-newsroom-v3.css'),
      import('../../styles/articles-newsroom-v4.css'),
      import('../../styles/news-project-tracker-rail.css'),
    ]);
  }

  if (pathname.startsWith('/cong-dong')) {
    return Promise.all([
      import('../../styles/community-social-v2.css'),
      import('../../styles/community-social-v3.css'),
      import('../../styles/community-interaction-v4.css'),
    ]);
  }

  if (pathname.startsWith('/viec-lam/')) {
    return import('../../styles/job-detail-readable-v2.css');
  }

  return Promise.resolve();
}

function isAuthenticationPath(pathname) {
  const authPrefixes = [
    '/dang-nhap',
    '/dang-ky',
    '/quen-mat-khau',
    '/dat-lai-mat-khau',
    '/xac-thuc-email',
    '/xac-thuc-so-dien-thoai',
  ];

  return authPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function showMobileBottomNavigation(pathname) {
  const hiddenPrefixes = [
    '/cong-dong/create',
    '/studio',
    '/dang-bai',
    '/gui-tin',
    '/dang-nhap',
    '/dang-ky',
    '/quen-mat-khau',
    '/dat-lai-mat-khau',
    '/xac-thuc-email',
    '/xac-thuc-so-dien-thoai',
  ];

  return !hiddenPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function DeferredHeaderNavigation() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idleId = null;
    let delayId = window.setTimeout(() => {
      delayId = null;

      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(
          () => setReady(true),
          { timeout: 700 },
        );
      } else {
        setReady(true);
      }
    }, 350);

    return () => {
      if (delayId) window.clearTimeout(delayId);
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  if (!ready) {
    return <div aria-hidden="true" style={{ minHeight: 42 }} />;
  }

  return (
    <Suspense fallback={<div aria-hidden="true" style={{ minHeight: 42 }} />}>
      <PrimaryNavigation />
    </Suspense>
  );
}

export default function PublicLayout() {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const showCommunityAds = normalizedPath === '/cong-dong';
  const showBottomNav = showMobileBottomNavigation(normalizedPath);
  const authRoute = isAuthenticationPath(normalizedPath);
  const topSlot = pageTopAdSlot(normalizedPath);

  useEffect(() => {
    void loadRouteStyles(normalizedPath).catch(() => {});
  }, [normalizedPath]);

  return (
    <div
      className={[
        'app-shell',
        showBottomNav ? 'app-shell--with-mobile-bottom-nav' : '',
        authRoute ? 'app-shell--auth-route' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!authRoute ? (
        <>
          <SiteHeader />
          <DeferredHeaderNavigation />
          <AdSlot slotKey="site_below_header" layout="strip" deferMs={450} />
          {topSlot ? <AdSlot slotKey={topSlot} layout="strip" deferMs={650} /> : null}
        </>
      ) : null}

      <main className={`main-content${showCommunityAds ? ' main-content--community' : ''}`}>
        {showCommunityAds ? (
          <Suspense fallback={null}>
            <CommunityAdRails />
          </Suspense>
        ) : null}
        <Outlet />
      </main>

      {!authRoute ? (
        <>
          <AdSlot slotKey="site_before_footer" layout="strip" />
          <DeferredSiteFooter />
          {showBottomNav ? <MobileBottomNav /> : null}
          <DeferredCommunityQuickComposer />
        </>
      ) : null}
    </div>
  );
}
