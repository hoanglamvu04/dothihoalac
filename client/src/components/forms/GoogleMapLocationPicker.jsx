import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Info,
  MapPin,
} from 'lucide-react';

import './GoogleMapLocationPicker.css';

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseGoogleMapsCoordinates(value) {
  const clean = String(value || '').trim();
  if (!clean) return null;

  const direct = clean.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (direct) {
    const lat = Number(direct[1]);
    const lng = Number(direct[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }

  const patterns = [
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:,|z|\/|$)/,
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
    /[?&](?:query|q|ll|destination)=(-?\d{1,2}(?:\.\d+)?)(?:%2C|,)(-?\d{1,3}(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }

  return null;
}

function getSelectedAreaName() {
  if (typeof document === 'undefined') return '';

  const select = document.querySelector('.property-post-taxonomy select');
  const name = select?.selectedOptions?.[0]?.textContent?.trim() || '';

  return name && name !== 'Chọn khu vực' ? name : '';
}

function buildSearchQuery(address, areaName = '') {
  const addressText = String(address || '').trim();
  const areaText = String(areaName || '').trim() || 'Hòa Lạc';
  const parts = [];
  const normalizedAddress = addressText.toLocaleLowerCase('vi');

  if (addressText) parts.push(addressText);

  if (areaText && !normalizedAddress.includes(areaText.toLocaleLowerCase('vi'))) {
    parts.push(areaText);
  }

  const joined = parts.join(', ').toLocaleLowerCase('vi');
  if (!joined.includes('hà nội') && !joined.includes('ha noi')) {
    parts.push('Hà Nội');
  }

  return parts.join(', ') || 'Hòa Lạc, Hà Nội';
}

function buildSearchUrl(address, areaName = '') {
  const query = buildSearchQuery(address, areaName);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function GoogleMapLocationPicker({
  address = '',
  latitude = '',
  longitude = '',
  onLocationChange,
}) {
  const [mapsValue, setMapsValue] = useState('');
  const [message, setMessage] = useState('');
  const searchUrl = useMemo(() => buildSearchUrl(address), [address]);
  const lat = asNumber(latitude);
  const lng = asNumber(longitude);
  const hasLocation = lat !== null && lng !== null;

  const openGoogleMaps = (event) => {
    event.preventDefault();
    const areaName = getSelectedAreaName();
    const url = buildSearchUrl(address, areaName);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveFromLink = () => {
    const result = parseGoogleMapsCoordinates(mapsValue);

    if (!result) {
      setMessage(
        'Chưa đọc được tọa độ từ link này. Nếu là link rút gọn maps.app.goo.gl, hãy mở link đó rồi sao chép URL đầy đủ trên thanh địa chỉ trình duyệt và dán lại.',
      );
      return;
    }

    const next = {
      latitude: Number(result.lat.toFixed(7)),
      longitude: Number(result.lng.toFixed(7)),
    };

    onLocationChange?.(next);
    setMessage('');
  };

  const savedMapsUrl = hasLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
    : '';

  return (
    <div className="property-map-picker">
      <div className="property-map-picker__heading">
        <div>
          <strong>Chọn vị trí trên Google Maps</strong>
          <span>
            Khi mở Maps, hệ thống tự ghép địa chỉ chi tiết + khu vực đã chọn +
            Hà Nội để kết quả tìm kiếm chính xác hơn. Không dùng Google Maps API
            và không cần API key.
          </span>
        </div>
        <a href={searchUrl} target="_blank" rel="noreferrer" onClick={openGoogleMaps}>
          Mở Google Maps
          <ExternalLink size={15} />
        </a>
      </div>

      <div className="property-map-picker__guide">
        <span><b>1</b>Mở Google Maps theo địa chỉ đầy đủ đã ghép với khu vực.</span>
        <span><b>2</b>Chọn đúng nhà, lô đất hoặc vị trí bất động sản.</span>
        <span><b>3</b>Sao chép URL đầy đủ trên thanh địa chỉ trình duyệt.</span>
        <span><b>4</b>Dán URL vào ô dưới và chọn <strong>Lưu vị trí</strong>.</span>
      </div>

      <label className="property-map-picker__link-field">
        <span>
          <MapPin size={17} />
          Link Google Maps hoặc tọa độ
        </span>
        <div>
          <Clipboard size={18} />
          <input
            type="text"
            value={mapsValue}
            onChange={(event) => {
              setMapsValue(event.target.value);
              setMessage('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                saveFromLink();
              }
            }}
            placeholder="Dán URL Google Maps đầy đủ hoặc 20.9958,105.5279"
            autoComplete="off"
          />
          <button type="button" onClick={saveFromLink} disabled={!mapsValue.trim()}>
            Lưu vị trí
          </button>
        </div>
      </label>

      {hasLocation ? (
        <div className="property-map-picker__status is-success">
          <CheckCircle2 size={18} />
          <div>
            <strong>Đã lưu vị trí bất động sản</strong>
            <span>
              Vị trí chính xác đã được lưu. Người xem sẽ có nút mở Google Maps
              và chỉ đường tới điểm này.
            </span>
          </div>
          <a href={savedMapsUrl} target="_blank" rel="noreferrer">
            Kiểm tra vị trí
            <ExternalLink size={14} />
          </a>
        </div>
      ) : null}

      {message ? <p className="property-map-picker__message">{message}</p> : null}

      <div className="property-map-picker__note">
        <Info size={18} />
        <p>
          Ví dụ: nếu nhập <strong>Số Nhà 20 thôn Thái Bình</strong> và chọn khu
          vực <strong>Hòa Lạc</strong>, nút mở Maps sẽ tìm theo chuỗi
          <strong> Số Nhà 20 thôn Thái Bình, Hòa Lạc, Hà Nội</strong>. Link rút
          gọn kiểu <strong>maps.app.goo.gl</strong> không chứa tọa độ trực tiếp;
          hãy mở link trước rồi sao chép URL đầy đủ trên thanh địa chỉ.
        </p>
      </div>
    </div>
  );
}
