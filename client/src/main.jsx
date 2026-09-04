import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { initializeSiteTheme } from './theme/siteTheme';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/global.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/responsive.css';
import './styles/editorial-polish.css';
import './styles/focus-area-copy.css';
import './styles/mobile-ui-polish.css';
import './styles/header-stability-v2.css';
import './styles/header-modern-v3.css';
import './components/layout/SiteFooter.css';
import './components/layout/SiteFooter.mobile.css';
import './pages/public/JobsPage.mobile.css';
import './pages/public/JobDetailPage.mobile.css';
import './pages/public/PropertyDetailPage.mobile.css';
import './pages/auth/AuthMobile.css';
import './pages/auth/AuthBranding.css';
import './components/content/CommunityThreadsFeed.css';
import './styles/brand-logo-v3.css';
import './styles/brand-theme.css';
import './styles/brand-force.css';
import './styles/brand-accent.css';
import './styles/theme-modes.css';
import './pages/public/HomeReferenceLayout.css';
import './styles/typography.css';
import './pages/public/HomeReferenceLayout.fix.css';
import './pages/public/CommunityPageReferenceV2.css';
import './features/propertySubmitReviewGuard';

// Apply the saved appearance before React paints so reloads do not flash the
// wrong theme. The default remains the light reference palette.
initializeSiteTheme();

const root = createRoot(document.getElementById('root'));
const enableStrictMode = import.meta.env.VITE_REACT_STRICT_MODE === 'true';

// React StrictMode cố ý mount/effect hai lần ở development. Với ứng dụng có
// nhiều feed/API toàn cục điều này làm localhost tạo request đôi và cảm giác
// lag rõ rệt. Mặc định chạy một lifecycle thật; vẫn có thể bật lại khi audit
// side-effect bằng VITE_REACT_STRICT_MODE=true.
root.render(
  enableStrictMode ? (
    <StrictMode>
      <App />
    </StrictMode>
  ) : (
    <App />
  ),
);
