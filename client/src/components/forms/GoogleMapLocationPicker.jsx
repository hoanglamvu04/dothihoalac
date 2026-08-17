import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Info,
  MapPin,
} from 'lucide-react';

import './GoogleMapLocationPicker.css';

const GOOGLE_MAP_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
]);

export function isGoogleMapsUrl(value) {
  const clean = String(value || '').trim();
  if (!clean) return true;

  try {
    const url = new URL(clean);
    const host = url.hostname.toLowerCase();
    if (!GOOGLE_MAP_HOSTS.has(host)) return false;

    if (host === 'goo.gl') {
      return url.pathname.startsWith('/maps');
    }

    if (host === 'google.com' || host === 'www.google.com') {
      return url.pathname.startsWith('/maps');
    }

    return true;
  } catch {
    return false;
  }
}

export function buildGoogleMapsSearchUrl(address) {
  const query = String(address || '').trim() || 'Hòa Lạc, Hà Nội';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrl(address) {
  const destination = String(address || '').trim() || 'Hòa Lạc, Hà Nội';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export default function GoogleMapLocationPicker({
  address = '',
  value = '',
  onChange,
}) {
  const [touched, setTouched] = useState(false);
  const cleanValue = String(value || '').trim();
  const valid = isGoogleMapsUrl(cleanValue);
  const searchUrl = useMemo(() => buildGoogleMapsSearchUrl(address), [address]);

  return (
    <div className="property-map-picker">
      <div className="property-map-picker__heading">
        <div>
          <strong>Vị trí Google Maps</strong>
          <span>
            Không cần API key. Mở Google Maps, chọn đúng vị trí bất động sản rồi
            sao chép liên kết và dán lại vào đây.
          </span>
        </div>
        <a href={searchUrl} target="_blank" rel="noreferrer">
          Mở Google Maps
          <ExternalLink size={15} />
        </a>
      </div>

      <div className="property-map-picker__guide">
        <span><b>1</b>Mở Google Maps theo địa chỉ đã nhập.</span>
        <span><b>2</b>Chọn đúng nhà, lô đất hoặc vị trí cần đăng.</span>
        <span><b>3</b>Chọn <strong>Chia sẻ → Sao chép đường liên kết</strong>.</span>
        <span><b>4</b>Quay lại và dán đường liên kết vào ô bên dưới.</span>
      </div>

      <label className="property-map-picker__link-field">
        <span>
          <MapPin size={17} />
          Link vị trí Google Maps
        </span>
        <div>
          <Clipboard size={18} />
          <input
            type="url"
            value={value}
            onBlur={() => setTouched(true)}
            onChange={(event) => {
              setTouched(true);
              onChange?.(event.target.value);
            }}
            placeholder="Dán link Google Maps, ví dụ https://maps.app.goo.gl/..."
            autoComplete="off"
          />
        </div>
      </label>

      {cleanValue && valid ? (
        <div className="property-map-picker__status is-success">
          <CheckCircle2 size={18} />
          <div>
            <strong>Đã lưu liên kết vị trí</strong>
            <span>Người xem tin có thể mở vị trí hoặc chỉ đường bằng Google Maps.</span>
          </div>
          <a href={cleanValue} target="_blank" rel="noreferrer">
            Kiểm tra link
            <ExternalLink size={14} />
          </a>
        </div>
      ) : null}

      {touched && cleanValue && !valid ? (
        <p className="property-map-picker__message">
          Chỉ chấp nhận liên kết Google Maps như google.com/maps, maps.google.com
          hoặc maps.app.goo.gl.
        </p>
      ) : null}

      {!cleanValue ? (
        <div className="property-map-picker__note">
          <Info size={18} />
          <p>
            Có thể bỏ trống nếu chưa có link chính xác. Khi đó trang chi tiết vẫn
            tạo nút chỉ đường dựa trên địa chỉ bạn đã nhập.
          </p>
        </div>
      ) : null}
    </div>
  );
}
