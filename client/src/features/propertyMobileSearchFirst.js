const MOBILE_QUERY = '(max-width: 720px)';

function updateQuery(value) {
  const url = new URL(window.location.href);
  const clean = String(value || '').trim();

  if (clean) url.searchParams.set('q', clean);
  else url.searchParams.delete('q');
  url.searchParams.delete('page');

  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function enhancePropertyPage() {
  if (typeof window === 'undefined' || !window.matchMedia(MOBILE_QUERY).matches) return;

  const page = document.querySelector('.properties-page');
  const hero = page?.querySelector('.properties-hero');
  const finder = hero?.querySelector('.properties-hero__finder');
  const advancedButton = page?.querySelector('.properties-toolbar__advanced');

  if (!page || !hero || !finder) return;

  if (!hero.querySelector('.properties-mobile-search-first')) {
    const form = document.createElement('form');
    form.className = 'properties-mobile-search-first';
    form.setAttribute('role', 'search');
    form.innerHTML = `
      <input type="search" inputmode="search" autocomplete="off" aria-label="Tìm bất động sản theo từ khóa" placeholder="Tìm theo từ khóa..." />
      <button type="submit">Tìm</button>
    `;

    const input = form.querySelector('input');
    input.value = new URL(window.location.href).searchParams.get('q') || '';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      updateQuery(input.value);
      window.setTimeout(() => {
        document.querySelector('#property-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    });

    finder.insertAdjacentElement('beforebegin', form);
  }

  if (!finder.dataset.mobileSearchFirstBound) {
    finder.dataset.mobileSearchFirstBound = 'true';
    finder.addEventListener('submit', (event) => {
      if (!window.matchMedia(MOBILE_QUERY).matches) return;
      event.preventDefault();
      event.stopPropagation();
      advancedButton?.click();
    }, true);
  }
}

function scheduleEnhance() {
  window.requestAnimationFrame(enhancePropertyPage);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleEnhance, { once: true });
  } else {
    scheduleEnhance();
  }

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', scheduleEnhance);
  window.addEventListener('resize', scheduleEnhance);
}
