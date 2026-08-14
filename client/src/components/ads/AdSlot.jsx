import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

import { systemApi } from '../../api/system.api';
import { mediaUrl } from '../../utils/media';

import './AdSlot.css';

function currentDevice() {
  if (typeof window === 'undefined') return 'desktop';
  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
}

export default function AdSlot({
  slotKey,
  layout = 'inline',
  className = '',
}) {
  const [device, setDevice] = useState(currentDevice);
  const [ad, setAd] = useState(null);
  const impressionRef = useRef('');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setDevice(media.matches ? 'mobile' : 'desktop');
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    let active = true;

    if (!slotKey) {
      setAd(null);
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
  }, [device, slotKey]);

  useEffect(() => {
    const id = String(ad?._id || '');
    if (!id || impressionRef.current === id) return;

    impressionRef.current = id;
    systemApi.bannerImpression(id).catch(() => {});
  }, [ad]);

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
