import AdSlot from '../ads/AdSlot';

import './CommunityAdRails.css';

function AdRail({ side }) {
  const primary = `community_${side}_primary`;
  const secondary = `community_${side}_secondary`;

  return (
    <aside
      className={`community-ad-rail community-ad-rail--${side}`}
      aria-label={`Quảng cáo ${side === 'left' ? 'bên trái' : 'bên phải'}`}
    >
      <AdSlot slotKey={primary} layout="rail" />
      <AdSlot slotKey={secondary} layout="rail" />
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
