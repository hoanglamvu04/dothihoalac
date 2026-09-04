const STORAGE_KEY = 'dthl-site-palette-v1';
const PALETTE_EVENT = 'dthl:palette-change';

export const SITE_PALETTES = [
  {
    id: 'earth',
    label: 'Nâu đất',
    description: 'Nâu đất, kem và nâu trầm đồng bộ, không pha xanh thương hiệu cũ.',
    swatches: ['#B59965', '#4A3D2C', '#FFFDF9'],
  },
  {
    id: 'green',
    label: 'Xanh truyền thống',
    description: 'Phong cách xanh Hòa Lạc truyền thống, đồng bộ toàn bộ accent và CTA.',
    swatches: ['#1F8A4C', '#0B5A3B', '#F2F8F4'],
  },
  {
    id: 'white',
    label: 'Trắng tối giản',
    description: 'Nền trắng tinh, tương phản nhẹ và gần phong cách editorial.',
    swatches: ['#FFFFFF', '#202522', '#F1F3F2'],
  },
  {
    id: 'stone',
    label: 'Xám đá',
    description: 'Trung tính, cao cấp, dịu mắt và hợp nội dung nhiều hình ảnh.',
    swatches: ['#857568', '#4A4038', '#F1EFEC'],
  },
  {
    id: 'mist',
    label: 'Lam sương',
    description: 'Xanh lam xám nhẹ cho cảm giác công nghệ và đô thị.',
    swatches: ['#4B7891', '#2F586F', '#EEF4F7'],
  },
];

const SUPPORTED_PALETTES = new Set(SITE_PALETTES.map((item) => item.id));

function normalizePalette(value) {
  return SUPPORTED_PALETTES.has(value) ? value : 'earth';
}

function syncThemeColor(palette) {
  if (typeof document === 'undefined') return;

  const lightColors = {
    earth: '#ffffff',
    green: '#f7faf8',
    white: '#ffffff',
    stone: '#f5f4f2',
    mist: '#f5f8fa',
  };

  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }

  if (document.documentElement.dataset.dthlTheme !== 'dark') {
    meta.setAttribute('content', lightColors[palette] || '#ffffff');
  }
}

export function readSitePalette() {
  if (typeof window === 'undefined') return 'earth';

  const fromDocument = document.documentElement.dataset.dthlPalette;
  if (SUPPORTED_PALETTES.has(fromDocument)) return fromDocument;

  try {
    return normalizePalette(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'earth';
  }
}

export function applySitePalette(value, { persist = false, notify = false } = {}) {
  const palette = normalizePalette(value);

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.dthlPalette = palette;
    syncThemeColor(palette);
  }

  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, palette);
    } catch {
      // Palette still applies to the active session when storage is blocked.
    }
  }

  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: { palette } }));
  }

  return palette;
}

export function initializeSitePalette() {
  let storedPalette = 'earth';

  if (typeof window !== 'undefined') {
    try {
      storedPalette = normalizePalette(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      storedPalette = 'earth';
    }
  }

  return applySitePalette(storedPalette);
}

export function setSitePalette(palette) {
  return applySitePalette(palette, { persist: true, notify: true });
}

export function subscribeSitePalette(listener) {
  if (typeof window === 'undefined') return () => {};

  const handlePaletteChange = (event) => {
    listener(normalizePalette(event?.detail?.palette));
  };

  const handleStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    const palette = applySitePalette(event.newValue);
    listener(palette);
  };

  window.addEventListener(PALETTE_EVENT, handlePaletteChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(PALETTE_EVENT, handlePaletteChange);
    window.removeEventListener('storage', handleStorage);
  };
}
