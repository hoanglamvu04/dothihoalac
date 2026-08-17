import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Info,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Search,
} from 'lucide-react';

import './GoogleMapLocationPicker.css';

const DEFAULT_CENTER = { lat: 20.9958, lng: 105.5279 };
const CALLBACK_NAME = '__dthlGoogleMapsReady';
const SCRIPT_ID = 'dthl-google-maps-js';

let googleMapsPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps chỉ khả dụng trên trình duyệt.'));
  }

  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);

    window[CALLBACK_NAME] = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Không thể khởi tạo Google Maps.'));
    };

    if (existing) {
      existing.addEventListener(
        'error',
        () => reject(new Error('Không tải được Google Maps.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&loading=async&v=weekly&libraries=maps,marker,geocoding` +
      `&language=vi&region=VN&callback=${CALLBACK_NAME}`;
    script.onerror = () => reject(new Error('Không tải được Google Maps.'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default function GoogleMapLocationPicker({
  address = '',
  latitude = '',
  longitude = '',
  onLocationChange,
  onAddressResolved,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const onAddressResolvedRef = useRef(onAddressResolved);
  const initialPositionRef = useRef(null);
  const [status, setStatus] = useState(apiKey ? 'loading' : 'unconfigured');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState(address);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [searching, setSearching] = useState(false);

  const selectedPosition = useMemo(() => {
    const lat = asNumber(latitude);
    const lng = asNumber(longitude);
    return lat === null || lng === null ? null : { lat, lng };
  }, [latitude, longitude]);

  if (initialPositionRef.current === null) {
    initialPositionRef.current = selectedPosition;
  }

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    onAddressResolvedRef.current = onAddressResolved;
  }, [onAddressResolved]);

  const googleMapsSearchUrl = useMemo(() => {
    const searchValue =
      resolvedAddress ||
      address ||
      (selectedPosition
        ? `${selectedPosition.lat},${selectedPosition.lng}`
        : 'Hòa Lạc, Hà Nội');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchValue)}`;
  }, [address, resolvedAddress, selectedPosition]);

  useEffect(() => {
    if (!query && address) setQuery(address);
  }, [address, query]);

  useEffect(() => {
    if (!apiKey || !mapElementRef.current) return undefined;

    let cancelled = false;
    let clickListener;
    let dragListener;

    const reverseGeocode = async (position) => {
      if (!geocoderRef.current) return;

      try {
        const response = await geocoderRef.current.geocode({ location: position });
        if (cancelled) return;
        setResolvedAddress(response?.results?.[0]?.formatted_address || '');
      } catch {
        if (!cancelled) setResolvedAddress('');
      }
    };

    const selectPosition = async (position) => {
      if (!position || cancelled) return;

      const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
      const lng = typeof position.lng === 'function' ? position.lng() : position.lng;
      const next = {
        lat: Number(Number(lat).toFixed(7)),
        lng: Number(Number(lng).toFixed(7)),
      };

      if (markerRef.current) markerRef.current.position = next;
      onLocationChangeRef.current?.({
        latitude: next.lat,
        longitude: next.lng,
      });
      await reverseGeocode(next);
    };

    const init = async () => {
      try {
        await loadGoogleMaps(apiKey);
        const [{ Map }, { AdvancedMarkerElement }, { Geocoder }] = await Promise.all([
          window.google.maps.importLibrary('maps'),
          window.google.maps.importLibrary('marker'),
          window.google.maps.importLibrary('geocoding'),
        ]);

        if (cancelled || !mapElementRef.current) return;

        const initialPosition = initialPositionRef.current || DEFAULT_CENTER;
        const map = new Map(mapElementRef.current, {
          center: initialPosition,
          zoom: initialPositionRef.current ? 17 : 13,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        const marker = new AdvancedMarkerElement({
          map,
          position: initialPosition,
          title: 'Vị trí bất động sản',
          gmpDraggable: true,
        });

        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = new Geocoder();

        clickListener = map.addListener('click', (event) => {
          if (event.latLng) selectPosition(event.latLng);
        });
        dragListener = marker.addListener('dragend', (event) => {
          if (event.latLng) selectPosition(event.latLng);
        });

        setStatus('ready');
        setMessage('');

        if (initialPositionRef.current) {
          reverseGeocode(initialPositionRef.current);
        }
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error?.message || 'Không thể tải Google Maps.');
      }
    };

    init();

    return () => {
      cancelled = true;
      clickListener?.remove?.();
      dragListener?.remove?.();
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, [apiKey, mapId]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !selectedPosition) return;
    markerRef.current.position = selectedPosition;
  }, [selectedPosition]);

  const searchAddress = async () => {
    const cleanQuery = query.trim();
    if (!cleanQuery || !geocoderRef.current || !mapRef.current) return;

    setSearching(true);
    setMessage('');

    try {
      const response = await geocoderRef.current.geocode({
        address: cleanQuery,
        region: 'VN',
      });
      const result = response?.results?.[0];

      if (!result?.geometry?.location) {
        setMessage('Không tìm thấy địa chỉ phù hợp trên Google Maps.');
        return;
      }

      const position = {
        lat: Number(result.geometry.location.lat().toFixed(7)),
        lng: Number(result.geometry.location.lng().toFixed(7)),
      };

      mapRef.current.panTo(position);
      mapRef.current.setZoom(17);
      markerRef.current.position = position;
      setResolvedAddress(result.formatted_address || cleanQuery);
      onLocationChangeRef.current?.({
        latitude: position.lat,
        longitude: position.lng,
      });
    } catch {
      setMessage('Không thể tìm địa chỉ lúc này. Vui lòng thử lại.');
    } finally {
      setSearching(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation || !mapRef.current || !markerRef.current) {
      setMessage('Trình duyệt không hỗ trợ lấy vị trí hiện tại.');
      return;
    }

    setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = {
          lat: Number(coords.latitude.toFixed(7)),
          lng: Number(coords.longitude.toFixed(7)),
        };
        mapRef.current.panTo(position);
        mapRef.current.setZoom(17);
        markerRef.current.position = position;
        onLocationChangeRef.current?.({
          latitude: position.lat,
          longitude: position.lng,
        });
        geocoderRef.current
          ?.geocode({ location: position })
          .then((response) => {
            setResolvedAddress(response?.results?.[0]?.formatted_address || '');
          })
          .catch(() => setResolvedAddress(''));
      },
      () =>
        setMessage(
          'Không lấy được vị trí hiện tại. Hãy kiểm tra quyền vị trí của trình duyệt.',
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    searchAddress();
  };

  const canUseResolvedAddress = Boolean(
    resolvedAddress && onAddressResolvedRef.current,
  );

  return (
    <div className="property-map-picker">
      <div className="property-map-picker__heading">
        <div>
          <strong>Vị trí trên Google Maps</strong>
          <span>Tìm địa chỉ hoặc bấm trực tiếp lên bản đồ để đặt ghim.</span>
        </div>
        <a href={googleMapsSearchUrl} target="_blank" rel="noreferrer">
          Mở Google Maps
          <ExternalLink size={15} />
        </a>
      </div>

      {status === 'unconfigured' ? (
        <div className="property-map-picker__fallback">
          <Info size={20} />
          <div>
            <strong>Chưa cấu hình Google Maps cho môi trường này</strong>
            <p>
              Thêm <code>VITE_GOOGLE_MAPS_API_KEY</code> và{' '}
              <code>VITE_GOOGLE_MAPS_MAP_ID</code> vào file <code>client/.env</code>.
              Không đưa API key vào GitHub.
            </p>
            <a href={googleMapsSearchUrl} target="_blank" rel="noreferrer">
              <MapPin size={16} />
              Mở vị trí trên Google Maps
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="property-map-picker__search">
            <Search size={18} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Tìm địa chỉ trên Google Maps"
            />
            <button
              type="button"
              onClick={searchAddress}
              disabled={status !== 'ready' || searching || !query.trim()}
            >
              {searching ? (
                <LoaderCircle className="is-spinning" size={17} />
              ) : (
                <Search size={17} />
              )}
              Tìm
            </button>
            <button
              type="button"
              className="property-map-picker__locate"
              onClick={useCurrentLocation}
              disabled={status !== 'ready'}
              title="Dùng vị trí hiện tại"
            >
              <LocateFixed size={18} />
            </button>
          </div>

          <div className="property-map-picker__canvas-wrap">
            {status === 'loading' ? (
              <div className="property-map-picker__loading">
                <LoaderCircle className="is-spinning" size={24} />
                Đang tải Google Maps...
              </div>
            ) : null}
            <div ref={mapElementRef} className="property-map-picker__canvas" />
          </div>

          <div className="property-map-picker__status">
            {selectedPosition ? (
              <>
                <CheckCircle2 size={18} />
                <div>
                  <strong>Đã ghim vị trí bất động sản</strong>
                  <span>
                    {resolvedAddress ||
                      'Có thể kéo ghim để chỉnh vị trí chính xác hơn.'}
                  </span>
                </div>
                {canUseResolvedAddress ? (
                  <button
                    type="button"
                    onClick={() =>
                      onAddressResolvedRef.current?.(resolvedAddress)
                    }
                  >
                    Dùng địa chỉ này
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <MapPin size={18} />
                <span>Chưa chọn vị trí. Bấm lên bản đồ để đặt ghim.</span>
              </>
            )}
          </div>

          {message ? (
            <p className="property-map-picker__message">{message}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
