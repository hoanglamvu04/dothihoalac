import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import HeaderNavigationUpgrade from './HeaderNavigationUpgrade';
import SiteFooter from './SiteFooter';
import CommunityQuickComposer from '../community/CommunityQuickComposer';
import CommunityAdRails from '../community/CommunityAdRails';
import AdSlot from '../ads/AdSlot';

export default function PublicLayout() {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const showCommunityAds = normalizedPath === '/cong-dong';

  return (
    <div className="app-shell">
      <SiteHeader />
      <HeaderNavigationUpgrade />
      <AdSlot slotKey="site_below_header" layout="strip" />
      <main className={`main-content${showCommunityAds ? ' main-content--community' : ''}`}>
        {showCommunityAds ? <CommunityAdRails /> : null}
        <Outlet />
      </main>
      <SiteFooter />
      <CommunityQuickComposer />
    </div>
  );
}
