import { Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import HeaderNavigationUpgrade from './HeaderNavigationUpgrade';
import SiteFooter from './SiteFooter';
import CommunityQuickComposer from '../community/CommunityQuickComposer';

export default function PublicLayout() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <HeaderNavigationUpgrade />
      <main className="main-content"><Outlet /></main>
      <SiteFooter />
      <CommunityQuickComposer />
    </div>
  );
}
