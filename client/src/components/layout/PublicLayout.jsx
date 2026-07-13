import { Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

export default function PublicLayout() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="main-content"><Outlet /></main>
      <SiteFooter />
    </div>
  );
}
