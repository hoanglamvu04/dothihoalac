import { Link } from 'react-router-dom';
import Badge from '../common/Badge';
import ContentMeta from './ContentMeta';
import { contentPath, contentTypeLabel } from '../../utils/content';
import { CONTENT_STATUS } from '../../utils/constants';
import { truncate } from '../../utils/formatters';

export default function GenericContentCard({ item, showStatus = false, actions }) {
  const href = contentPath(item);

  return (
    <article className="generic-content-card">
      <div>
        <div className="content-card__labels">
          <Badge tone="primary">{contentTypeLabel(item.contentType)}</Badge>
          {showStatus ? (
            <Badge tone="soft">{CONTENT_STATUS[item.status] || item.status}</Badge>
          ) : null}
        </div>
        <h3><Link to={href}>{item.title}</Link></h3>
        {item.summary ? <p>{truncate(item.summary, 220)}</p> : null}
        <ContentMeta item={item} />
      </div>
      {actions ? <div className="generic-content-card__actions">{actions}</div> : null}
    </article>
  );
}
