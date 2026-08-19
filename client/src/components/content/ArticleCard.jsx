import { Link } from 'react-router-dom';
import ContentImage from './ContentImage';
import ContentMeta from './ContentMeta';
import Badge from '../common/Badge';
import { truncate } from '../../utils/formatters';
import { contentPath } from '../../utils/content';

export default function ArticleCard({ item, featured = false }) {
  const href = contentPath(item);

  return (
    <article className={`content-card article-card ${featured ? 'article-card--featured' : ''}`}>
      <Link to={href}>
        <ContentImage
          media={item.thumbnailMediaId}
          alt={item.title}
          ratio={featured ? 'hero' : 'wide'}
          loading={featured ? 'eager' : 'lazy'}
          fetchPriority={featured ? 'high' : undefined}
          sizes={featured ? '(max-width: 900px) 100vw, 760px' : '(max-width: 720px) 100vw, 420px'}
        />
      </Link>
      <div className="content-card__body">
        <div className="content-card__labels">
          <Badge tone="primary">{item.primaryCategoryId?.name || 'Tin Hòa Lạc'}</Badge>
          {item.isSponsored ? <Badge tone="warning">Tài trợ</Badge> : null}
        </div>
        <h3><Link to={href}>{item.title}</Link></h3>
        {item.summary ? <p>{truncate(item.summary, featured ? 220 : 135)}</p> : null}
        <ContentMeta item={item} compact={!featured} />
      </div>
    </article>
  );
}
