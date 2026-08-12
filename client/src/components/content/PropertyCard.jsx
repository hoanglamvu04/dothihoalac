import { Link } from 'react-router-dom';
import { MapPin, Maximize2 } from 'lucide-react';
import ContentImage from './ContentImage';
import Badge from '../common/Badge';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { OWNER_TYPES, PROPERTY_TYPES, TRANSACTION_TYPES } from '../../utils/constants';
import { contentPath } from '../../utils/content';

export default function PropertyCard({ item }) {
  const property = item.property || {};
  const href = contentPath(item);

  return (
    <article className="property-card">
      <Link to={href} className="property-card__image">
        <ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="property" />
        <div className="property-card__badges">
          <Badge tone="accent">{TRANSACTION_TYPES[property.transactionType] || 'Nhà đất'}</Badge>
          <Badge tone="dark">{OWNER_TYPES[property.ownerType] || 'Tin đăng'}</Badge>
        </div>
      </Link>

      <div className="property-card__body">
        <h3><Link to={href}>{item.title}</Link></h3>
        <strong className="property-card__price">
          {formatCurrency(property.price, property.priceUnit)}
        </strong>
        <div className="property-card__facts">
          <span><Maximize2 size={16} /> {formatNumber(property.landArea)} m²</span>
          <span>{PROPERTY_TYPES[property.propertyType] || 'Bất động sản'}</span>
        </div>
        <p><MapPin size={16} /> {item.primaryAreaId?.name || property.addressText || 'Hòa Lạc'}</p>
      </div>
    </article>
  );
}
