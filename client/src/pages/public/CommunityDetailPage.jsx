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
  Check,
  CheckCircle2,
  ChevronUp,
  Copy,
  Eye,
  HelpCircle,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  Tag,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Avatar from '../../components/common/Avatar';
import VerifiedMark from '../../components/common/VerifiedMark';
import ContentImage from '../../components/content/ContentImage';
import ReactionBar from '../../components/content/ReactionBar';
import CommentsSection from '../../components/content/CommentsSection';
import CommunityMediaLightbox from '../../components/community/CommunityMediaLightbox';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';

import { communityApi } from '../../api/content.api';
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

function getTagItems(item) {
  const source = item?.tagIds || item?.tags || [];
  if (!Array.isArray(source)) return [];

  return source
    .map((tag) => {
      if (!tag) return null;
      if (typeof tag === 'string') {
        return { id: tag, name: tag };
      }

      const name = tag.name || tag.title || tag.label;
      if (!name) return null;

      return {
        id: tag._id || tag.id || tag.slug || name,
        name,
      };
    })
    .filter(Boolean);
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
  const { user } = useAuth();
  const toast = useToast();
  const articleRef = useRef(null);

  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [acceptLoadingId, setAcceptLoadingId] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(null);

  useEffect(() => {
    let active = true;

    setItem(null);
    setError(null);
    setReadingProgress(0);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    communityApi
      .detail(slug)
      .then((result) => {
        if (active) setItem(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      });

    return () => {
      active = false;
    };
  }, [slug]);

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
  const isOwner =
    Boolean(user) && idOf(user) === idOf(author);

  const text = useMemo(() => postText(item), [item]);
  const media = useMemo(() => collectMedia(item), [item]);
  const tags = useMemo(() => getTagItems(item), [item]);

  const viewCount = getCount(item, 'viewCount');
  const commentCount = getCount(item, 'commentCount');
  const reactionCount = getCount(item, 'reactionCount');
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
      await copyText(window.location.href);
      setCopied(true);
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
      url: window.location.href,
    };

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
        <nav className="community-detail-breadcrumb" aria-label="Điều hướng cộng đồng">
          <Link to="/cong-dong">
            <ArrowLeft size={17} />
            Quay lại Cộng đồng
          </Link>
        </nav>

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
                </div>

                <p title={formatDateTime(publishedAt)}>
                  {formatRelativeTime(publishedAt)}
                  {item.primaryAreaId?.name ? ` · ${item.primaryAreaId.name}` : ''}
                </p>
              </div>

              <span className="community-thread__type">{postTypeLabel}</span>
            </header>

            <div className="community-thread__content">
              {text ? (
                <p className="community-thread__text">{text}</p>
              ) : null}

              <div className="community-thread__context">
                {item.community?.locationText ? (
                  <span>
                    <MapPin size={15} />
                    {item.community.locationText}
                  </span>
                ) : null}

                {item.community?.rating ? (
                  <span>
                    <Star size={15} />
                    {item.community.rating}/5
                  </span>
                ) : null}
              </div>
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
                      ? 'Câu trả lời do chủ bài lựa chọn được đánh dấu trong phần bình luận.'
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

            <div className="community-thread__stats">
              <span>{reactionCount.toLocaleString('vi-VN')} tương tác</span>
              <span>{commentCount.toLocaleString('vi-VN')} bình luận</span>
              <span>
                <Eye size={14} />
                {viewCount.toLocaleString('vi-VN')} lượt xem
              </span>
            </div>

            <div className="community-thread__actions">
              <div className="community-thread__reaction">
                <ReactionBar content={item} />
              </div>

              <button type="button" onClick={handleShare}>
                <Share2 size={18} />
                Chia sẻ
              </button>

              <button type="button" onClick={handleCopyLink}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>

            {tags.length ? (
              <div className="community-thread__tags">
                <Tag size={15} />
                {tags.map((tag) => (
                  <span key={tag.id}>{tag.name}</span>
                ))}
              </div>
            ) : null}

            <section id="community-comments" className="community-thread-comments">
              <header>
                <MessageCircle size={20} />
                <div>
                  <h2>Bình luận</h2>
                  <p>Trao đổi đúng chủ đề và tôn trọng thành viên khác.</p>
                </div>
              </header>

              <CommentsSection
                contentId={item._id}
                allowComments={item.allowComments}
                acceptedCommentId={acceptedCommentId}
                onAcceptAnswer={accept}
                isQuestionOwner={isOwner && isQuestion}
                acceptLoadingId={acceptLoadingId}
              />
            </section>
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
