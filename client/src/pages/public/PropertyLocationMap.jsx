import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Map, MapPin, Navigation2 } from 'lucide-react';

import {
  googleMapsPropertyUrl,
  openStreetMapEmbedUrl,
  propertyMapLocations,
} from '../../utils/propertyMap';

import './PropertyLocationMap.css';

export default function PropertyLocationMap({ items = [] }) {
  const [selectedId, setSelectedId] = useState('');
  const [mapOpened, setMapOpened] = useState(false);

  const points = useMemo(() => propertyMapLocations(items), [items]);
  const selected = points.find((item) => item.id === selectedId) || points[0] || null;
  const mapUrl = selected ? openStreetMapEmbedUrl(selected.latitude, selected.longitude) : '';
  const directionsUrl = selected ? googleMapsPropertyUrl(selected.latitude, selected.longitude) : '';

  return (
    <section className="properties-sidebar-card properties-sidebar-map property-live-map">
      <header>
        <div>
          <Map size={18} />
          <h3>Bản đồ tin bất động sản</h3>
        </div>
      </header>

      {points.length ? (
        <>
          <p className="property-live-map__intro">
            Có {points.length} tin trên trang này đã lưu tọa độ. Chọn tin để xem vị trí thực.
          </p>

          <div className="property-live-map__viewport">
            {mapOpened && selected && mapUrl ? (
              <iframe
                key={selected.id}
                src={mapUrl}
                title={'Bản đồ vị trí: ' + selected.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                allowFullScreen
              />
            ) : (
              <div className="property-live-map__consent">
                <MapPin size={30} aria-hidden="true" />
                <strong>Vị trí thực trên OpenStreetMap</strong>
                <p>Bấm xem bản đồ để tải nền bản đồ từ OpenStreetMap. Tin chưa có tọa độ sẽ không được ghim giả.</p>
                <button type="button" onClick={() => setMapOpened(true)}>
                  Hiện bản đồ
                </button>
              </div>
            )}
          </div>

          <div className="property-live-map__locations" aria-label="Chọn bất động sản trên bản đồ">
            {points.map((item) => (
              <button
                type="button"
                key={item.id}
                className={item.id === selected?.id ? 'is-selected' : ''}
                onClick={() => {
                  setSelectedId(item.id);
                  setMapOpened(true);
                }}
                aria-pressed={item.id === selected?.id}
                title={item.title}
              >
                <MapPin size={14} />
                <span>{item.title}</span>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="property-live-map__selected">
              <strong>{selected.title}</strong>
              {selected.address ? <small>{selected.address}</small> : null}
              <div className="property-live-map__links">
                {selected.href !== '#' ? (
                  <Link to={selected.href}>Xem tin</Link>
                ) : null}
                {directionsUrl ? (
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation2 size={13} /> Google Maps <ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
          <small className="property-live-map__scope">
            Bản đồ chỉ gồm tin có tọa độ trong trang kết quả hiện tại; không đại diện toàn bộ tin Hòa Lạc.
          </small>
        </>
      ) : (
        <div className="property-live-map__empty">
          <MapPin size={26} />
          <strong>Chưa có vị trí để hiển thị</strong>
          <p>
            Các tin đang xem chưa cung cấp tọa độ chính xác.
            Hãy chọn trang kết quả khác hoặc lưu vị trí Google Maps khi đăng tin.
          </p>
          <Link to="/dang-bai/nha-dat">Đăng tin có vị trí <ExternalLink size={13} /></Link>
        </div>
      )}
    </section>
  );
}
