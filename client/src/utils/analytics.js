const measurementId = String(
  import.meta.env.VITE_GA_MEASUREMENT_ID || '',
).trim();

let initialized = false;

function enabled() {
  return Boolean(measurementId);
}

export function initializeAnalytics() {
  if (
    initialized ||
    !enabled() ||
    typeof document === 'undefined'
  ) {
    return;
  }

  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  const script = document.createElement('script');
  script.async = true;
  script.src =
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      measurementId,
    )}`;

  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });
}

export function trackPageView(path) {
  if (!enabled() || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_location: window.location.href,
    page_path: path,
    page_title: document.title,
  });
}

export function trackEvent(
  name,
  params = {},
) {
  if (!enabled() || !window.gtag) return;
  window.gtag('event', name, params);
}
