import { useEffect, useState } from 'react';

import {
  isXHubAnalyticsFeatureEnabled,
  isXHubPrivacySignalActive,
  readXHubConsentChoice,
  setXHubConsentChoice,
} from '../../utils/xhubConsent.mjs';
import {
  disableXHubAnalytics,
  trackXHubPageView,
} from '../../utils/xhubAnalytics.mjs';

import './XHubConsentControls.css';

/**
 * Never render a consent prompt before a site source, privacy copy, and
 * same-origin bridge have been approved. Without explicit opt-in this widget
 * does not make any telemetry requests.
 */
export default function XHubConsentControls() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(() => readXHubConsentChoice());

  useEffect(() => {
    const onStorage = () => {
      setChoice(readXHubConsentChoice());
      disableXHubAnalytics();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!isXHubAnalyticsFeatureEnabled()) return null;

  const privacyBlocked = isXHubPrivacySignalActive();

  const choose = (value) => {
    if (!setXHubConsentChoice(value)) return;
    setChoice(value);
    if (value === 'granted') {
      trackXHubPageView();
    } else {
      disableXHubAnalytics();
    }
  };

  return (
    <div className="xhub-consent-controls">
      <button
        type="button"
        className="xhub-consent-controls__toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Tùy chọn phân tích ẩn danh
      </button>
      {open ? (
        <section className="xhub-consent-controls__choices" aria-label="Đồng ý phân tích ẩn danh">
          <p>
            Bạn có thể tự nguyện cho phép thống kê số lượt xem, tìm kiếm và
            tương tác dưới dạng ẩn danh nhằm cải thiện trang web. Không gửi
            nội dung tìm kiếm, biểu mẫu, tên, điện thoại hay email tới X-HUB.
          </p>
          {privacyBlocked ? (
            <p role="status">Trình duyệt đã bật GPC/DNT, vì vậy phân tích vẫn bị tắt.</p>
          ) : (
            <p role="status">
              Trạng thái hiện tại: {choice === 'granted' ? 'Đã đồng ý' : 'Đang tắt'}
            </p>
          )}
          <div className="xhub-consent-controls__actions">
            <button
              type="button"
              disabled={privacyBlocked}
              onClick={() => choose('granted')}
            >
              Tôi đồng ý
            </button>
            <button type="button" onClick={() => choose('denied')}>
              {choice === 'granted' ? 'Rút lại đồng ý' : 'Không đồng ý'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
