import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  XHUB_CONSENT_CHANGE_EVENT,
  xhubIntelligence,
} from '../../utils/xhub-intelligence.mjs';

import './XHubAnalyticsConsent.css';

const MANAGE_EVENT = 'dthl:xhub-consent-manage';

export function XHubConsentSettingsButton() {
  if (!xhubIntelligence.enabled()) return null;

  return (
    <button
      type="button"
      className="xhub-consent-manage"
      onClick={() => window.dispatchEvent(new Event(MANAGE_EVENT))}
    >
      Tùy chọn phân tích
    </button>
  );
}

export default function XHubAnalyticsConsent() {
  const [choice, setChoice] = useState(() => xhubIntelligence.preference());
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (!xhubIntelligence.enabled()) return undefined;

    const updateChoice = () => setChoice(xhubIntelligence.preference());
    const openSettings = () => {
      updateChoice();
      setManageOpen(true);
    };

    window.addEventListener(XHUB_CONSENT_CHANGE_EVENT, updateChoice);
    window.addEventListener(MANAGE_EVENT, openSettings);

    return () => {
      window.removeEventListener(XHUB_CONSENT_CHANGE_EVENT, updateChoice);
      window.removeEventListener(MANAGE_EVENT, openSettings);
    };
  }, []);

  // No approved UI means absolutely no X-HUB consent surface or requests.
  if (!xhubIntelligence.enabled()) return null;
  if (choice !== 'unset' && !manageOpen) return null;

  const blocked = choice === 'blocked';
  const choose = (allowed) => {
    xhubIntelligence.setConsent(allowed);
    setChoice(xhubIntelligence.preference());
    setManageOpen(false);
  };

  return (
    <section className="xhub-consent" role="region" aria-label="Tùy chọn phân tích truy cập">
      <div className="xhub-consent__message">
        <strong>Tùy chọn phân tích truy cập ẩn danh</strong>
        <p>
          Bạn có thể đồng ý chia sẻ số lượt xem trang và tương tác cơ bản
          để cải thiện website. Không chuyển tên, số điện thoại, nội dung
          biểu mẫu hay từ khóa tìm kiếm sang X-HUB.
          {' '}<Link to="/chinh-sach-quyen-rieng-tu">Quyền riêng tư</Link>.
        </p>
        {blocked ? (
          <p className="xhub-consent__blocked">
            Trình duyệt đã bật tín hiệu không theo dõi. Hệ thống không bật phân tích.
          </p>
        ) : null}
      </div>
      <div className="xhub-consent__actions">
        {!blocked ? (
          <>
            <button type="button" onClick={() => choose(false)}>Không đồng ý</button>
            <button type="button" className="xhub-consent__accept" onClick={() => choose(true)}>
              Đồng ý phân tích
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setManageOpen(false)}>Đóng</button>
        )}
      </div>
    </section>
  );
}
