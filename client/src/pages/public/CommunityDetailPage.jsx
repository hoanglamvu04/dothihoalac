import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Link, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  Copy,
  Flag,
  Heart,
  HelpCircle,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Send,
  Share2,
  Star,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Avatar from '../../components/common/Avatar';
import VerifiedMark from '../../components/common/VerifiedMark';
import ContentImage from '../../components/content/ContentImage';
import CommentsSection from '../../components/content/CommentsSection';
import ReportModal from '../../components/content/ReportModal';
import CommunityMediaLightbox from '../../components/community/CommunityMediaLightbox';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';

import { communityApi } from '../../api/content.api';
import { reactionApi } from '../../api/interaction.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { COMMUNITY_TYPES } from '../../utils/constants';
import {
  formatDateTime,
  formatRelativeTime,
} from '../../utils/formatters';

import './CommunityDetailPage.css';

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function profileAvatar(user) {
  return (
    user?.profile?.avatarMediaId ||
    user?.avatarMediaId ||
    null
  );
}

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

  append(item?.thumbnailMediaId);
  (item?.body?.inlineMediaIds || []).forEach(append);

  return result;
}

function postText(item) {
  return String(
    item?.body?.bodyText ||
      item?.summary ||
      item?.title ||
      '',
  ).trim();
}

function getCount(item, key) {
  return Number(
    item?.stats?.[key] ??
      item?.[key] ??
      0,
  );
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export default function CommunityDetailPage() {
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const articleRef = useRef(null);

  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [acceptLoadingId, setAcceptLoadingId] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(null);
  const [postMenuAnchor, setPostMenuAnchor] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [postReaction, setPostReaction] = useState(null);
  const [reactionCount, setReactionCount] = useState(0);

  useEffect(() => {
    let active = true;

    setItem(null);
    setError(null);
    setReadingProgress(0);
    setPostMenuAnchor('');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    communityApi
      .detail(slug)
      .then((result) => {
        if (!active) return;
        setItem(result);
        setPostReaction(result?.viewerReaction || null);
        setReactionCount(getCount(result, 'reactionCount'));
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!postMenuAnchor) return undefined;

    const close = (event) => {
      if (event.target?.closest?.('.community-post-menu-wrap')) return;
      setPostMenuAnchor('');
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPostMenuAnchor('');
    };

    document.addEventListener('pointerdown', close);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [postMenuAnchor]);

  const author = item?.authorId || {};
  const authorName =
    author.displayName || author.username || 'Thành viên';
  const authorLink = author.username
    ? `/thanh-vien/${encodeURIComponent(author.username)}`
    : '';

  const postType = item?.community?.postType || 'discussion';
  const postTypeLabel = COMMUNITY_TYPES[postType] || 'Cộng đồng';
  const isQuestion = postType === 'question';
  const acceptedCommentId = item?.community?.acceptedCommentId || null;
  const hasAcceptedAnswer = Boolean(acceptedCommentId);
  const isOwner = Boolean(user) && idOf(user) === idOf(author);

  const text = useMemo(() => postText(item), [item]);
  const media = useMemo(() => collectMedia(item), [item]);

  const viewCount = getCount(item, 'viewCount');
  const commentCount = getCount(item, 'commentCount');
  const publishedAt = item?.publishedAt || item?.createdAt;

  useEffect(() => {
    if (!item) return undefined;

    let frameId = null;

    const updateProgress = () => {
      if (frameId) cancelAnimationFrame(frameId);

      frameId = requestAnimationFrame(() => {
        const article = articleRef.current;
        if (!article) return;

        const top = article.getBoundingClientRect().top + window.scrollY;
        const height = article.offsetHeight;
        const start = top - 100;
        const end = top + height - window.innerHeight * 0.7;
        const distance = Math.max(end - start, 1);
        const progress = (window.scrollY - start) / distance;

        setReadingProgress(Math.min(Math.max(progress, 0), 1));
      });
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [item]);

  const handleCopyLink = useCallback(async () => {
    try {
      await copyText(window.location.href.split('#')[0]);
      setCopied(true);
      setPostMenuAnchor('');
      toast.success('Đã sao chép liên kết bài viết.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Không thể sao chép liên kết.');
    }
  }, [toast]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: item?.title,
      text: text || 'Bài viết từ Cộng đồng Hòa Lạc',
      url: window.location.href.split('#')[0],
    };

    setPostMenuAnchor('');

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (shareError) {
        if (shareError?.name !== 'AbortError') {
          toast.error('Không thể mở chức năng chia sẻ.');
        }
      }
      return;
    }

    await handleCopyLink();
  }, [handleCopyLink, item?.title, text, toast]);

  const requireLogin = useCallback(() => {
    if (isAuthenticated) return true;
    toast.info('Bạn cần đăng nhập để thực hiện thao tác này.');
    return false;
  }, [isAuthenticated, toast]);

  const toggleLike = useCallback(async () => {
    if (!item?._id || !requireLogin()) return;

    const active = Boolean(postReaction);

    try {
      if (active) {
        await reactionApi.remove('content', item._id);
      } else {
        await reactionApi.put('content', item._id, 'like');
      }

      setPostReaction(active ? null : 'like');
      setReactionCount((current) =>
        Math.max(0, current + (active ? -1 : 1)),
      );
    } catch (requestError) {
      toast.error(
        apiErrorMessage(requestError, 'Không thể cập nhật tương tác.'),
      );
    }
  }, [item?._id, postReaction, requireLogin, toast]);

  const focusReply = useCallback(() => {
    const field = document.querySelector(
      '.thread-comment-composer textarea',
    );

    if (field) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => field.focus(), 250);
    }
  }, []);

  const accept = useCallback(
    async (commentId) => {
      if (!commentId || acceptLoadingId) return;

      const confirmed = window.confirm(
        hasAcceptedAnswer
          ? 'Bạn muốn thay đổi câu trả lời hữu ích sang bình luận này?'
          : 'Chọn bình luận này làm câu trả lời hữu ích?',
      );

      if (!confirmed) return;
      setAcceptLoadingId(String(commentId));

      try {
        const response = await communityApi.acceptAnswer(
          item._id,
          commentId,
        );

        if (response?._id && response?.community) {
          setItem(response);
        } else {
          setItem((current) => ({
            ...current,
            community: response?.community || response,
          }));
        }

        toast.success('Đã chọn câu trả lời hữu ích.');
      } catch (requestError) {
        toast.error(apiErrorMessage(requestError));
      } finally {
        setAcceptLoadingId('');
      }
    },
    [acceptLoadingId, hasAcceptedAnswer, item?._id, toast],
  );

  const renderPostMenu = (anchor) => (
    <div className="community-post-menu-wrap">
      <button
        type="button"
        className="community-post-menu-trigger"
        aria-label="Tùy chọn bài viết"
        aria-expanded={postMenuAnchor === anchor}
        onClick={() =>
          setPostMenuAnchor((current) =>
            current === anchor ? '' : anchor,
          )
        }
      >
        <MoreHorizontal size={21} />
      </button>

      {postMenuAnchor === anchor ? (
        <div className="community-post-menu" role="menu">
          {isOwner ? (
            <Link
              to={`/dang-bai/cong-dong/${item._id}?edit=${item._id}`}
              onClick={() => setPostMenuAnchor('')}
            >
              <Pencil size={19} />
              Chỉnh sửa bài viết
            </Link>
          ) : null}

          <button type="button" onClick={handleCopyLink}>
            <Copy size={19} />
            {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
          </button>

          <button type="button" onClick={handleShare}>
            <Share2 size={19} />
            Chia sẻ
          </button>

          {!isOwner ? (
            <button
              type="button"
              className="is-danger"
              onClick={() => {
                setPostMenuAnchor('');
                if (requireLogin()) setReportOpen(true);
              }}
            >
              <Flag size={19} />
              Báo cáo
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (!item && !error) return <PageLoading />;

  if (error) {
    return (
      <section className="community-detail-error">
        <div className="community-detail-container">
          <ErrorState error={error} />
        </div>
      </section>
    );
  }

  return (
    <section className="community-detail-page">
      <Seo title={item.title} description={text.slice(0, 180)} />

      <div className="community-reading-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${readingProgress})` }} />
      </div>

      <div className="community-detail-container">
        <header className="community-thread-pagebar">
          <Link to="/cong-dong" aria-label="Quay lại Cộng đồng">
            <ArrowLeft size={24} />
          </Link>

          <div>
            <strong>Thread</strong>
            <span>{viewCount.toLocaleString('vi-VN')} lượt xem</span>
          </div>

          {renderPostMenu('pagebar')}
        </header>

        <main ref={articleRef} className="community-thread-shell">
          <article className="community-thread">
            <header className="community-thread__header">
              <Avatar
                src={profileAvatar(author)}
                name={authorName}
                size="md"
              />

              <div className="community-thread__identity">
                <div>
                  {authorLink ? (
                    <Link to={authorLink}>{authorName}</Link>
                  ) : (
                    <strong>{authorName}</strong>
                  )}

                  <VerifiedMark
                    compact
                    emailVerifiedAt={author.emailVerifiedAt}
                    phoneVerifiedAt={author.phoneVerifiedAt}
                  />

                  <ChevronRight size={15} className="community-thread__identity-chevron" />
                  <span className="community-thread__type-text">{postTypeLabel}</span>
                  <span className="community-thread__time" title={formatDateTime(publishedAt)}>
                    {formatRelativeTime(publishedAt)}
                  </span>
                </div>

                {item.primaryAreaId?.name || item.community?.locationText ? (
                  <p>
                    <MapPin size={13} />
                    {item.community?.locationText || item.primaryAreaId?.name}
                  </p>
                ) : null}
              </div>

              {renderPostMenu('post')}
            </header>

            <div className="community-thread__content">
              {text ? (
                <p className="community-thread__text">{text}</p>
              ) : null}

              {item.community?.rating ? (
                <div className="community-thread__rating">
                  <Star size={16} fill="currentColor" />
                  {item.community.rating}/5
                </div>
              ) : null}
            </div>

            {isQuestion ? (
              <div className={`community-thread__question${hasAcceptedAnswer ? ' is-resolved' : ''}`}>
                {hasAcceptedAnswer ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <HelpCircle size={20} />
                )}
                <div>
                  <strong>
                    {hasAcceptedAnswer
                      ? 'Đã có câu trả lời hữu ích'
                      : 'Bài viết đang chờ câu trả lời'}
                  </strong>
                  <p>
                    {hasAcceptedAnswer
                      ? 'Câu trả lời do chủ bài lựa chọn được đánh dấu trong phần phản hồi.'
                      : 'Hãy chia sẻ thông tin rõ ràng và đúng trọng tâm để hỗ trợ người đăng.'}
                  </p>
                </div>
              </div>
            ) : null}

            {media.length ? (
              <div
                className={`community-thread-media${media.length === 1 ? ' is-single' : ' is-carousel'}`}
                aria-label={`${media.length} ảnh trong bài viết`}
              >
                {media.map((image, index) => (
                  <button
                    type="button"
                    className="community-thread-media__item"
                    key={mediaKey(image) || index}
                    aria-label={`Xem ảnh ${index + 1} trong ${media.length} ảnh`}
                    onClick={() => setMediaViewerIndex(index)}
                  >
                    <ContentImage
                      media={image}
                      alt={image.altText || item.title || 'Ảnh bài viết cộng đồng'}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="community-thread__actions">
              <button
                type="button"
                className={postReaction ? 'is-active' : ''}
                aria-label="Thích bài viết"
                onClick={toggleLike}
              >
                <Heart
                  size={22}
                  fill={postReaction ? 'currentColor' : 'none'}
                />
                {reactionCount > 0 ? (
                  <span>{reactionCount.toLocaleString('vi-VN')}</span>
                ) : null}
              </button>

              <button
                type="button"
                aria-label="Bình luận"
                onClick={focusReply}
              >
                <MessageCircle size={22} />
                {commentCount > 0 ? (
                  <span>{commentCount.toLocaleString('vi-VN')}</span>
                ) : null}
              </button>

              <button
                type="button"
                aria-label="Sao chép liên kết"
                onClick={handleCopyLink}
              >
                <Repeat2 size={22} />
              </button>

              <button
                type="button"
                aria-label="Chia sẻ"
                onClick={handleShare}
              >
                <Send size={22} />
              </button>
            </div>

            <CommentsSection
              contentId={item._id}
              allowComments={item.allowComments}
              acceptedCommentId={acceptedCommentId}
              onAcceptAnswer={accept}
              isQuestionOwner={isOwner && isQuestion}
              acceptLoadingId={acceptLoadingId}
              variant="thread"
              postAuthorName={authorName}
            />
          </article>
        </main>
      </div>

      {mediaViewerIndex !== null ? (
        <CommunityMediaLightbox
          items={media}
          startIndex={mediaViewerIndex}
          title={item.title || 'Ảnh bài viết cộng đồng'}
          authorName={authorName}
          onClose={() => setMediaViewerIndex(null)}
        />
      ) : null}

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="content"
        targetId={item._id}
      />

      {readingProgress > 0.35 ? (
        <button
          type="button"
          className="community-scroll-top"
          aria-label="Quay lên đầu trang"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ChevronUp size={21} />
        </button>
      ) : null}
    </section>
  );
}
