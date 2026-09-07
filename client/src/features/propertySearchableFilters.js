const PROPERTY_FILTER_SELECTORS = [
  '.properties-hero__finder select',
  '.properties-toolbar__filters select',
].join(', ');

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function nativeSetSelectValue(select, value) {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    'value',
  );

  if (descriptor?.set) descriptor.set.call(select, value);
  else select.value = value;

  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function closeSmartSelect(root) {
  if (!root) return;
  root.classList.remove('is-open');
  const menu = root.querySelector('.property-smart-select__menu');
  const trigger = root.querySelector('.property-smart-select__trigger');
  if (menu) menu.hidden = true;
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function closeAllSmartSelects(except = null) {
  document.querySelectorAll('.property-smart-select.is-open').forEach((root) => {
    if (root !== except) closeSmartSelect(root);
  });
}

function optionSnapshot(select) {
  return Array.from(select.options).map((option) => ({
    value: option.value,
    label: option.textContent?.trim() || '',
    disabled: option.disabled,
  }));
}

function selectedLabel(select) {
  const option = select.options[select.selectedIndex];
  return option?.textContent?.trim() || select.options[0]?.textContent?.trim() || 'Chọn';
}

function renderOptions(root, select, query = '') {
  const list = root.querySelector('.property-smart-select__options');
  const empty = root.querySelector('.property-smart-select__empty');
  if (!list || !empty) return;

  list.replaceChildren();
  const normalizedQuery = normalizeSearchText(query);
  const options = optionSnapshot(select).filter((option) => {
    if (!normalizedQuery) return true;
    return normalizeSearchText(option.label).includes(normalizedQuery);
  });

  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'property-smart-select__option';
    button.dataset.value = option.value;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(option.value === select.value));
    button.disabled = option.disabled;

    if (option.value === select.value) button.classList.add('is-selected');

    const label = document.createElement('span');
    label.textContent = option.label;
    button.append(label);

    button.addEventListener('click', () => {
      nativeSetSelectValue(select, option.value);
      syncSmartSelect(root, select);
      closeSmartSelect(root);
      root.querySelector('.property-smart-select__trigger')?.focus();
    });

    list.append(button);
  });

  empty.hidden = options.length > 0;
}

function syncSmartSelect(root, select) {
  if (!root?.isConnected || !select?.isConnected) return;
  const label = root.querySelector('.property-smart-select__value');
  if (label) label.textContent = selectedLabel(select);

  root.querySelectorAll('.property-smart-select__option').forEach((button) => {
    const selected = button.dataset.value === select.value;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-selected', String(selected));
  });
}

function openSmartSelect(root, select) {
  closeAllSmartSelects(root);
  root.classList.add('is-open');

  const menu = root.querySelector('.property-smart-select__menu');
  const search = root.querySelector('.property-smart-select__search-input');
  const trigger = root.querySelector('.property-smart-select__trigger');
  if (!menu || !search) return;

  menu.hidden = false;
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  search.value = '';
  renderOptions(root, select, '');

  window.setTimeout(() => {
    if (root.classList.contains('is-open')) search.focus();
  }, 0);
}

function enhancePropertySelect(select) {
  if (!(select instanceof HTMLSelectElement)) return;
  if (select.dataset.propertySmartEnhanced === 'true') return;

  const host = select.parentElement;
  if (!host) return;

  select.dataset.propertySmartEnhanced = 'true';
  host.dataset.propertySmartSelectHost = 'true';

  const root = document.createElement('div');
  root.className = 'property-smart-select';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'property-smart-select__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const value = document.createElement('span');
  value.className = 'property-smart-select__value';
  value.textContent = selectedLabel(select);

  const chevron = document.createElement('span');
  chevron.className = 'property-smart-select__chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '⌄';

  trigger.append(value, chevron);

  const menu = document.createElement('div');
  menu.className = 'property-smart-select__menu';
  menu.hidden = true;

  const searchWrap = document.createElement('div');
  searchWrap.className = 'property-smart-select__search';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'property-smart-select__search-icon';
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.textContent = '⌕';

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'property-smart-select__search-input';
  search.placeholder = 'Tìm lựa chọn...';
  search.autocomplete = 'off';
  search.setAttribute('aria-label', 'Tìm trong danh sách lựa chọn');

  searchWrap.append(searchIcon, search);

  const options = document.createElement('div');
  options.className = 'property-smart-select__options';
  options.setAttribute('role', 'listbox');

  const empty = document.createElement('div');
  empty.className = 'property-smart-select__empty';
  empty.hidden = true;
  empty.textContent = 'Không tìm thấy lựa chọn';

  menu.append(searchWrap, options, empty);
  root.append(trigger, menu);
  host.insertBefore(root, select);

  trigger.addEventListener('click', () => {
    if (root.classList.contains('is-open')) closeSmartSelect(root);
    else openSmartSelect(root, select);
  });

  search.addEventListener('input', () => renderOptions(root, select, search.value));
  select.addEventListener('change', () => syncSmartSelect(root, select));

  renderOptions(root, select);
}

function enhanceAllPropertySelects() {
  document.querySelectorAll(PROPERTY_FILTER_SELECTORS).forEach(enhancePropertySelect);
}

function syncAllPropertySelects() {
  document.querySelectorAll('select[data-property-smart-enhanced="true"]').forEach((select) => {
    const root = select.parentElement?.querySelector('.property-smart-select');
    if (root) syncSmartSelect(root, select);
  });
}

function initializePropertySearchableFilters() {
  if (window.__dthlPropertySearchableFiltersReady) return;
  window.__dthlPropertySearchableFiltersReady = true;

  const rootNode = document.getElementById('root') || document.body;

  const observer = new MutationObserver(() => {
    enhanceAllPropertySelects();
    syncAllPropertySelects();
  });

  observer.observe(rootNode, { childList: true, subtree: true });

  document.addEventListener('click', (event) => {
    const smartRoot = event.target.closest?.('.property-smart-select');
    if (!smartRoot) closeAllSmartSelects();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllSmartSelects();
  });

  // React Router updates controlled select values without always producing a
  // native DOM mutation. A light sync keeps labels correct after URL changes,
  // browser navigation and clicks on the property-type rail.
  window.setInterval(() => {
    if (document.querySelector('.properties-page')) {
      enhanceAllPropertySelects();
      syncAllPropertySelects();
    }
  }, 500);

  enhanceAllPropertySelects();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePropertySearchableFilters, { once: true });
} else {
  initializePropertySearchableFilters();
}
