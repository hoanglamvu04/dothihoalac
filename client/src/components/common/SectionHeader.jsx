import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function SectionHeader({ eyebrow, title, description, to, linkLabel = 'Xem tất cả' }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {to ? (
        <Link to={to}>
          {linkLabel} <ArrowRight size={17} />
        </Link>
      ) : null}
    </div>
  );
}
