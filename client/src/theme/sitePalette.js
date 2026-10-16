const STORAGE_KEY = 'dthl-site-palette-v1';
const PALETTE_EVENT = 'dthl:palette-change';
const FIXED_PALETTE = 'earth';

export const SITE_PALETTES = [
  {
    id: 'earth',
    label: 'DTHL',
    description: 'Hệ màu cố định của DTHL: xanh #0D3B2A, đỏ logo #B43B32 trên nền trắng trung tính.',
    swatches: ['#0D3B2A', '#B43B32', '#FAFBFA'],
  },
];

function syncThemeColor() {
  if (typeof document === 'undefined') return;

  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }

  meta.setAttribute(
    'content',
    document.documentElement.dataset.dthlTheme === 'dark'
      ? '#0D3B2A'
      : '#FAFBFA',
  );
}

export function readSitePalette() {
  return FIXED_PALETTE;
}

export function applySitePalette() {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.dthlPalette = FIXED_PALETTE;
    syncThemeColor();
  }

  return FIXED_PALETTE;
}

export function initializeSitePalette() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The fixed palette still applies when storage is blocked.
    }
  }

  return applySitePalette();
}

// Compatibility no-ops for lazy chunks compiled against the older palette API.
export function setSitePalette() {
  return applySitePalette();
}

export function subscribeSitePalette(listener) {
  if (typeof window === 'undefined') return () => {};

  const handlePaletteChange = () => {
    listener(FIXED_PALETTE);
  };

  window.addEventListener(PALETTE_EVENT, handlePaletteChange);

  return () => {
    window.removeEventListener(PALETTE_EVENT, handlePaletteChange);
  };
}
