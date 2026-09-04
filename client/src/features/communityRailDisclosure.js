const COLLAPSED_ITEM_COUNT = 4;
const ROOT_SELECTOR = '.community-reference-left';
const SECTION_SELECTOR = '.community-discovery-section';
const MORE_SELECTOR = '.community-discovery-more';

let syncScheduled = false;

function getDirectList(section) {
  return section.querySelector(':scope > .community-discovery-list');
}

function sectionKind(section) {
  return section.classList.contains('community-discovery-section--topics')
    ? 'chủ đề'
    : 'khu vực';
}

function ensureLabel(button) {
  let label = button.querySelector('span');

  if (!label) {
    label = document.createElement('span');
    button.prepend(label);
  }

  return label;
}

function syncSection(section) {
  const list = getDirectList(section);
  if (!list) return;

  const itemCount = list.children.length;
  const existingButton = section.querySelector(`:scope > ${MORE_SELECTOR}`);

  if (itemCount <= COLLAPSED_ITEM_COUNT) {
    section.classList.remove('community-discovery-section--disclosure', 'is-expanded');
    delete section.dataset.communityExpanded;

    if (existingButton?.dataset.communityGenerated === 'true') {
      existingButton.remove();
    } else if (existingButton) {
      existingButton.classList.remove('community-discovery-more--disclosure');
      delete existingButton.dataset.communityDisclosure;
    }

    return;
  }

  section.classList.add('community-discovery-section--disclosure');

  if (!section.dataset.communityExpanded) {
    section.dataset.communityExpanded = 'false';
  }

  const expanded = section.dataset.communityExpanded === 'true';
  section.classList.toggle('is-expanded', expanded);

  let button = existingButton;

  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'community-discovery-more community-discovery-more--disclosure';
    button.dataset.communityGenerated = 'true';
    section.appendChild(button);
  }

  button.classList.add('community-discovery-more--disclosure');
  button.dataset.communityDisclosure = 'true';
  button.setAttribute('aria-expanded', String(expanded));
  button.setAttribute(
    'aria-label',
    expanded ? `Thu gọn ${sectionKind(section)}` : `Xem thêm ${sectionKind(section)}`,
  );

  const label = ensureLabel(button);
  const nextLabel = expanded ? 'Thu gọn' : 'Xem thêm';

  if (label.textContent !== nextLabel) {
    label.textContent = nextLabel;
  }
}

function syncAllSections() {
  document
    .querySelectorAll(`${ROOT_SELECTOR} ${SECTION_SELECTOR}`)
    .forEach(syncSection);
}

function scheduleSync() {
  if (syncScheduled) return;

  syncScheduled = true;
  window.requestAnimationFrame(() => {
    syncScheduled = false;
    syncAllSections();
  });
}

function handleDisclosureClick(event) {
  const button = event.target.closest(
    `${ROOT_SELECTOR} ${MORE_SELECTOR}[data-community-disclosure='true']`,
  );

  if (!button) return;

  const section = button.closest(SECTION_SELECTOR);
  if (!section) return;

  // The original button opens the full filter drawer. In the compact rail it is
  // repurposed as a local disclosure so users can reveal more without leaving
  // their current scroll position.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const expanded = section.dataset.communityExpanded === 'true';
  section.dataset.communityExpanded = expanded ? 'false' : 'true';
  syncSection(section);
}

function startCommunityRailDisclosure() {
  document.addEventListener('click', handleDisclosureClick, true);

  const root = document.getElementById('root') || document.body;
  const observer = new MutationObserver(scheduleSync);
  observer.observe(root, { childList: true, subtree: true });

  scheduleSync();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCommunityRailDisclosure, {
      once: true,
    });
  } else {
    startCommunityRailDisclosure();
  }
}
