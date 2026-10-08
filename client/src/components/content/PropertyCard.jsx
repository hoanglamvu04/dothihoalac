import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bath,
  BedDouble,
  MapPin,
  Maximize2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import ContentImage from './ContentImage';
import Badge from '../common/Badge';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  LEGAL_STATUS,
  OWNER_TYPES,
  TRANSACTION_TYPES,
} from '../../utils/constants';
import { getPropertyTypeLabel } from '../../utils/propertyPosting';
import { contentPath } from '../../utils/content';
import './PropertyCard.css';

function compactSummary(item) {
  return String(item?.summary || item?.body?.bodyText || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMediaKey(media, index) {
  if (!media) return `media-${index}`;
  if (typeof media === 'string') return media;
  return String(media._id || media.id || media.url || media.secureUrl || `media-${index}`);
}

function buildGallery(item) {
  const property = item?.property || {};
  const source = [
    item?.thumbnailMediaId,
    ...(Array.isArray(item?.mediaIds) ? item.mediaIds : []),
    ...(Array.isArray(property?.mediaIds) ? property.mediaIds : []),
    ...(Array.isArray(property?.galleryMediaIds) ? property.galleryMediaIds : []),
  ].filter(Boolean);

  const seen = new Set();
  return source.filter((media, index) => {
    const key = getMediaKey(media, index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function PropertyCard({ item }) {
  const property = item.property || {};
  const href = contentPath(item);
  const summary = compactSummary(item);
  const location = item.primaryAreaId?.name || property.addressText || 'Hòa Lạc';
  const gallery = useMemo(() => buildGallery(item), [item]);
  const [activeImage, setActiveImage] = useState(0);
  const touchRef = useRef({ startX: 0, startY: 0, swiped: false });
  const activeMedia = gallery[activeImage] || item.thumbnailMediaId;

  const moveImage = (direction) => {
    if (gallery.length <= 1) return;
    setActiveImage((current) => {
      const next = current + direction;
      if (next < 0) return gallery.length - 1;
      if (next >= gallery.length) return 0;
      return next;
    });
  };

  const onTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchRef.current = { startX: touch.clientX, startY: touch.clientY, swiped: false };
  };

  const onTouchEnd = (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const dx = touch.clientX - touchRef.current.startX;
    const dy = touch.clientY - touchRef.current.startY;

    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      touchRef.current.swiped = true;
      moveImage(dx < 0 ? 1 : -1);
    }
  };

  const preventSwipeNavigation = (event) => {
    if (!touchRef.current.swiped) return;
    event.preventDefault();
    touchRef.current.swiped = false;
  };

  return (
    <article className="property-card">
      <Link
        to={href}
        className="property-card__image"
        aria-label={`Xem ${item.title}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={preventSwipeNavigation}
      >
        <ContentImage media={activeMedia} alt={`${item.title} - ảnh ${activeImage + 1}`} ratio="property" />
        <div className="property-card__badges">
          <Badge tone="accent" className="property-card__badge--transaction">
            {TRANSACTION_TYPES[property.transactionType] || 'Bất động sản'}
          </Badge>
          <Badge tone="dark" className="property-card__badge--owner">
            {OWNER_TYPES[property.ownerType] || 'Tin đăng'}
          </Badge>
        </div>

        {gallery.length > 1 ? (
          <>
            <div className="property-card__image-count" aria-hidden="true">
              {activeImage + 1}/{gallery.length}
            </div>
            <div className="property-card__dots" aria-hidden="true">
              {gallery.slice(0, 6).map((media, index) => (
                <span
                  key={getMediaKey(media, index)}
                  className={index === activeImage ? 'is-active' : ''}
                />
              ))}
            </div>
          </>
        ) : null}
      </Link>

      <div className="property-card__body">
        <div className="property-card__heading">
          <h3><Link to={href}>{item.title}</Link></h3>
          <strong className="property-card__price">
            {formatCurrency(property.price, property.priceUnit)}
          </strong>
        </div>

        <div className="property-card__facts">
          <span><Maximize2 size={16} /> {formatNumber(property.landArea)} m²</span>
          {property.bedrooms !== null && property.bedrooms !== undefined ? (
            <span><BedDouble size={16} /> {property.bedrooms} PN</span>
          ) : null}
          {property.bathrooms !== null && property.bathrooms !== undefined ? (
            <span><Bath size={16} /> {property.bathrooms} WC</span>
          ) : null}
          <span>{getPropertyTypeLabel(property.propertyType)}</span>
        </div>

        <p className="property-card__location">
          <MapPin size={16} />
          <span>{location}</span>
        </p>

        {summary ? (
          <p className="property-card__summary">{summary}</p>
        ) : null}

        <div className="property-card__footer property-card__footer--aligned">
          <div className="property-card__footer-meta">
            <span>
              <UserRound size={15} />
              {property.contactName || OWNER_TYPES[property.ownerType] || 'Người đăng'}
            </span>

            {property.legalStatus && property.legalStatus !== 'unknown' ? (
              <span>
                <ShieldCheck size={15} />
                {LEGAL_STATUS[property.legalStatus] || 'Thông tin pháp lý'}
              </span>
            ) : null}
          </div>

          <Link to={href} className="property-card__detail-link">Xem chi tiết</Link>
        </div>
      </div>
    </article>
  );
}
