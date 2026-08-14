import { Megaphone } from 'lucide-react';

import { COMMUNITY_AD_RAILS } from '../../config/communityAds';

import './CommunityAdRails.css';

function AdSlot({ slot }) {
  const content = slot.imageUrl ? (
    <img
      src={slot.imageUrl}
      alt={slot.alt || slot.title || 'Quảng cáo'}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div className="community-ad-slot__placeholder">
      <span className="community-ad-slot__icon">
        <Megaphone size={18} />
      </span>
      <small>{slot.label || 'Quảng cáo'}</small>
      <strong>{slot.title || 'Vị trí banner'}</strong>
      <span>{slot.size}</span>
    </div>
  );

  const className = [
    'community-ad-slot',
    `community-ad-slot--${slot.variant || 'square'}`,
    slot.imageUrl ? 'has-image' : 'is-empty',
  ]
    .filter(Boolean)
    .join(' ');

  if (slot.href) {
    return (
      <a
        className={className}
        href={slot.href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={slot.alt || slot.title || 'Mở quảng cáo'}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={className} aria-label={slot.alt || slot.title || 'Vị trí quảng cáo'}>
      {content}
    </div>
  );
}

function AdRail({ side }) {
  const slots = COMMUNITY_AD_RAILS[side] || [];

  return (
    <aside
      className={`community-ad-rail community-ad-rail--${side}`}
      aria-label={`Quảng cáo ${side === 'left' ? 'bên trái' : 'bên phải'}`}
    >
      {slots.map((slot) => (
        <AdSlot key={slot.id} slot={slot} />
      ))}
    </aside>
  );
}

export default function CommunityAdRails() {
  return (
    <div className="community-ad-rails" aria-label="Khu vực quảng cáo">
      <AdRail side="left" />
      <AdRail side="right" />
    </div>
  );
}
