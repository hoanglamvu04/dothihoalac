const MOBILE_QUERY = '(max-width: 720px)';

function dispatchUrl(url) {
  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function updateQuery(value) {
  const url = new URL(window.location.href);
  const clean = String(value || '').trim();

  if (clean) url.searchParams.set('q', clean);
  else url.searchParams.delete('q');
  url.searchParams.delete('page');
  dispatchUrl(url);
}

function updateSort() {
  const url = new URL(window.location.href);
  const current = url.searchParams.get('sort') || '';
  const next = current === '' ? 'price_asc' : current === 'price_asc' ? 'price_desc' : '';

  if (next) url.searchParams.set('sort', next);
  else url.searchParams.delete('sort');
  url.searchParams.delete('page');
  dispatchUrl(url);
}

function getPriceLabel(params) {
  const min = Number(params.get('minPrice') || 0);
  const max = Number(params.get('maxPrice') || 0);
  const toBillion = (value) => `${Number((value / 1_000_000_000).toFixed(1))} tỷ`;

  if (min && max) return `${toBillion(min)}–${toBillion(max)}`;
  if (min) return `Từ ${toBillion(min)}`;
  if (max) return `Đến ${toBillion(max)}`;
  return 'Mức giá';
}

function quickFilterMarkup() {
  const params = new URL(window.location.href).searchParams;
  const sort = params.get('sort') || '';
  const area = params.get('area');
  const propertyType = params.get('propertyType');
  const ownerType = params.get('ownerType');

  return `
    <div class="properties-mobile-quick-filter__grid">
      <button type="button" data-open-filter="price"><span class="qf-icon">₫</span><span>${getPriceLabel(params)}</span><span class="qf-chevron">⌄</span></button>
      <button type="button" data-open-filter="area"><span class="qf-icon">⌖</span><span>${area ? 'Đã chọn khu vực' : 'Khu vực'}</span><span class="qf-chevron">⌄</span></button>
      <button type="button" data-open-filter="owner"><span class="qf-icon">⌂</span><span>${ownerType ? 'Đơn vị đã chọn' : 'Đơn vị đăng tin'}</span><span class="qf-chevron">⌄</span></button>
      <button type="button" data-open-filter="type"><span class="qf-icon">▦</span><span>${propertyType ? 'Loại BĐS đã chọn' : 'Loại bất động sản'}</span><span class="qf-chevron">⌄</span></button>
    </div>
    <button type="button" class="properties-mobile-quick-filter__sort" data-sort>
      <span>⇅</span>
      <span>${sort === 'price_asc' ? 'Giá tăng dần' : sort === 'price_desc' ? 'Giá giảm dần' : 'Sắp xếp'}</span>
      <span>⌄</span>
    </button>
  `;
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
      <span class="properties-mobile-search-first__icon" aria-hidden="true">⌕</span>
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

  let quickFilters = hero.querySelector('.properties-mobile-quick-filter');
  if (!quickFilters) {
    quickFilters = document.createElement('section');
    quickFilters.className = 'properties-mobile-quick-filter';
    quickFilters.setAttribute('aria-label', 'Bộ lọc nhanh bất động sản');
    finder.insertAdjacentElement('beforebegin', quickFilters);

    quickFilters.addEventListener('click', (event) => {
      const filterButton = event.target.closest('[data-open-filter]');
      if (filterButton) {
        advancedButton?.click();
        return;
      }

      if (event.target.closest('[data-sort]')) updateSort();
    });
  }

  const nextMarkup = quickFilterMarkup();
  if (quickFilters.innerHTML !== nextMarkup) quickFilters.innerHTML = nextMarkup;

  finder.setAttribute('aria-hidden', 'true');
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
