const JOB_WIZARD_STEPS = [
  {
    id: 1,
    label: 'Thông tin cơ bản',
    description: 'Loại việc, đơn vị tuyển dụng, mức lương và yêu cầu cơ bản.',
    sourceSteps: [1, 3],
  },
  {
    id: 2,
    label: 'Nội dung công việc',
    description: 'Tiêu đề, giới thiệu, mô tả công việc và yêu cầu ứng viên.',
    sourceSteps: [2],
  },
  {
    id: 3,
    label: 'Địa điểm & quyền lợi',
    description: 'Địa điểm làm việc và các quyền lợi dành cho ứng viên.',
    sourceSteps: [4, 5],
  },
  {
    id: 4,
    label: 'Ứng tuyển & hình ảnh',
    description: 'Cách ứng tuyển, thông tin liên hệ và ảnh đại diện của tin.',
    sourceSteps: [6, 7],
  },
  {
    id: 5,
    label: 'Xem lại',
    description: 'Kiểm tra toàn bộ thông tin trước khi lưu và gửi duyệt.',
    sourceSteps: [],
    review: true,
  },
];

const upgradedPages = new WeakSet();

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function originalStepNumber(card) {
  const savedStep = Number(card?.dataset?.jobOriginalStep || 0);
  if (savedStep) return savedStep;

  const text = cleanText(card.querySelector('.job-editor-card__heading small')?.textContent);
  const match = text.match(/Bước\s+(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function wizardStepForOriginal(stepNumber) {
  return JOB_WIZARD_STEPS.find((step) => step.sourceSteps.includes(stepNumber))?.id || 0;
}

function controlValue(control) {
  if (!control) return '';

  if (control instanceof HTMLSelectElement) {
    return cleanText(control.selectedOptions?.[0]?.textContent || control.value);
  }

  if (control instanceof HTMLInputElement) {
    if (control.type === 'checkbox') return control.checked ? 'Có' : 'Không';
    if (control.type === 'radio') return control.checked ? cleanText(control.value) : '';
    if (control.type === 'file') return control.files?.length ? `${control.files.length} tệp đã chọn` : '';
  }

  return cleanText(control.value);
}

function fieldRows(card) {
  const rows = [];
  const seen = new Set();

  card.querySelectorAll('.job-editor-field').forEach((field) => {
    const label = cleanText(field.querySelector('.job-editor-field__label label')?.textContent)
      .replace(/\s*\*\s*$/, '');
    if (!label || seen.has(label)) return;

    const controls = [...field.querySelectorAll('select, textarea, input:not([type="hidden"])')];
    let value = controls.map(controlValue).filter(Boolean).join(' · ');

    if (!value) {
      const richText = field.querySelector('.rte-content');
      value = cleanText(richText?.textContent);
    }

    if (!value) value = 'Chưa nhập';
    if (value.length > 220) value = `${value.slice(0, 217)}...`;

    seen.add(label);
    rows.push({ label, value });
  });

  card.querySelectorAll('.job-editor-content-block').forEach((block) => {
    const label = cleanText(block.querySelector('.job-editor-content-block__heading h3')?.textContent)
      .replace(/\s*\*\s*$/, '');
    if (!label || seen.has(label)) return;

    let value = cleanText(block.querySelector('.rte-content')?.textContent);
    if (!value) value = 'Chưa nhập';
    if (value.length > 220) value = `${value.slice(0, 217)}...`;

    seen.add(label);
    rows.push({ label, value });
  });

  const originalStep = originalStepNumber(card);
  if (originalStep === 7 && !seen.has('Ảnh đại diện')) {
    rows.push({
      label: 'Ảnh đại diện',
      value: card.querySelector('img') ? 'Đã chọn ảnh đại diện' : 'Chưa chọn ảnh',
    });
  }

  return rows;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function scrollEditorIntoView(page) {
  const target = page.querySelector('.job-editor-wizard-shell') || page.querySelector('.job-editor-layout');
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - 92;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function enhanceJobEditor(page) {
  if (upgradedPages.has(page)) return;

  const layout = page.querySelector('.job-editor-layout');
  const main = page.querySelector('.job-editor-main');
  if (!layout || !main) return;

  const cards = [...main.children].filter((node) => node.classList?.contains('job-editor-card'));
  const actions = [...main.children].find((node) => node.classList?.contains('job-editor-actions'));
  if (cards.length < 7 || !actions) return;

  const mappedCards = cards
    .map((card) => ({ card, originalStep: originalStepNumber(card) }))
    .filter(({ originalStep }) => originalStep > 0);

  if (mappedCards.length < 7) return;

  upgradedPages.add(page);
  page.classList.add('job-editor-wizard--active');

  mappedCards.forEach(({ card, originalStep }) => {
    const wizardStep = wizardStepForOriginal(originalStep);
    card.dataset.jobOriginalStep = String(originalStep);
    card.dataset.jobWizardStep = String(wizardStep);

    const group = JOB_WIZARD_STEPS.find((step) => step.id === wizardStep);
    const itemIndex = group ? group.sourceSteps.indexOf(originalStep) + 1 : 1;
    const eyebrow = card.querySelector('.job-editor-card__heading small');
    if (eyebrow && wizardStep) eyebrow.textContent = `Mục ${wizardStep}.${itemIndex}`;
  });

  const shell = createElement('section', 'job-editor-wizard-shell');
  shell.setAttribute('aria-label', 'Các bước đăng tin tuyển dụng');

  const stepper = createElement('div', 'job-editor-wizard-stepper');
  const intro = createElement('div', 'job-editor-wizard-intro');
  const introEyebrow = createElement('span', 'job-editor-wizard-intro__eyebrow');
  const introTitle = createElement('h2', 'job-editor-wizard-intro__title');
  const introDescription = createElement('p', 'job-editor-wizard-intro__description');
  intro.append(introEyebrow, introTitle, introDescription);

  shell.append(stepper, intro);
  layout.before(shell);

  const review = createElement('section', 'job-editor-wizard-review');
  review.hidden = true;
  main.insertBefore(review, actions);

  const footer = createElement('section', 'job-editor-wizard-footer');
  const footerLeft = createElement('div', 'job-editor-wizard-footer__left');
  const footerRight = createElement('div', 'job-editor-wizard-footer__right');

  const backButton = createElement('button', 'job-editor-wizard-button job-editor-wizard-button--ghost', 'Quay lại');
  backButton.type = 'button';

  const draftButton = createElement('button', 'job-editor-wizard-button job-editor-wizard-button--secondary', 'Lưu bản nháp');
  draftButton.type = 'button';

  const nextButton = createElement('button', 'job-editor-wizard-button job-editor-wizard-button--primary', 'Tiếp tục');
  nextButton.type = 'button';

  footerLeft.append(backButton);
  footerRight.append(draftButton, nextButton);
  footer.append(footerLeft, footerRight);
  main.insertBefore(footer, actions);

  let currentStep = 1;
  let furthestStep = 1;

  const stepButtons = JOB_WIZARD_STEPS.map((step) => {
    const button = createElement('button', 'job-editor-wizard-stepper__item');
    button.type = 'button';
    button.dataset.step = String(step.id);

    const index = createElement('span', 'job-editor-wizard-stepper__index', step.review ? '✓' : String(step.id));
    const copy = createElement('span', 'job-editor-wizard-stepper__copy');
    copy.append(
      createElement('small', '', step.review ? 'Cuối cùng' : `Bước ${step.id}`),
      createElement('strong', '', step.label),
    );
    button.append(index, copy);

    button.addEventListener('click', () => {
      if (step.id > furthestStep) return;
      currentStep = step.id;
      render();
      scrollEditorIntoView(page);
    });

    stepper.append(button);
    return button;
  });

  function buildReview() {
    review.replaceChildren();

    const heading = createElement('header', 'job-editor-wizard-review__heading');
    const headingCopy = createElement('div');
    headingCopy.append(
      createElement('span', '', 'XEM LẠI TRƯỚC KHI ĐĂNG'),
      createElement('h2', '', 'Kiểm tra toàn bộ tin tuyển dụng'),
      createElement('p', '', 'Bạn có thể quay lại từng bước để chỉnh sửa. Khi mọi thông tin đã đúng, dùng nút đăng/gửi duyệt ở cuối trang.'),
    );
    heading.append(headingCopy);
    review.append(heading);

    const grid = createElement('div', 'job-editor-wizard-review__grid');

    JOB_WIZARD_STEPS.filter((step) => !step.review).forEach((step) => {
      const block = createElement('article', 'job-editor-wizard-review__block');
      const blockHeader = createElement('header');
      const headerCopy = createElement('div');
      headerCopy.append(
        createElement('small', '', `Bước ${step.id}`),
        createElement('h3', '', step.label),
      );

      const editButton = createElement('button', '', 'Chỉnh sửa');
      editButton.type = 'button';
      editButton.addEventListener('click', () => {
        currentStep = step.id;
        render();
        scrollEditorIntoView(page);
      });

      blockHeader.append(headerCopy, editButton);
      block.append(blockHeader);

      const stepCards = mappedCards.filter(({ originalStep }) => step.sourceSteps.includes(originalStep));
      let rowCount = 0;

      stepCards.forEach(({ card }) => {
        const cardTitle = cleanText(card.querySelector('.job-editor-card__heading h2')?.textContent);
        const rows = fieldRows(card);

        if (cardTitle) block.append(createElement('h4', '', cardTitle));

        if (rows.length) {
          const list = createElement('dl');
          rows.forEach(({ label, value }) => {
            list.append(createElement('dt', '', label), createElement('dd', '', value));
          });
          block.append(list);
          rowCount += rows.length;
        }
      });

      if (!rowCount) {
        block.append(createElement('p', 'job-editor-wizard-review__empty', 'Thông tin của bước này đã được giữ nguyên trong biểu mẫu.'));
      }

      grid.append(block);
    });

    review.append(grid);
  }

  function render() {
    page.dataset.jobWizardStep = String(currentStep);

    mappedCards.forEach(({ card }) => {
      card.classList.toggle('is-job-wizard-visible', Number(card.dataset.jobWizardStep) === currentStep);
    });

    const reviewing = currentStep === 5;
    review.hidden = !reviewing;
    actions.classList.toggle('is-job-wizard-visible', reviewing);
    footer.classList.toggle('is-reviewing', reviewing);

    const current = JOB_WIZARD_STEPS[currentStep - 1];
    introEyebrow.textContent = reviewing ? 'XEM LẠI' : `BƯỚC ${currentStep} / 4`;
    introTitle.textContent = current.label;
    introDescription.textContent = current.description;

    stepButtons.forEach((button) => {
      const stepId = Number(button.dataset.step);
      button.classList.toggle('is-active', stepId === currentStep);
      button.classList.toggle('is-complete', stepId < currentStep || stepId < furthestStep);
      button.disabled = stepId > furthestStep;
    });

    backButton.hidden = currentStep === 1;
    nextButton.hidden = reviewing;
    nextButton.textContent = currentStep === 4 ? 'Xem lại' : 'Tiếp tục';
    draftButton.hidden = reviewing;

    if (reviewing) buildReview();
  }

  backButton.addEventListener('click', () => {
    if (currentStep <= 1) return;
    currentStep -= 1;
    render();
    scrollEditorIntoView(page);
  });

  nextButton.addEventListener('click', () => {
    if (currentStep >= 5) return;
    currentStep += 1;
    furthestStep = Math.max(furthestStep, currentStep);
    render();
    scrollEditorIntoView(page);
  });

  draftButton.addEventListener('click', () => {
    const sourceButton = [...actions.querySelectorAll('button')].find((button) =>
      cleanText(button.textContent).toLowerCase().includes('lưu bản nháp'),
    );
    sourceButton?.click();
  });

  const jumpToFirstError = () => {
    if (currentStep !== 5) return;

    const errorNode = main.querySelector('.has-error, .job-field-error:not(:empty)');
    const card = errorNode?.closest('.job-editor-card');
    const stepId = Number(card?.dataset.jobWizardStep || 0);
    if (!stepId) return;

    currentStep = stepId;
    render();
    scrollEditorIntoView(page);
  };

  actions.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const label = cleanText(button.textContent).toLowerCase();
    if (!label.includes('gửi duyệt')) return;

    window.setTimeout(jumpToFirstError, 80);
    window.setTimeout(jumpToFirstError, 320);
  });

  render();
}

function scanForJobEditors() {
  document.querySelectorAll('.job-editor-page').forEach(enhanceJobEditor);
}

if (typeof window !== 'undefined' && !window.__dthlJobEditorWizardInstalled) {
  window.__dthlJobEditorWizardInstalled = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanForJobEditors, { once: true });
  } else {
    queueMicrotask(scanForJobEditors);
  }

  const observer = new MutationObserver(scanForJobEditors);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
