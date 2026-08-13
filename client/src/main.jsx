import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/global.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/admin.css';
import './styles/responsive.css';
import './styles/editorial-polish.css';
import './styles/focus-area-copy.css';
import './styles/mobile-ui-polish.css';
import './styles/newsroom-mobile-v2.css';
import './styles/articles-modern-v2.css';
import './styles/articles-newsroom-v3.css';
import './styles/articles-newsroom-v4.css';
import './styles/header-stability-v2.css';
import './styles/brand-logo-v3.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
