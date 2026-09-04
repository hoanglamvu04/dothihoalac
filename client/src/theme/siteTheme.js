const STORAGE_KEY = 'dthl-site-theme-v1';
const THEME_EVENT = 'dthl:theme-change';
const SUPPORTED_THEMES = new Set(['light', 'dark']);

function normalizeTheme(value) {
  return SUPPORTED_THEMES.has(value) ? value : 'light';
}

export function readSiteTheme() {
  if (typeof window === 'undefined') return 'light';

  const fromDocument = document.documentElement.dataset.dthlTheme;
  if (SUPPORTED_THEMES.has(fromDocument)) return fromDocument;

  try {
    return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'light';
  }
}

function syncThemeMeta(theme) {
  if (typeof document === 'undefined') return;

  const themeColor = theme === 'dark' ? '#07111a' : '#fbfaf7';
  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', themeColor);
}

export function applySiteTheme(value, { persist = false, notify = false } = {}) {
  const theme = normalizeTheme(value);

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.dthlTheme = theme;
    document.documentElement.style.colorScheme = theme;
    syncThemeMeta(theme);
  }

  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private/restricted browsing can block localStorage. Theme still works
      // for the active session through the document data attribute.
    }
  }

  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }));
  }

  return theme;
}

export function initializeSiteTheme() {
  let storedTheme = 'light';

  if (typeof window !== 'undefined') {
    try {
      storedTheme = normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      storedTheme = 'light';
    }
  }

  return applySiteTheme(storedTheme);
}

export function setSiteTheme(theme) {
  return applySiteTheme(theme, { persist: true, notify: true });
}

export function subscribeSiteTheme(listener) {
  if (typeof window === 'undefined') return () => {};

  const handleThemeChange = (event) => {
    listener(normalizeTheme(event?.detail?.theme));
  };

  const handleStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    const theme = applySiteTheme(event.newValue);
    listener(theme);
  };

  window.addEventListener(THEME_EVENT, handleThemeChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(THEME_EVENT, handleThemeChange);
    window.removeEventListener('storage', handleStorage);
  };
}
