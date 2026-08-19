import { lazy, Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import HeaderNavigationUpgrade from './HeaderNavigationUpgrade';
import DeferredSiteFooter from './DeferredSiteFooter';
import DeferredCommunityQuickComposer from '../community/DeferredCommunityQuickComposer';
import AdSlot from '../ads/AdSlot';

import './PublicInteractionFixes.css';

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

export default function PublicLayout() {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const showCommunityAds = normalizedPath === '/cong-dong';
  const topSlot = pageTopAdSlot(normalizedPath);

  useEffect(() => {
    void loadRouteStyles(normalizedPath).catch(() => {});
  }, [normalizedPath]);

  return (
    <div className="app-shell">
      <SiteHeader />
      <HeaderNavigationUpgrade />

      <AdSlot slotKey="site_below_header" layout="strip" deferMs={450} />
      {topSlot ? <AdSlot slotKey={topSlot} layout="strip" deferMs={650} /> : null}

      <main className={`main-content${showCommunityAds ? ' main-content--community' : ''}`}>
        {showCommunityAds ? (
          <Suspense fallback={null}>
            <CommunityAdRails />
          </Suspense>
        ) : null}
        <Outlet />
      </main>

      <AdSlot slotKey="site_before_footer" layout="strip" />
      <DeferredSiteFooter />
      <DeferredCommunityQuickComposer />
    </div>
  );
}
