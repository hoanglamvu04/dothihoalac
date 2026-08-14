import { ArrowRight, MessageCircle, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import Avatar from '../common/Avatar';
import { COMMUNITY_TYPES } from '../../utils/constants';
import { contentPath } from '../../utils/content';
import { formatRelativeTime } from '../../utils/formatters';
import { mediaUrl } from '../../utils/media';

import './HomeCommunityCard.css';

function avatarMedia(user) {
  return user?.profile?.avatarMediaId || user?.avatarMediaId || null;
}

function firstMedia(item) {
  return item?.thumbnailMediaId || item?.body?.inlineMediaIds?.[0] || null;
}

function excerpt(item) {
  const value = String(
    item?.body?.bodyText ||
      item?.summary ||
      item?.title ||
      '',
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (!value) return 'Mở bài viết để xem nội dung chia sẻ từ cộng đồng.';
  return value;
}

export default function HomeCommunityCard({ item }) {
  const author = item?.authorId || {};
  const authorName = author.displayName || author.username || 'Thành viên';
  const image = firstMedia(item);
  const imageSrc = mediaUrl(image);
  const href = contentPath(item);
  const typeLabel = COMMUNITY_TYPES[item?.community?.postType] || 'Cộng đồng';
  const text = excerpt(item);

  return (
    <Link className="home-community-card" to={href} aria-label={`Mở bài viết: ${item?.title || text}`}>
      <div className="home-community-card__body">
        <header className="home-community-card__author">
          <Avatar
            src={avatarMedia(author)}
            name={authorName}
            size="xs"
          />

          <div>
            <strong>{authorName}</strong>
            <span>
              {formatRelativeTime(item?.publishedAt || item?.createdAt)}
              {item?.primaryAreaId?.name ? ` · ${item.primaryAreaId.name}` : ''}
            </span>
          </div>

          <small>{typeLabel}</small>
        </header>

        <p>{text}</p>

        <footer className="home-community-card__footer">
          <span>
            <ThumbsUp size={14} />
            {Number(item?.reactionCount || 0).toLocaleString('vi-VN')}
          </span>
          <span>
            <MessageCircle size={14} />
            {Number(item?.commentCount || 0).toLocaleString('vi-VN')}
          </span>
          <b>
            Xem bài
            <ArrowRight size={14} />
          </b>
        </footer>
      </div>

      {imageSrc ? (
        <div className="home-community-card__media">
          <img
            src={imageSrc}
            alt={image?.altText || item?.title || 'Ảnh bài viết cộng đồng'}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
    </Link>
  );
}
