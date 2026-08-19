import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

import { systemApi } from '../../api/system.api';
import { mediaUrl } from '../../utils/media';

import './AdSlot.css';

function currentDevice() {
  if (typeof window === 'undefined') return 'desktop';
  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
}

function supportsIntersectionObserver() {
  return typeof window !== 'undefined' && 'IntersectionObserver' in window;
}

export default function AdSlot({
  slotKey,
  layout = 'inline',
  className = '',
}) {
  const [device, setDevice] = useState(currentDevice);
  const [ad, setAd] = useState(null);
  const [shouldLoad, setShouldLoad] = useState(() => !supportsIntersectionObserver());
  const impressionRef = useRef('');
  const anchorRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setDevice(media.matches ? 'mobile' : 'desktop');
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (shouldLoad || !slotKey || !supportsIntersectionObserver()) {
      return undefined;
    }

    const node = anchorRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        // Tải trước một đoạn để banner sẵn sàng trước khi người dùng cuộn tới,
        // nhưng không tạo request cho footer/quảng cáo rất xa viewport lúc mở trang.
        rootMargin: '700px 0px',
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad, slotKey]);

  useEffect(() => {
    let active = true;

    if (!slotKey || !shouldLoad) {
      if (!slotKey) setAd(null);
      return undefined;
    }

    systemApi
      .banners(slotKey, device, 1)
      .then((items) => {
        if (!active) return;
        setAd(Array.isArray(items) && items.length ? items[0] : null);
      })
      .catch(() => {
        if (active) setAd(null);
      });

    return () => {
      active = false;
    };
  }, [device, shouldLoad, slotKey]);

  useEffect(() => {
    const id = String(ad?._id || '');
    if (!id || impressionRef.current === id) return;

    impressionRef.current = id;
    systemApi.bannerImpression(id).catch(() => {});
  }, [ad]);

  if (!shouldLoad) {
    return (
      <span
        ref={anchorRef}
        aria-hidden="true"
        data-ad-slot-anchor={slotKey}
        style={{ display: 'block', width: '100%', height: 1, pointerEvents: 'none' }}
      />
    );
  }

  if (!ad) return null;

  const image = mediaUrl(ad.imageMediaId);
  const hasText = Boolean(ad.headline || ad.description || ad.ctaLabel);
  const creativeType = ad.creativeType || (image && hasText ? 'image_text' : image ? 'image' : 'text');
  const showImage = creativeType !== 'text' && Boolean(image);
  const showText = creativeType !== 'image' && hasText;

  if (!showImage && !showText) return null;

  const content = (
    <>
      <span className="ad-slot__sponsored">Quảng cáo</span>

      {showImage ? (
        <div className="ad-slot__media">
          <img
            src={image}
            alt={ad.imageMediaId?.altText || ad.headline || ad.title || 'Quảng cáo'}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}

      {showText ? (
        <div className="ad-slot__copy">
          {ad.headline ? <strong>{ad.headline}</strong> : null}
          {ad.description ? <p>{ad.description}</p> : null}
          {ad.ctaLabel ? (
            <span className="ad-slot__cta">
              {ad.ctaLabel}
              <ArrowUpRight size={14} />
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const classes = [
    'ad-slot',
    `ad-slot--${layout}`,
    `ad-slot--${creativeType}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!ad.targetUrl) {
    return (
      <div className={classes} data-ad-slot={slotKey}>
        {content}
      </div>
    );
  }

  return (
    <a
      className={classes}
      href={ad.targetUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      data-ad-slot={slotKey}
      onClick={() => systemApi.bannerClick(ad._id).catch(() => {})}
    >
      {content}
    </a>
  );
}
