import {
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  MessageCircle,
  Send,
  Share2,
  ThumbsUp,
} from 'lucide-react';

import Avatar from '../common/Avatar';
import ContentImage from './ContentImage';
import CommunityMediaLightbox from '../community/CommunityMediaLightbox';
import { commentApi, reactionApi } from '../../api/interaction.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  COMMUNITY_TYPES,
  REACTIONS,
} from '../../utils/constants';
import { formatRelativeTime } from '../../utils/formatters';
import { contentPath } from '../../utils/content';

import './CommunityCardSocial.css';

function mediaKey(media) {
  return String(
    media?._id ||
      media?.id ||
      media?.publicId ||
      media?.secureUrl ||
      media?.url ||
      '',
  );
}

function collectMedia(item) {
  const result = [];
  const seen = new Set();

  const append = (media) => {
    if (!media) return;

    const key = mediaKey(media);
    if (!key || seen.has(key)) return;

    seen.add(key);
    result.push(media);
  };

  append(item.thumbnailMediaId);

  (item.body?.inlineMediaIds || []).forEach(append);

  return result;
}

function postText(item) {
  return String(
    item.body?.bodyText ||
      item.summary ||
      item.title ||
      '',
  ).trim();
}

function profileAvatar(user) {
  return (
    user?.profile?.avatarMediaId ||
    user?.avatarMediaId ||
    null
  );
}

function ReactionButton({
  reaction,
  onReact,
}) {
  const [open, setOpen] = useState(false);

  const current = REACTIONS.find(
    (item) => item.value === reaction,
  );

  return (
    <div
      className="community-feed-reaction"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`community-feed-action${reaction ? ' is-active' : ''}`}
        onClick={() => onReact(reaction || 'like')}
      >
        {current ? (
          <span className="community-feed-action__emoji">
            {current.emoji}
          </span>
        ) : (
          <ThumbsUp size={18} />
        )}

        <span>{current?.label || 'Thích'}</span>

        <ChevronDown
          className="community-feed-action__caret"
          size={13}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        />
      </button>

      {open ? (
        <div className="community-feed-reaction-picker">
          {REACTIONS.map((item) => (
            <button
              type="button"
              key={item.value}
              className={reaction === item.value ? 'is-active' : ''}
              title={item.label}
              onClick={() => {
                onReact(item.value);
                setOpen(false);
              }}
            >
              <span>{item.emoji}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CommunityCard({ item }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const commentInputRef = useRef(null);

  const author = item.authorId || {};
  const href = contentPath(item);

  const media = useMemo(
    () => collectMedia(item),
    [item],
  );

  const text = useMemo(
    () => postText(item),
    [item],
  );

  const [expanded, setExpanded] = useState(false);
  const [reaction, setReaction] = useState(
    item.viewerReaction || null,
  );
  const [reactionCount, setReactionCount] = useState(
    Number(item.reactionCount || 0),
  );
  const [commentCount, setCommentCount] = useState(
    Number(item.commentCount || 0),
  );
  const [comments, setComments] = useState(
    item.commentPreview || [],
  );
  const [commentBody, setCommentBody] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(null);

  const authorName =
    author.displayName ||
    author.username ||
    'Thành viên';

  const typeLabel =
    COMMUNITY_TYPES[item.community?.postType] ||
    'Cộng đồng';

  const isLong = text.length > 650;
  const visibleText =
    expanded || !isLong
      ? text
      : `${text.slice(0, 650).trim()}…`;

  const requireLogin = () => {
    if (isAuthenticated) return true;

    toast.info('Bạn cần đăng nhập để thực hiện thao tác này.');
    return false;
  };

  const react = async (type) => {
    if (!requireLogin()) return;

    try {
      if (reaction === type) {
        await reactionApi.remove('content', item._id);
        setReaction(null);
        setReactionCount((value) => Math.max(0, value - 1));
        return;
      }

      await reactionApi.put('content', item._id, type);
      setReactionCount((value) => (reaction ? value : value + 1));
      setReaction(type);
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Không thể cập nhật cảm xúc.'),
      );
    }
  };

  const focusComment = () => {
    if (!requireLogin()) return;
    commentInputRef.current?.focus();
  };

  const submitComment = async (event) => {
    event.preventDefault();

    if (!requireLogin()) return;

    const body = commentBody.trim();
    if (!body || commenting) return;

    setCommenting(true);

    try {
      const created = await commentApi.create(item._id, {
        body,
        parentId: null,
      });

      const preview = {
        ...created,
        body: created?.body || body,
        createdAt: created?.createdAt || new Date().toISOString(),
        userId: created?.userId || {
          _id: user?._id || user?.id,
          username: user?.username,
          displayName:
            user?.displayName ||
            user?.profile?.displayName ||
            user?.username ||
            'Thành viên',
          profile: user?.profile || null,
        },
      };

      setComments((current) => [preview, ...current].slice(0, 2));
      setCommentCount((value) => value + 1);
      setCommentBody('');
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Không thể đăng bình luận.'),
      );
    } finally {
      setCommenting(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}${href}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title || 'Bài viết cộng đồng',
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success('Đã sao chép liên kết.');
    } catch {
      // Người dùng có thể chủ động đóng hộp chia sẻ.
    }
  };

  return (
    <article className="community-card community-card--social">
      <header className="community-feed-card__header">
        <Avatar
          src={profileAvatar(author)}
          name={authorName}
          size="sm"
        />

        <div className="community-feed-card__author">
          <Link
            to={
              author.username
                ? `/thanh-vien/${author.username}`
                : href
            }
          >
            {authorName}
          </Link>

          <div>
            <span>
              {formatRelativeTime(item.publishedAt || item.createdAt)}
            </span>
            {item.primaryAreaId?.name ? (
              <>
                <span>·</span>
                <span>{item.primaryAreaId.name}</span>
              </>
            ) : null}
          </div>
        </div>

        <span className="community-feed-card__type">
          {typeLabel}
        </span>
      </header>

      {text ? (
        <div className="community-feed-card__text">
          <p>{visibleText}</p>

          {isLong ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          ) : null}
        </div>
      ) : null}

      {media.length ? (
        <div
          className={`community-feed-media community-feed-media--${Math.min(
            media.length,
            4,
          )}`}
          aria-label={`${media.length} ảnh trong bài viết`}
        >
          {media.slice(0, 4).map((image, index) => (
            <button
              type="button"
              className="community-feed-media__item"
              key={mediaKey(image) || index}
              aria-label={`Xem ảnh ${index + 1} trong ${media.length} ảnh`}
              onClick={() => setMediaViewerIndex(index)}
            >
              <ContentImage
                media={image}
                alt={
                  image.altText ||
                  item.title ||
                  'Ảnh bài viết cộng đồng'
                }
              />

              {index === 3 && media.length > 4 ? (
                <span className="community-feed-media__more">
                  +{media.length - 4}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="community-feed-card__stats">
        <span>
          {reactionCount > 0 ? (
            <>
              <b>👍</b>
              {reactionCount.toLocaleString('vi-VN')}
            </>
          ) : null}
        </span>

        <Link to={`${href}#binh-luan`}>
          {commentCount > 0
            ? `${commentCount.toLocaleString('vi-VN')} bình luận`
            : ''}
        </Link>
      </div>

      <div className="community-feed-card__actions">
        <ReactionButton
          reaction={reaction}
          onReact={react}
        />

        <button
          type="button"
          className="community-feed-action"
          onClick={focusComment}
        >
          <MessageCircle size={18} />
          Bình luận
        </button>

        <button
          type="button"
          className="community-feed-action"
          onClick={share}
        >
          <Share2 size={18} />
          Chia sẻ
        </button>
      </div>

      {commentCount > comments.length && comments.length ? (
        <Link
          className="community-feed-card__more-comments"
          to={`${href}#binh-luan`}
        >
          Xem thêm {commentCount - comments.length} bình luận
        </Link>
      ) : null}

      {comments.length ? (
        <div className="community-feed-comments">
          {comments.map((comment) => {
            const name =
              comment.userId?.displayName ||
              comment.userId?.username ||
              'Thành viên';

            return (
              <article
                className="community-feed-comment"
                key={comment._id}
              >
                <Avatar
                  src={profileAvatar(comment.userId)}
                  name={name}
                  size="xs"
                />

                <div className="community-feed-comment__bubble">
                  <strong>{name}</strong>
                  <p>{comment.body}</p>
                  <footer>
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                    <Link to={`${href}#binh-luan`}>Trả lời</Link>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <form
        className="community-feed-comment-box"
        onSubmit={submitComment}
      >
        <Avatar
          src={profileAvatar(user)}
          name={
            user?.displayName ||
            user?.profile?.displayName ||
            user?.username ||
            'Bạn'
          }
          size="xs"
        />

        <div>
          <input
            ref={commentInputRef}
            value={commentBody}
            readOnly={!isAuthenticated}
            maxLength={5000}
            placeholder={
              isAuthenticated
                ? 'Viết bình luận...'
                : 'Đăng nhập để bình luận'
            }
            onClick={() => {
              if (!isAuthenticated) requireLogin();
            }}
            onChange={(event) => setCommentBody(event.target.value)}
          />

          {commentBody.trim() ? (
            <button
              type="submit"
              disabled={commenting}
              aria-label="Đăng bình luận"
            >
              <Send size={16} />
            </button>
          ) : null}
        </div>
      </form>

      {mediaViewerIndex !== null ? (
        <CommunityMediaLightbox
          items={media}
          startIndex={mediaViewerIndex}
          title={item.title || 'Ảnh bài viết cộng đồng'}
          authorName={authorName}
          onClose={() => setMediaViewerIndex(null)}
        />
      ) : null}
    </article>
  );
}
