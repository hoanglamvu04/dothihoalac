import {
  SITE_PALETTES,
  readSitePalette,
  setSitePalette,
  subscribeSitePalette,
} from '../theme/sitePalette';

const PICKER_CLASS = 'dthl-site-palette-picker';

function createOption(palette, currentPalette) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `dthl-site-palette-picker__option${palette.id === currentPalette ? ' is-active' : ''}`;
  button.dataset.palette = palette.id;
  button.setAttribute('aria-pressed', palette.id === currentPalette ? 'true' : 'false');
  button.setAttribute('title', palette.description);

  const swatches = document.createElement('span');
  swatches.className = 'dthl-site-palette-picker__swatches';
  swatches.style.setProperty('--swatch-1', palette.swatches[0]);
  swatches.style.setProperty('--swatch-2', palette.swatches[1]);
  swatches.style.setProperty('--swatch-3', palette.swatches[2]);
  swatches.setAttribute('aria-hidden', 'true');
  swatches.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));

  const copy = document.createElement('span');
  copy.className = 'dthl-site-palette-picker__copy';

  const title = document.createElement('strong');
  title.textContent = palette.label;

  const description = document.createElement('small');
  description.textContent = palette.description;

  copy.append(title, description);

  const check = document.createElement('span');
  check.className = 'dthl-site-palette-picker__check';
  check.setAttribute('aria-hidden', 'true');
  check.textContent = '✓';

  button.append(swatches, copy, check);
  button.addEventListener('click', () => setSitePalette(palette.id));

  return button;
}

function updatePicker(root, palette) {
  root.querySelectorAll('[data-palette]').forEach((button) => {
    const active = button.dataset.palette === palette;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function mountPicker() {
  const panel = document.querySelector('.dthl-header-preferences__panel');
  if (!panel || panel.querySelector(`.${PICKER_CLASS}`)) return;

  const root = document.createElement('section');
  root.className = PICKER_CLASS;
  root.setAttribute('aria-label', 'Màu giao diện');

  const heading = document.createElement('div');
  heading.className = 'dthl-site-palette-picker__heading';

  const headingCopy = document.createElement('div');
  const headingTitle = document.createElement('strong');
  headingTitle.textContent = 'Màu giao diện';
  const headingDescription = document.createElement('span');
  headingDescription.textContent = 'Đổi toàn bộ bảng màu của website. Lựa chọn được lưu trên trình duyệt này.';
  headingCopy.append(headingTitle, headingDescription);

  const badge = document.createElement('span');
  badge.className = 'dthl-site-palette-picker__badge';
  badge.textContent = 'Xem trước tức thì';

  heading.append(headingCopy, badge);

  const grid = document.createElement('div');
  grid.className = 'dthl-site-palette-picker__grid';

  const currentPalette = readSitePalette();
  SITE_PALETTES.forEach((palette) => {
    grid.appendChild(createOption(palette, currentPalette));
  });

  root.append(heading, grid);

  const compactControl = panel.querySelector('.dthl-header-preferences__compact');
  const footer = panel.querySelector('.dthl-header-preferences__footer');

  if (compactControl) {
    panel.insertBefore(root, compactControl);
  } else if (footer) {
    panel.insertBefore(root, footer);
  } else {
    panel.appendChild(root);
  }
}

let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;

  window.requestAnimationFrame(() => {
    scheduled = false;
    mountPicker();
  });
}

if (typeof document !== 'undefined') {
  scheduleMount();

  const observer = new MutationObserver(scheduleMount);
  observer.observe(document.body, { childList: true, subtree: true });

  subscribeSitePalette((palette) => {
    document.querySelectorAll(`.${PICKER_CLASS}`).forEach((root) => {
      updatePicker(root, palette);
    });
  });
}
