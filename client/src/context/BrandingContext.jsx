import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { systemApi } from '../api/system.api';

const DEFAULT_BRANDING = {
  version: 1,
  siteName: 'Đô Thị Hòa Lạc',
  tagline: 'Trung tâm phát triển đô thị Hòa Lạc',
  assets: [
    {
      id: 'builtin-mark',
      name: 'Logo biểu tượng',
      url: '/Logo.png',
      altText: 'Đô Thị Hòa Lạc',
      source: 'builtin',
    },
    {
      id: 'builtin-header',
      name: 'Logo ngang Header',
      url: '/Logo dothihoalac-09.png',
      altText: 'Đô Thị Hòa Lạc',
      source: 'builtin',
    },
    {
      id: 'builtin-footer',
      name: 'Logo ngang Footer',
      url: '/Logo dothihoalac-10.png',
      altText: 'Đô Thị Hòa Lạc',
      source: 'builtin',
    },
  ],
  assignments: {
    markLogoId: 'builtin-mark',
    headerLogoId: 'builtin-header',
    footerLogoId: 'builtin-footer',
    faviconLogoId: 'builtin-mark',
  },
  sizes: {
    header: {
      desktopWidth: 242,
      desktopHeight: 52,
      tabletWidth: 205,
      tabletHeight: 44,
      mobileWidth: 170,
      mobileHeight: 37,
      smallMobileWidth: 152,
      smallMobileHeight: 33,
    },
    footer: {
      desktopWidth: 240,
      desktopHeight: 48,
      tabletWidth: 230,
      tabletHeight: 46,
      mobileWidth: 200,
      mobileHeight: 42,
    },
  },
};

const BrandingContext = createContext(null);

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBranding(value = {}) {
  const incomingAssets = Array.isArray(value?.assets) ? value.assets : [];
  const assetMap = new Map();

  for (const asset of [...DEFAULT_BRANDING.assets, ...incomingAssets]) {
    if (!asset?.id || !asset?.url) continue;
    assetMap.set(String(asset.id), asset);
  }

  const assets = Array.from(assetMap.values());
  const ids = new Set(assets.map((asset) => String(asset.id)));
  const assignments = value?.assignments || {};
  const header = value?.sizes?.header || {};
  const footer = value?.sizes?.footer || {};
  const choose = (candidate, fallback) =>
    ids.has(String(candidate || '')) ? String(candidate) : fallback;

  return {
    ...DEFAULT_BRANDING,
    ...value,
    assets,
    assignments: {
      markLogoId: choose(assignments.markLogoId, 'builtin-mark'),
      headerLogoId: choose(assignments.headerLogoId, 'builtin-header'),
      footerLogoId: choose(assignments.footerLogoId, 'builtin-footer'),
      faviconLogoId: choose(assignments.faviconLogoId, 'builtin-mark'),
    },
    sizes: {
      header: {
        desktopWidth: numberOr(header.desktopWidth, 242),
        desktopHeight: numberOr(header.desktopHeight, 52),
        tabletWidth: numberOr(header.tabletWidth, 205),
        tabletHeight: numberOr(header.tabletHeight, 44),
        mobileWidth: numberOr(header.mobileWidth, 170),
        mobileHeight: numberOr(header.mobileHeight, 37),
        smallMobileWidth: numberOr(header.smallMobileWidth, 152),
        smallMobileHeight: numberOr(header.smallMobileHeight, 33),
      },
      footer: {
        desktopWidth: numberOr(footer.desktopWidth, 240),
        desktopHeight: numberOr(footer.desktopHeight, 48),
        tabletWidth: numberOr(footer.tabletWidth, 230),
        tabletHeight: numberOr(footer.tabletHeight, 46),
        mobileWidth: numberOr(footer.mobileWidth, 200),
        mobileHeight: numberOr(footer.mobileHeight, 42),
      },
    },
  };
}

function ensureHeadLink(rel) {
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement('link');
    node.rel = rel;
    document.head.appendChild(node);
  }
  return node;
}

function cssUrl(url) {
  return `url("${String(url || '').replace(/["\\\n\r]/g, '')}")`;
}

function applyRuntimeBranding(branding, resolved) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const header = branding.sizes.header;
  const footer = branding.sizes.footer;

  root.style.setProperty('--dthl-brand-logo-image', cssUrl(resolved.mark.url));
  root.style.setProperty('--dthl-public-header-logo', cssUrl(resolved.header.url));
  root.style.setProperty('--dthl-public-footer-logo', cssUrl(resolved.footer.url));

  const sizeVariables = {
    '--dthl-brand-header-desktop-width': header.desktopWidth,
    '--dthl-brand-header-desktop-height': header.desktopHeight,
    '--dthl-brand-header-tablet-width': header.tabletWidth,
    '--dthl-brand-header-tablet-height': header.tabletHeight,
    '--dthl-brand-header-mobile-width': header.mobileWidth,
    '--dthl-brand-header-mobile-height': header.mobileHeight,
    '--dthl-brand-header-small-width': header.smallMobileWidth,
    '--dthl-brand-header-small-height': header.smallMobileHeight,
    '--dthl-brand-footer-desktop-width': footer.desktopWidth,
    '--dthl-brand-footer-desktop-height': footer.desktopHeight,
    '--dthl-brand-footer-tablet-width': footer.tabletWidth,
    '--dthl-brand-footer-tablet-height': footer.tabletHeight,
    '--dthl-brand-footer-mobile-width': footer.mobileWidth,
    '--dthl-brand-footer-mobile-height': footer.mobileHeight,
  };

  Object.entries(sizeVariables).forEach(([key, value]) => {
    root.style.setProperty(key, `${value}px`);
  });

  let runtimeStyle = document.getElementById('dthl-brand-runtime-style');
  if (!runtimeStyle) {
    runtimeStyle = document.createElement('style');
    runtimeStyle.id = 'dthl-brand-runtime-style';
    document.head.appendChild(runtimeStyle);
  }

  runtimeStyle.textContent = `
    .dthl-brand__mark,
    .dthl-header.is-compact .dthl-brand__mark {
      flex-basis: var(--dthl-brand-header-desktop-width) !important;
      width: var(--dthl-brand-header-desktop-width) !important;
      height: var(--dthl-brand-header-desktop-height) !important;
    }

    .site-footer .site-footer__logo {
      width: min(100%, var(--dthl-brand-footer-desktop-width)) !important;
      height: var(--dthl-brand-footer-desktop-height) !important;
    }

    @media (max-width: 1320px) {
      .site-footer .site-footer__logo {
        width: min(100%, var(--dthl-brand-footer-tablet-width)) !important;
        height: var(--dthl-brand-footer-tablet-height) !important;
      }
    }

    @media (max-width: 1020px) {
      .dthl-brand__mark,
      .dthl-header.is-compact .dthl-brand__mark {
        flex-basis: var(--dthl-brand-header-tablet-width) !important;
        width: var(--dthl-brand-header-tablet-width) !important;
        height: var(--dthl-brand-header-tablet-height) !important;
      }
    }

    @media (max-width: 560px) {
      .dthl-brand__mark,
      .dthl-header.is-compact .dthl-brand__mark {
        flex-basis: var(--dthl-brand-header-mobile-width) !important;
        width: var(--dthl-brand-header-mobile-width) !important;
        height: var(--dthl-brand-header-mobile-height) !important;
      }

      .site-footer .site-footer__logo {
        width: min(100%, var(--dthl-brand-footer-mobile-width)) !important;
        height: var(--dthl-brand-footer-mobile-height) !important;
      }
    }

    @media (max-width: 390px) {
      .dthl-brand__mark,
      .dthl-header.is-compact .dthl-brand__mark {
        flex-basis: var(--dthl-brand-header-small-width) !important;
        width: var(--dthl-brand-header-small-width) !important;
        height: var(--dthl-brand-header-small-height) !important;
      }
    }
  `;

  const favicon = ensureHeadLink('icon');
  favicon.type = 'image/png';
  favicon.href = resolved.favicon.url;

  const appleTouch = ensureHeadLink('apple-touch-icon');
  appleTouch.href = resolved.favicon.url;
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  const refreshBranding = useCallback(async () => {
    try {
      const result = await systemApi.branding();
      setBranding(normalizeBranding(result || DEFAULT_BRANDING));
    } catch {
      setBranding((current) => normalizeBranding(current));
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const resolved = useMemo(() => {
    const map = new Map(
      branding.assets.map((asset) => [String(asset.id), asset]),
    );
    const pick = (id, fallbackId) =>
      map.get(String(id)) || map.get(fallbackId) || DEFAULT_BRANDING.assets[0];

    return {
      mark: pick(branding.assignments.markLogoId, 'builtin-mark'),
      header: pick(branding.assignments.headerLogoId, 'builtin-header'),
      footer: pick(branding.assignments.footerLogoId, 'builtin-footer'),
      favicon: pick(branding.assignments.faviconLogoId, 'builtin-mark'),
    };
  }, [branding]);

  useEffect(() => {
    applyRuntimeBranding(branding, resolved);
  }, [branding, resolved]);

  const value = useMemo(
    () => ({
      branding,
      resolved,
      refreshBranding,
    }),
    [branding, resolved, refreshBranding],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used inside BrandingProvider.');
  }
  return context;
}
