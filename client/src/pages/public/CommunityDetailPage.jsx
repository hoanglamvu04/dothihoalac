import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronUp,
  Clock3,
  Copy,
  Eye,
  HelpCircle,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Share2,
  ShieldCheck,
  Star,
  Tag,
  UserRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import VerifiedMark from '../../components/common/VerifiedMark';
import ContentImage from '../../components/content/ContentImage';
import ArticleBody from '../../components/content/ArticleBody';
import ReactionBar from '../../components/content/ReactionBar';
import CommentsSection from '../../components/content/CommentsSection';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';

import { communityApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import { COMMUNITY_TYPES } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

import './CommunityDetailPage.css';

const POST_TYPE_ICONS = {
  question: HelpCircle,
  discussion: MessagesSquare,
  sharing: Share2,
  report: ShieldCheck,
  announcement: MessageCircle,
};

function getAuthorId(author) {
  return String(
    author?._id ||
      author?.id ||
      '',
  );
}

function getUserId(user) {
  return String(
    user?._id ||
      user?.id ||
      '',
  );
}

function getViewCount(item) {
  return Number(
    item?.stats?.viewCount ??
      item?.viewCount ??
      0,
  );
}

function getCommentCount(item) {
  return Number(
    item?.stats?.commentCount ??
      item?.commentCount ??
      item?.commentsCount ??
      0,
  );
}

function getReactionCount(item) {
  return Number(
    item?.stats?.reactionCount ??
      item?.reactionCount ??
      0,
  );
}

function getCategoryValue(category) {
  if (!category) {
    return '';
  }

  if (typeof category === 'string') {
    return category;
  }

  return (
    category.slug ||
    category._id ||
    category.id ||
    ''
  );
}

function getAreaValue(area) {
  if (!area) {
    return '';
  }

  if (typeof area === 'string') {
    return area;
  }

  return (
    area.slug ||
    area._id ||
    area.id ||
    ''
  );
}

function getTagItems(item) {
  const tags =
    item?.tagIds ||
    item?.tags ||
    [];

  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => {
      if (!tag) {
        return null;
      }

      if (typeof tag === 'string') {
        return {
          id: tag,
          name: tag,
        };
      }

      const name =
        tag.name ||
        tag.title ||
        tag.label;

      if (!name) {
        return null;
      }

      return {
        id:
          tag._id ||
          tag.id ||
          tag.slug ||
          name,

        name,
      };
    })
    .filter(Boolean);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(
      value,
    );

    return;
  }

  const textarea =
    document.createElement('textarea');

  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(
    textarea,
  );

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

  const [item, setItem] =
    useState(null);

  const [error, setError] =
    useState(null);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    acceptLoadingId,
    setAcceptLoadingId,
  ] = useState('');

  const [
    readingProgress,
    setReadingProgress,
  ] = useState(0);

  useEffect(() => {
    let active = true;

    setItem(null);
    setError(null);
    setReadingProgress(0);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });

    communityApi
      .detail(slug)
      .then((result) => {
        if (active) {
          setItem(result);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError);
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const author =
    item?.authorId || {};

  const postType =
    item?.community?.postType ||
    'discussion';

  const PostTypeIcon =
    POST_TYPE_ICONS[postType] ||
    MessageCircle;

  const postTypeLabel =
    COMMUNITY_TYPES[postType] ||
    'Cộng đồng';

  const isQuestion =
    postType === 'question';

  const acceptedCommentId =
    item?.community
      ?.acceptedCommentId ||
    null;

  const hasAcceptedAnswer =
    Boolean(acceptedCommentId);

  const isOwner =
    Boolean(user) &&
    getUserId(user) ===
      getAuthorId(author);

  const categoryValue =
    getCategoryValue(
      item?.primaryCategoryId,
    );

  const areaValue =
    getAreaValue(
      item?.primaryAreaId,
    );

  const tagItems = useMemo(
    () => getTagItems(item),
    [item],
  );

  const viewCount =
    getViewCount(item);

  const commentCount =
    getCommentCount(item);

  const reactionCount =
    getReactionCount(item);

  const publishedAt =
    item?.publishedAt ||
    item?.createdAt;

  const updatedAt =
    item?.updatedAt;

  const authorName =
    author?.displayName ||
    'Thành viên';

  const authorLink =
    author?.username
      ? `/thanh-vien/${encodeURIComponent(
          author.username,
        )}`
      : '';

  const wasUpdated = useMemo(() => {
    if (
      !publishedAt ||
      !updatedAt
    ) {
      return false;
    }

    const publishedTime =
      new Date(
        publishedAt,
      ).getTime();

    const updatedTime =
      new Date(
        updatedAt,
      ).getTime();

    if (
      Number.isNaN(publishedTime) ||
      Number.isNaN(updatedTime)
    ) {
      return false;
    }

    return (
      updatedTime - publishedTime >
      60 * 1000
    );
  }, [publishedAt, updatedAt]);

  useEffect(() => {
    if (!item) {
      return undefined;
    }

    let frameId = null;

    const updateProgress = () => {
      if (frameId) {
        cancelAnimationFrame(
          frameId,
        );
      }

      frameId =
        requestAnimationFrame(() => {
          const article =
            articleRef.current;

          if (!article) {
            return;
          }

          const articleTop =
            article.getBoundingClientRect()
              .top + window.scrollY;

          const articleHeight =
            article.offsetHeight;

          const start =
            articleTop - 120;

          const end =
            articleTop +
            articleHeight -
            window.innerHeight * 0.7;

          const distance =
            Math.max(
              end - start,
              1,
            );

          const progress =
            (window.scrollY - start) /
            distance;

          setReadingProgress(
            Math.min(
              Math.max(progress, 0),
              1,
            ),
          );
        });
    };

    updateProgress();

    window.addEventListener(
      'scroll',
      updateProgress,
      {
        passive: true,
      },
    );

    window.addEventListener(
      'resize',
      updateProgress,
    );

    return () => {
      if (frameId) {
        cancelAnimationFrame(
          frameId,
        );
      }

      window.removeEventListener(
        'scroll',
        updateProgress,
      );

      window.removeEventListener(
        'resize',
        updateProgress,
      );
    };
  }, [item]);

  const handleCopyLink =
    useCallback(async () => {
      try {
        await copyText(
          window.location.href,
        );

        setCopied(true);

        toast.success(
          'Đã sao chép liên kết bài viết.',
        );

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch {
        toast.error(
          'Không thể sao chép liên kết.',
        );
      }
    }, [toast]);

  const handleShare =
    useCallback(async () => {
      const shareData = {
        title: item?.title,
        text:
          item?.summary ||
          'Bài viết từ Cộng đồng Hòa Lạc',
        url: window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(
            shareData,
          );
        } catch (shareError) {
          if (
            shareError?.name !==
            'AbortError'
          ) {
            toast.error(
              'Không thể mở chức năng chia sẻ.',
            );
          }
        }

        return;
      }

      await handleCopyLink();
    }, [
      handleCopyLink,
      item,
      toast,
    ]);

  const accept = useCallback(
    async (commentId) => {
      if (
        !commentId ||
        acceptLoadingId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          hasAcceptedAnswer
            ? 'Bạn muốn thay đổi câu trả lời hữu ích sang bình luận này?'
            : 'Chọn bình luận này làm câu trả lời hữu ích?',
        );

      if (!confirmed) {
        return;
      }

      setAcceptLoadingId(
        String(commentId),
      );

      try {
        const response =
          await communityApi.acceptAnswer(
            item._id,
            commentId,
          );

        /*
         * Tương thích cả hai kiểu phản hồi:
         * - API trả community
         * - API trả toàn bộ content
         */
        if (
          response?._id &&
          response?.community
        ) {
          setItem(response);
        } else {
          setItem((current) => ({
            ...current,
            community:
              response?.community ||
              response,
          }));
        }

        toast.success(
          'Đã chọn câu trả lời hữu ích.',
        );
      } catch (requestError) {
        toast.error(
          apiErrorMessage(
            requestError,
          ),
        );
      } finally {
        setAcceptLoadingId('');
      }
    },
    [
      acceptLoadingId,
      hasAcceptedAnswer,
      item?._id,
      toast,
    ],
  );

  if (!item && !error) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <section className="community-detail-error">
        <div className="community-detail-container">
          <ErrorState
            error={error}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="community-detail-page">
      <Seo
        title={item.title}
        description={item.summary}
      />

      <div
        className="community-reading-progress"
        aria-hidden="true"
      >
        <span
          style={{
            transform: `scaleX(${readingProgress})`,
          }}
        />
      </div>

      <div className="community-detail-container">
        <nav
          className="community-detail-breadcrumb"
          aria-label="Điều hướng cộng đồng"
        >
          <Link to="/cong-dong">
            <ArrowLeft size={16} />
            Cộng đồng
          </Link>

          <span>/</span>

          <Link
            to={`/cong-dong?type=${encodeURIComponent(
              postType,
            )}`}
          >
            {postTypeLabel}
          </Link>
        </nav>

        <div className="community-detail-layout">
          <main
            ref={articleRef}
            className={[
              'community-detail-main',
              isQuestion
                ? 'is-question'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <article className="community-post">
              <header className="community-post-header">
                <div className="community-post-header__top">
                  <div className="community-post-author">
                    <Avatar
                      name={authorName}
                      size="lg"
                    />

                    <div className="community-post-author__content">
                      <div className="community-post-author__name">
                        {authorLink ? (
                          <Link
                            to={
                              authorLink
                            }
                          >
                            {authorName}
                          </Link>
                        ) : (
                          <strong>
                            {authorName}
                          </strong>
                        )}

                        <VerifiedMark
                          emailVerifiedAt={
                            author.emailVerifiedAt
                          }
                          phoneVerifiedAt={
                            author.phoneVerifiedAt
                          }
                        />
                      </div>

                      <div className="community-post-author__meta">
                        <span>
                          <CalendarDays
                            size={14}
                          />

                          {formatDateTime(
                            publishedAt,
                          )}
                        </span>

                        {wasUpdated ? (
                          <span>
                            <Clock3
                              size={14}
                            />

                            Cập nhật{' '}
                            {formatDateTime(
                              updatedAt,
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="community-post-type">
                    <PostTypeIcon
                      size={16}
                    />

                    <span>
                      {postTypeLabel}
                    </span>
                  </div>
                </div>

                <div className="community-post-labels">
                  <Badge tone="soft">
                    {postTypeLabel}
                  </Badge>

                  {item
                    .primaryCategoryId
                    ?.name ? (
                    <Badge tone="primary">
                      {
                        item
                          .primaryCategoryId
                          .name
                      }
                    </Badge>
                  ) : null}

                  {isQuestion &&
                  hasAcceptedAnswer ? (
                    <span className="community-post-resolved-badge">
                      <CheckCircle2
                        size={15}
                      />
                      Đã có câu trả lời hữu ích
                    </span>
                  ) : null}
                </div>

                <h1>{item.title}</h1>

                {item.summary ? (
                  <p className="community-post-lead">
                    {item.summary}
                  </p>
                ) : null}

                <div className="community-post-facts">
                  {item.primaryAreaId
                    ?.name ? (
                    <Link
                      to={`/cong-dong?area=${encodeURIComponent(
                        areaValue,
                      )}`}
                    >
                      <MapPin
                        size={16}
                      />

                      {
                        item
                          .primaryAreaId
                          .name
                      }
                    </Link>
                  ) : null}

                  {item.community
                    ?.locationText ? (
                    <span>
                      <MapPin
                        size={16}
                      />

                      {
                        item.community
                          .locationText
                      }
                    </span>
                  ) : null}

                  {item.community
                    ?.rating ? (
                    <span className="community-post-rating">
                      <Star
                        size={16}
                      />

                      <strong>
                        {
                          item.community
                            .rating
                        }
                        /5
                      </strong>
                    </span>
                  ) : null}
                </div>

                <div className="community-post-stats">
                  <span>
                    <Eye size={16} />

                    {viewCount.toLocaleString(
                      'vi-VN',
                    )}{' '}
                    lượt xem
                  </span>

                  <span>
                    <MessageCircle
                      size={16}
                    />

                    {commentCount.toLocaleString(
                      'vi-VN',
                    )}{' '}
                    bình luận
                  </span>

                  <span>
                    <BadgeCheck
                      size={16}
                    />

                    {reactionCount.toLocaleString(
                      'vi-VN',
                    )}{' '}
                    tương tác
                  </span>

                  <div className="community-post-share-actions">
                    <button
                      type="button"
                      onClick={
                        handleShare
                      }
                    >
                      <Share2
                        size={16}
                      />
                      Chia sẻ
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleCopyLink
                      }
                    >
                      {copied ? (
                        <Check
                          size={16}
                        />
                      ) : (
                        <Copy
                          size={16}
                        />
                      )}

                      {copied
                        ? 'Đã sao chép'
                        : 'Sao chép link'}
                    </button>
                  </div>
                </div>
              </header>

              {isQuestion ? (
                <div
                  className={[
                    'community-question-notice',
                    hasAcceptedAnswer
                      ? 'is-resolved'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span>
                    {hasAcceptedAnswer ? (
                      <CheckCircle2
                        size={23}
                      />
                    ) : (
                      <HelpCircle
                        size={23}
                      />
                    )}
                  </span>

                  <div>
                    <strong>
                      {hasAcceptedAnswer
                        ? 'Câu hỏi đã có câu trả lời hữu ích'
                        : 'Đây là một bài hỏi đáp'}
                    </strong>

                    <p>
                      {hasAcceptedAnswer
                        ? 'Câu trả lời được chủ bài lựa chọn sẽ được đánh dấu nổi bật trong phần bình luận.'
                        : isOwner
                          ? 'Bạn có thể chọn một bình luận phù hợp làm câu trả lời hữu ích.'
                          : 'Hãy để lại câu trả lời rõ ràng, đúng trọng tâm và hữu ích cho người đăng.'}
                    </p>
                  </div>
                </div>
              ) : null}

              {item.thumbnailMediaId ? (
                <div className="community-post-cover">
                  <ContentImage
                    media={
                      item.thumbnailMediaId
                    }
                    alt={item.title}
                    ratio="hero"
                  />
                </div>
              ) : null}

              <div className="community-post-body">
                <ArticleBody
                  html={
                    item.body?.bodyHtml ||
                    item.bodyHtml
                  }
                />

                {tagItems.length ? (
                  <div className="community-post-tags">
                    <span>
                      <Tag size={16} />
                      Từ khóa:
                    </span>

                    <div>
                      {tagItems.map(
                        (tag) => (
                          <span
                            key={tag.id}
                          >
                            {tag.name}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="community-post-reactions">
                <ReactionBar
                  content={item}
                />
              </div>

              <section className="community-post-comments">
                <div className="community-post-comments__heading">
                  <div>
                    <MessageCircle
                      size={20}
                    />

                    <div>
                      <h2>
                        Bình luận và thảo luận
                      </h2>

                      <p>
                        Trao đổi văn minh,
                        đúng chủ đề và tôn
                        trọng thành viên khác.
                      </p>
                    </div>
                  </div>

                  {isQuestion &&
                  isOwner ? (
                    <span>
                      <CheckCircle2
                        size={16}
                      />

                      Bạn có thể chọn câu trả
                      lời hữu ích
                    </span>
                  ) : null}
                </div>

                <CommentsSection
                  contentId={item._id}
                  allowComments={
                    item.allowComments
                  }
                  acceptedCommentId={
                    acceptedCommentId
                  }
                  onAcceptAnswer={
                    accept
                  }
                  isQuestionOwner={
                    isOwner &&
                    isQuestion
                  }
                  acceptLoadingId={
                    acceptLoadingId
                  }
                />
              </section>
            </article>
          </main>

          <aside className="community-detail-sidebar">
            <div className="community-detail-sidebar__sticky">
              <section className="community-detail-sidebar-card community-author-card">
                <div className="community-author-card__profile">
                  <Avatar
                    name={authorName}
                    size="lg"
                  />

                  <div>
                    {authorLink ? (
                      <Link
                        to={authorLink}
                      >
                        {authorName}
                      </Link>
                    ) : (
                      <strong>
                        {authorName}
                      </strong>
                    )}

                    <div>
                      <VerifiedMark
                        emailVerifiedAt={
                          author.emailVerifiedAt
                        }
                        phoneVerifiedAt={
                          author.phoneVerifiedAt
                        }
                      />
                    </div>
                  </div>
                </div>

                <p>
                  Thành viên đã chia sẻ bài
                  viết này với cộng đồng Đô
                  Thị Hòa Lạc.
                </p>

                {authorLink ? (
                  <Link
                    className="community-author-card__button"
                    to={authorLink}
                  >
                    <UserRound
                      size={16}
                    />
                    Xem trang thành viên
                  </Link>
                ) : null}
              </section>

              <section className="community-detail-sidebar-card community-post-info">
                <div className="community-sidebar-heading">
                  <MessageCircle
                    size={19}
                  />

                  <h2>
                    Thông tin bài viết
                  </h2>
                </div>

                <dl>
                  <div>
                    <dt>
                      <PostTypeIcon
                        size={16}
                      />
                      Loại bài
                    </dt>

                    <dd>
                      <Link
                        to={`/cong-dong?type=${encodeURIComponent(
                          postType,
                        )}`}
                      >
                        {postTypeLabel}
                      </Link>
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <Tag size={16} />
                      Chủ đề
                    </dt>

                    <dd>
                      {categoryValue ? (
                        <Link
                          to={`/cong-dong?category=${encodeURIComponent(
                            categoryValue,
                          )}`}
                        >
                          {item
                            .primaryCategoryId
                            ?.name ||
                            'Cộng đồng'}
                        </Link>
                      ) : (
                        item
                          .primaryCategoryId
                          ?.name ||
                        'Cộng đồng'
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <MapPin
                        size={16}
                      />
                      Khu vực
                    </dt>

                    <dd>
                      {areaValue ? (
                        <Link
                          to={`/cong-dong?area=${encodeURIComponent(
                            areaValue,
                          )}`}
                        >
                          {item
                            .primaryAreaId
                            ?.name ||
                            'Hòa Lạc'}
                        </Link>
                      ) : (
                        item
                          .primaryAreaId
                          ?.name ||
                        'Hòa Lạc'
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <Eye size={16} />
                      Lượt xem
                    </dt>

                    <dd>
                      {viewCount.toLocaleString(
                        'vi-VN',
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <MessageCircle
                        size={16}
                      />
                      Bình luận
                    </dt>

                    <dd>
                      {commentCount.toLocaleString(
                        'vi-VN',
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              {isQuestion ? (
                <section
                  className={[
                    'community-detail-sidebar-card',
                    'community-answer-card',
                    hasAcceptedAnswer
                      ? 'is-resolved'
                      : '',
                  ].join(' ')}
                >
                  <span>
                    {hasAcceptedAnswer ? (
                      <CheckCircle2
                        size={23}
                      />
                    ) : (
                      <HelpCircle
                        size={23}
                      />
                    )}
                  </span>

                  <h2>
                    {hasAcceptedAnswer
                      ? 'Đã có câu trả lời hữu ích'
                      : 'Đang chờ câu trả lời'}
                  </h2>

                  <p>
                    {hasAcceptedAnswer
                      ? 'Câu trả lời được chủ bài lựa chọn đã được đánh dấu trong phần bình luận.'
                      : 'Chia sẻ kinh nghiệm hoặc thông tin chính xác để hỗ trợ người đặt câu hỏi.'}
                  </p>

                  <a href="#community-comments">
                    <MessageCircle
                      size={16}
                    />

                    {hasAcceptedAnswer
                      ? 'Xem câu trả lời'
                      : 'Tham gia trả lời'}
                  </a>
                </section>
              ) : null}

              <section className="community-detail-sidebar-card community-share-card">
                <div className="community-sidebar-heading">
                  <Share2 size={19} />

                  <div>
                    <h2>
                      Chia sẻ bài viết
                    </h2>

                    <p>
                      Gửi bài viết tới bạn bè
                      hoặc nhóm cộng đồng.
                    </p>
                  </div>
                </div>

                <div className="community-share-card__actions">
                  <button
                    type="button"
                    onClick={handleShare}
                  >
                    <Share2 size={16} />
                    Chia sẻ
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleCopyLink
                    }
                  >
                    {copied ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}

                    {copied
                      ? 'Đã sao chép'
                      : 'Sao chép'}
                  </button>
                </div>
              </section>

              <section className="community-detail-sidebar-card community-rules-card">
                <div className="community-sidebar-heading">
                  <ShieldCheck
                    size={19}
                  />

                  <div>
                    <h2>
                      Thảo luận văn minh
                    </h2>

                    <p>
                      Cùng xây dựng cộng đồng
                      thông tin đáng tin cậy.
                    </p>
                  </div>
                </div>

                <ul>
                  <li>
                    Tôn trọng người đăng và
                    thành viên tham gia.
                  </li>

                  <li>
                    Không chia sẻ thông tin
                    sai sự thật hoặc chưa
                    kiểm chứng.
                  </li>

                  <li>
                    Không công khai dữ liệu
                    cá nhân nhạy cảm.
                  </li>

                  <li>
                    Bình luận đúng chủ đề,
                    tránh quảng cáo rác.
                  </li>
                </ul>
              </section>
            </div>
          </aside>
        </div>
      </div>

      {readingProgress > 0.35 ? (
        <button
          type="button"
          className="community-scroll-top"
          aria-label="Quay lên đầu trang"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            })
          }
        >
          <ChevronUp size={21} />
        </button>
      ) : null}
    </section>
  );
}