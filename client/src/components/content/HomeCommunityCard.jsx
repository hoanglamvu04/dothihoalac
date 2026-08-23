import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MessageCircle,
  ThumbsUp,
} from 'lucide-react';

import Avatar from '../common/Avatar';
import ContentImage from './ContentImage';
import { reactionApi } from '../../api/interaction.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
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
  const { isAuthenticated } = useAuth();
  const toast = useToast();

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
  const excerpt =
    text.length > 150
      ? `${text.slice(0, 150).trim()}…`
      : text;

  const [reaction, setReaction] = useState(
    item?.viewerReaction || null,
  );
  const [reactionCount, setReactionCount] = useState(
    Number(item?.reactionCount || 0),
  );
  const [reacting, setReacting] = useState(false);

  const toggleLike = async () => {
    if (!isAuthenticated) {
      toast.info('Bạn cần đăng nhập để thích bài viết.');
      return;
    }

    if (reacting || !item?._id) {
      return;
    }

    setReacting(true);

    try {
      if (reaction === 'like') {
        await reactionApi.remove('content', item._id);
        setReaction(null);
        setReactionCount((value) => Math.max(0, value - 1));
        return;
      }

      await reactionApi.put('content', item._id, 'like');
      setReactionCount((value) => (reaction ? value : value + 1));
      setReaction('like');
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Không thể cập nhật lượt thích.'),
      );
    } finally {
      setReacting(false);
    }
  };

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
        <Link
          className="home-community-card__content-link"
          to={href}
          aria-label={`Xem bài viết: ${item?.title || excerpt || 'Bài cộng đồng'}`}
        >
          <p>{excerpt}</p>
        </Link>
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
        <button
          type="button"
          className={[
            'home-community-card__like',
            reaction === 'like' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={reacting}
          aria-pressed={reaction === 'like'}
          aria-label={
            reaction === 'like'
              ? 'Bỏ thích bài viết'
              : 'Thích bài viết'
          }
          onClick={toggleLike}
        >
          <ThumbsUp size={15} />
          <span>{reactionCount.toLocaleString('vi-VN')}</span>
        </button>

        <Link to={`${href}#binh-luan`}>
          <MessageCircle size={15} />
          {Number(item?.commentCount || 0).toLocaleString('vi-VN')}
        </Link>
      </footer>
    </article>
  );
}
