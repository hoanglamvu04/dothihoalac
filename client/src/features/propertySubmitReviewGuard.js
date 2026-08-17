import './propertySubmitReviewGuard.css';

const FORM_SELECTOR = '.property-post-form';
const BYPASS_ATTRIBUTE = 'data-property-review-confirmed';
let activeOverlay = null;
let activeKeyHandler = null;

function text(root, selector, fallback = '—') {
  return root?.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || fallback;
}

function closeReview() {
  if (activeKeyHandler) {
    window.removeEventListener('keydown', activeKeyHandler);
    activeKeyHandler = null;
  }

  if (activeOverlay) {
    activeOverlay.remove();
    activeOverlay = null;
  }

  document.body?.classList.remove('property-submit-review-open');
}

function showReview(form, submitter) {
  if (activeOverlay || !document.body) return;

  const step = form.querySelector('[data-step="3"]');
  if (!step) return;

  const overlay = document.createElement('div');
  overlay.className = 'property-submit-review-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML = `
    <section class="property-submit-review-dialog" role="dialog" aria-modal="true" aria-labelledby="property-submit-review-title">
      <header class="property-submit-review-dialog__header">
        <div class="property-submit-review-dialog__icon" aria-hidden="true">✓</div>
        <div>
          <small>BƯỚC XÁC NHẬN CUỐI</small>
          <h2 id="property-submit-review-title">Xem lại trước khi gửi kiểm duyệt</h2>
          <p>Tin chưa được gửi ở màn hình hạng tin. Chỉ khi bạn xác nhận bên dưới, hệ thống mới chuyển tin sang trạng thái Chờ duyệt.</p>
        </div>
        <button type="button" class="property-submit-review-dialog__close" aria-label="Đóng">×</button>
      </header>

      <div class="property-submit-review-dialog__body">
        <div class="property-submit-review-dialog__notice">
          <strong>Sau khi gửi</strong>
          <span>Trong thời gian chờ kiểm duyệt, chỉ bạn và quản trị viên có thể mở trang chi tiết của tin. Người dùng khác sẽ chưa nhìn thấy tin.</span>
        </div>

        <dl class="property-submit-review-dialog__facts">
          <div class="is-wide"><dt>Tin đăng</dt><dd data-value="title">—</dd></div>
          <div><dt>Hạng tin</dt><dd data-value="tier">—</dd></div>
          <div><dt>Thời hạn</dt><dd data-value="duration">—</dd></div>
          <div><dt>Mức giá BĐS</dt><dd data-value="price">—</dd></div>
          <div><dt>Thanh toán hiện tại</dt><dd class="is-free">0 đ · Miễn phí</dd></div>
        </dl>

        <label class="property-submit-review-dialog__check">
          <input type="checkbox" data-confirm-check />
          <span>
            <strong>Tôi đã kiểm tra hạng tin, thời hạn và thông tin đăng.</strong>
            <small>Có thể quay lại để sửa trước khi gửi kiểm duyệt.</small>
          </span>
        </label>
      </div>

      <footer class="property-submit-review-dialog__footer">
        <button type="button" class="property-submit-review-dialog__back">Quay lại kiểm tra</button>
        <button type="button" class="property-submit-review-dialog__submit" disabled>Gửi kiểm duyệt</button>
      </footer>
    </section>
  `;

  overlay.querySelector('[data-value="title"]').textContent = text(step, '.property-post-checkout__listing h3', 'Tin bất động sản');
  overlay.querySelector('[data-value="tier"]').textContent = text(step, '.property-post-tier-grid .is-selected strong', 'Tin Thường');
  overlay.querySelector('[data-value="duration"]').textContent = text(step, '.property-post-duration-grid .is-selected span', '15 ngày');
  overlay.querySelector('[data-value="price"]').textContent = text(step, '.property-post-checkout__listing > div > strong', 'Theo thông tin đã nhập');

  const checkbox = overlay.querySelector('[data-confirm-check]');
  const confirmButton = overlay.querySelector('.property-submit-review-dialog__submit');
  const closeButton = overlay.querySelector('.property-submit-review-dialog__close');
  const backButton = overlay.querySelector('.property-submit-review-dialog__back');

  checkbox.addEventListener('change', () => {
    confirmButton.disabled = !checkbox.checked;
  });

  const cancel = () => closeReview();
  closeButton.addEventListener('click', cancel);
  backButton.addEventListener('click', cancel);
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) cancel();
  });

  confirmButton.addEventListener('click', () => {
    if (!checkbox.checked) return;
    form.setAttribute(BYPASS_ATTRIBUTE, '1');
    closeReview();

    form.requestSubmit(submitter || undefined);
    window.setTimeout(() => form.removeAttribute(BYPASS_ATTRIBUTE), 0);
  });

  activeKeyHandler = (event) => {
    if (event.key === 'Escape') cancel();
  };
  window.addEventListener('keydown', activeKeyHandler);

  document.body.classList.add('property-submit-review-open');
  document.body.appendChild(overlay);
  activeOverlay = overlay;
  window.setTimeout(() => checkbox.focus(), 0);
}

function interceptSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches(FORM_SELECTOR)) return;
  if (!form.querySelector('[data-step="3"]')) return;

  if (form.getAttribute(BYPASS_ATTRIBUTE) === '1') {
    form.removeAttribute(BYPASS_ATTRIBUTE);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  showReview(form, event.submitter);
}

function addReadFirstHint() {
  const step = document.querySelector(`${FORM_SELECTOR} [data-step="3"]`);
  if (!step || step.querySelector('.property-submit-read-first')) return;

  const hint = document.createElement('div');
  hint.className = 'property-submit-read-first';
  hint.innerHTML = `
    <span aria-hidden="true">i</span>
    <div>
      <strong>Hãy dừng lại kiểm tra hạng tin trước khi gửi</strong>
      <p>Chọn hạng và thời hạn, đọc phần tóm tắt bên trên. Nút đăng tin sẽ mở thêm một màn hình xác nhận cuối và chưa gửi ngay.</p>
    </div>
  `;

  const checkout = step.querySelector('.property-post-checkout');
  if (checkout) checkout.insertAdjacentElement('afterend', hint);
  else step.appendChild(hint);
}

document.addEventListener('submit', interceptSubmit, true);

const observer = new MutationObserver(() => {
  if (activeOverlay && !document.querySelector(FORM_SELECTOR)) closeReview();
  addReadFirstHint();
});

function startObserver() {
  if (!document.body) return;
  observer.observe(document.body, { childList: true, subtree: true });
  addReadFirstHint();
}

if (document.body) startObserver();
else window.addEventListener('DOMContentLoaded', startObserver, { once: true });
