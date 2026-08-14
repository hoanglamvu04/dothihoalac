import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import HeaderNavigationUpgrade from './HeaderNavigationUpgrade';
import SiteFooter from './SiteFooter';
import CommunityQuickComposer from '../community/CommunityQuickComposer';
import CommunitySideRails from '../community/CommunitySideRails';

export default function PublicLayout() {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const showCommunityRails = normalizedPath === '/cong-dong';

  return (
    <div className="app-shell">
      <SiteHeader />
      <HeaderNavigationUpgrade />
      <main className={`main-content${showCommunityRails ? ' main-content--community' : ''}`}>
        {showCommunityRails ? <CommunitySideRails /> : null}
        <Outlet />
      </main>
      <SiteFooter />
      <CommunityQuickComposer />
    </div>
  );
}
