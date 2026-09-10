const STORAGE_KEY = 'dthl-site-palette-v1';
const PALETTE_EVENT = 'dthl:palette-change';
const FIXED_PALETTE = 'earth';

export const SITE_PALETTES = [
  {
    id: 'earth',
    label: 'Nâu đất',
    description: 'Nâu đất làm màu nhận diện trên nền trắng xanh rất nhạt, sạch và thoáng.',
    swatches: ['#B59965', '#4A3D2C', '#F7FAF8'],
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

  if (document.documentElement.dataset.dthlTheme !== 'dark') {
    meta.setAttribute('content', '#f7faf8');
  }
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

// Kept as compatibility no-ops for any lazy chunk compiled against the older
// palette API. The product now intentionally uses one fixed brand palette.
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
