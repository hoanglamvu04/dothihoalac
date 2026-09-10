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

function loadRouteEnhancements(pathname) {
  if (pathname.startsWith('/tin-tuc')) {
    const modules = [
      import('../../styles/newsroom-mobile-v2.css'),
      import('../../styles/articles-modern-v2.css'),
      import('../../styles/articles-newsroom-v3.css'),
      import('../../styles/articles-newsroom-v4.css'),
      import('../../styles/news-project-tracker-rail.css'),
    ];

    modules.push(
      pathname === '/tin-tuc'
        ? import('../../styles/news-listing-readable-polish.css')
        : import('../../pages/public/ArticleDetailReadablePolish.css'),
    );

    return Promise.all(modules);
  }

  if (pathname.startsWith('/cong-dong')) {
    const modules = [
      import('../../styles/community-social-v2.css'),
      import('../../styles/community-social-v3.css'),
      import('../../styles/community-interaction-v4.css'),
    ];

    if (pathname === '/cong-dong') {
      modules.push(
        import('../../styles/community-listing-readable-polish.css'),
        import('../../features/communityRailDisclosure'),
      );
    }

    return Promise.all(modules);
  }

  if (pathname === '/viec-lam') {
    return import('../../styles/jobs-listing-readable-polish.css');
  }

  if (pathname.startsWith('/viec-lam/')) {
    return Promise.all([
      import('../../styles/job-detail-readable-polish.css'),
      import('../../styles/job-detail-readable-v2.css'),
    ]);
  }

  if (pathname === '/bat-dong-san' || pathname === '/nha-dat') {
    return import('../../styles/property-listing-readable-polish.css');
  }

  if (pathname.startsWith('/bat-dong-san/') || pathname.startsWith('/nha-dat/')) {
    return import('../../styles/property-detail-readable-polish.css');
  }

  if (pathname.startsWith('/studio/bat-dong-san')) {
    return import('../../features/propertySubmitReviewGuard');
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
    void loadRouteEnhancements(normalizedPath).catch(() => {});
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
