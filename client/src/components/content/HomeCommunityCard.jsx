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

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function communityCopy(item) {
  const title = cleanText(item?.title);
  const body = cleanText(item?.body?.bodyText || item?.summary);
  const fallback = 'Mở bài viết để xem nội dung chia sẻ từ cộng đồng.';

  return {
    title: title || body || fallback,
    excerpt: body && body !== title ? body : '',
  };
}

export default function HomeCommunityCard({ item }) {
  const author = item?.authorId || {};
  const authorName = author.displayName || author.username || 'Thành viên';
  const image = firstMedia(item);
  const imageSrc = mediaUrl(image);
  const href = contentPath(item);
  const typeLabel = COMMUNITY_TYPES[item?.community?.postType] || 'Cộng đồng';
  const copy = communityCopy(item);
  const cardClassName = [
    'home-community-card',
    imageSrc ? 'home-community-card--with-media' : 'home-community-card--text-only',
  ].join(' ');

  return (
    <Link
      className={cardClassName}
      to={href}
      aria-label={`Mở bài viết: ${copy.title}`}
    >
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

        <div className="home-community-card__copy">
          <h3>{copy.title}</h3>
          {copy.excerpt ? <p>{copy.excerpt}</p> : null}
        </div>

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
