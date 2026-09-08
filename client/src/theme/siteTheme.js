const STORAGE_KEY = 'dthl-site-theme-v1';
const THEME_EVENT = 'dthl:theme-change';

// The public site now uses one fixed visual mode. Keep the small compatibility
// API so existing callers remain safe, but every request resolves to light.
const SUPPORTED_THEMES = new Set(['light']);

function normalizeTheme(value) {
  return SUPPORTED_THEMES.has(value) ? value : 'light';
}

export function readSiteTheme() {
  if (typeof window === 'undefined') return 'light';

  const fromDocument = document.documentElement.dataset.dthlTheme;
  if (SUPPORTED_THEMES.has(fromDocument)) return fromDocument;

  return 'light';
}

function syncThemeMeta() {
  if (typeof document === 'undefined') return;

  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', '#fbfaf7');
}

export function applySiteTheme(value, { persist = false, notify = false } = {}) {
  const theme = normalizeTheme(value);

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.dthlTheme = theme;
    document.documentElement.style.colorScheme = 'light';
    syncThemeMeta();
  }

  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private/restricted browsing can block localStorage. The fixed light
      // mode still applies through the document data attribute.
    }
  }

  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }));
  }

  return theme;
}

export function initializeSiteTheme() {
  if (typeof window !== 'undefined') {
    try {
      // Clear any old dark-mode choice left by previous releases.
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore restricted storage; the document is still forced to light.
    }
  }

  return applySiteTheme('light');
}

export function setSiteTheme() {
  return applySiteTheme('light', { persist: true, notify: true });
}

export function subscribeSiteTheme(listener) {
  if (typeof window === 'undefined') return () => {};

  const handleThemeChange = () => {
    listener('light');
  };

  const handleStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    applySiteTheme('light');
    listener('light');
  };

  window.addEventListener(THEME_EVENT, handleThemeChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(THEME_EVENT, handleThemeChange);
    window.removeEventListener('storage', handleStorage);
  };
}
