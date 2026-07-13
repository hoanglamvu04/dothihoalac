import { Clock3, Eye, MapPin, MessageCircle } from 'lucide-react';
import { formatRelativeTime, formatNumber } from '../../utils/formatters';

export default function ContentMeta({ item, compact = false }) {
  return (
    <div className={`content-meta ${compact ? 'content-meta--compact' : ''}`}>
      {item?.primaryAreaId?.name ? <span><MapPin size={14} /> {item.primaryAreaId.name}</span> : null}
      <span><Clock3 size={14} /> {formatRelativeTime(item?.publishedAt || item?.createdAt)}</span>
      {!compact ? <span><Eye size={14} /> {formatNumber(item?.viewCount)}</span> : null}
      <span><MessageCircle size={14} /> {formatNumber(item?.commentCount)}</span>
    </div>
  );
}
