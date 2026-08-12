import { Link } from 'react-router-dom';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import VerifiedMark from '../common/VerifiedMark';
import ContentImage from './ContentImage';
import { COMMUNITY_TYPES } from '../../utils/constants';
import { formatRelativeTime, truncate } from '../../utils/formatters';
import { contentPath } from '../../utils/content';

export default function CommunityCard({ item }) {
  const author = item.authorId || {};
  const href = contentPath(item);

  return (
    <article className="community-card">
      <header>
        <Avatar name={author.displayName} size="sm" />
        <div>
          <Link to={author.username ? `/thanh-vien/${author.username}` : '#'}>
            {author.displayName || 'Thành viên'}
          </Link>
          <div>
            <span>{formatRelativeTime(item.publishedAt || item.createdAt)}</span>
            <VerifiedMark
              emailVerifiedAt={author.emailVerifiedAt}
              phoneVerifiedAt={author.phoneVerifiedAt}
              compact
            />
          </div>
        </div>
        <Badge tone="soft">
          {COMMUNITY_TYPES[item.community?.postType] || 'Cộng đồng'}
        </Badge>
      </header>

      <h3><Link to={href}>{item.title}</Link></h3>

      {item.summary ? <p>{truncate(item.summary, 220)}</p> : null}

      {item.thumbnailMediaId ? (
        <Link to={href}>
          <ContentImage media={item.thumbnailMediaId} alt={item.title} />
        </Link>
      ) : null}

      <footer>
        <span><ThumbsUp size={16} /> {item.reactionCount || 0}</span>
        <span><MessageCircle size={16} /> {item.commentCount || 0}</span>
        {item.primaryAreaId?.name ? <span>{item.primaryAreaId.name}</span> : null}
      </footer>
    </article>
  );
}
