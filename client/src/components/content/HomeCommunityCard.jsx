import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MessageCircle,
  ThumbsUp,
} from 'lucide-react';

import Avatar from '../common/Avatar';
import ContentImage from './ContentImage';
import { COMMUNITY_TYPES } from '../../utils/constants';
import { formatRelativeTime } from '../../utils/formatters';
import { contentPath } from '../../utils/content';

import './HomeCommunityCard.css';

function profileAvatar(user) {
  return (
    user?.profile?.avatarMediaId ||
    user?.avatarMediaId ||
    null
  );
}

function postText(item) {
  return String(
    item?.body?.bodyText ||
      item?.summary ||
      item?.title ||
      '',
  ).trim();
}

function firstMedia(item) {
  return (
    item?.thumbnailMediaId ||
    item?.body?.inlineMediaIds?.[0] ||
    null
  );
}

export default function HomeCommunityCard({ item }) {
  const author = item?.authorId || {};
  const href = contentPath(item);
  const text = postText(item);
  const media = firstMedia(item);
  const authorName =
    author.displayName ||
    author.username ||
    'Thành viên';
  const typeLabel =
    COMMUNITY_TYPES[item?.community?.postType] ||
    'Cộng đồng';
  const isLong = text.length > 185;
  const excerpt = isLong
    ? `${text.slice(0, 185).trim()}…`
    : text;

  return (
    <article className="home-community-card">
      <header className="home-community-card__header">
        <Avatar
          src={profileAvatar(author)}
          name={authorName}
          size="sm"
        />

        <div className="home-community-card__author">
          <Link
            to={
              author.username
                ? `/thanh-vien/${author.username}`
                : href
            }
          >
            {authorName}
          </Link>
          <span>
            {formatRelativeTime(
              item?.publishedAt || item?.createdAt,
            )}
          </span>
        </div>

        <span className="home-community-card__type">
          {typeLabel}
        </span>
      </header>

      <div className="home-community-card__content">
        <p>{excerpt}</p>
        {isLong ? (
          <Link
            className="home-community-card__more"
            to={href}
          >
            Xem thêm
          </Link>
        ) : null}
      </div>

      {media ? (
        <Link
          className="home-community-card__media"
          to={href}
          aria-label={`Xem bài của ${authorName}`}
        >
          <ContentImage
            media={media}
            alt={
              media.altText ||
              item?.title ||
              'Ảnh bài viết cộng đồng'
            }
          />
        </Link>
      ) : (
        <Link
          className="home-community-card__media home-community-card__media--empty"
          to={href}
        >
          <span>Đọc bài viết</span>
          <ArrowRight size={17} />
        </Link>
      )}

      <footer className="home-community-card__footer">
        <span>
          <ThumbsUp size={15} />
          {Number(item?.reactionCount || 0).toLocaleString('vi-VN')}
        </span>

        <Link to={`${href}#binh-luan`}>
          <MessageCircle size={15} />
          {Number(item?.commentCount || 0).toLocaleString('vi-VN')}
        </Link>
      </footer>
    </article>
  );
}
