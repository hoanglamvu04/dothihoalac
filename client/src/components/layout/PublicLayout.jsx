import { lazy, Suspense } from 'react';
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

export default function PublicLayout() {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const showCommunityAds = normalizedPath === '/cong-dong';
  const topSlot = pageTopAdSlot(normalizedPath);

  return (
    <div className="app-shell">
      <SiteHeader />
      <HeaderNavigationUpgrade />

      <AdSlot slotKey="site_below_header" layout="strip" />
      {topSlot ? <AdSlot slotKey={topSlot} layout="strip" /> : null}

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
