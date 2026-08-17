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
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from '../../utils/constants';
import { contentPath } from '../../utils/content';

function compactSummary(item) {
  return String(item?.summary || item?.body?.bodyText || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function PropertyCard({ item }) {
  const property = item.property || {};
  const href = contentPath(item);
  const summary = compactSummary(item);
  const location = item.primaryAreaId?.name || property.addressText || 'Hòa Lạc';

  return (
    <article className="property-card">
      <Link to={href} className="property-card__image" aria-label={`Xem ${item.title}`}>
        <ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="property" />
        <div className="property-card__badges">
          <Badge tone="accent">
            {TRANSACTION_TYPES[property.transactionType] || 'Bất động sản'}
          </Badge>
          <Badge tone="dark">
            {OWNER_TYPES[property.ownerType] || 'Tin đăng'}
          </Badge>
        </div>
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
          <span>{PROPERTY_TYPES[property.propertyType] || 'Bất động sản'}</span>
        </div>

        <p className="property-card__location">
          <MapPin size={16} />
          <span>{location}</span>
        </p>

        {summary ? (
          <p className="property-card__summary">{summary}</p>
        ) : null}

        <div className="property-card__footer">
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

          <Link to={href}>Xem chi tiết</Link>
        </div>
      </div>
    </article>
  );
}
