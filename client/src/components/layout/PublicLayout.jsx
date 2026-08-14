import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import HeaderNavigationUpgrade from './HeaderNavigationUpgrade';
import SiteFooter from './SiteFooter';
import CommunityQuickComposer from '../community/CommunityQuickComposer';
import CommunityAdRails from '../community/CommunityAdRails';
import AdSlot from '../ads/AdSlot';

function pageTopAdSlot(pathname) {
  if (pathname === '/tin-tuc') return 'news_top';
  if (pathname.startsWith('/tin-tuc/')) return 'article_top';
  if (pathname === '/cong-dong') return 'community_top';
  if (pathname === '/nha-dat' || pathname.startsWith('/nha-dat/')) return 'property_top';
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
        {showCommunityAds ? <CommunityAdRails /> : null}
        <Outlet />
      </main>

      <AdSlot slotKey="site_before_footer" layout="strip" />
      <SiteFooter />
      <CommunityQuickComposer />
    </div>
  );
}
