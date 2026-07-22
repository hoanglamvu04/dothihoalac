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
  CalendarDays,
  Check,
  ChevronUp,
  Clock3,
  Copy,
  Eye,
  Link2,
  MapPin,
  Newspaper,
  Share2,
  Tag,
  UserRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import ContentImage from '../../components/content/ContentImage';
import ArticleBody from '../../components/content/ArticleBody';
import ReactionBar from '../../components/content/ReactionBar';
import CommentsSection from '../../components/content/CommentsSection';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';
import LeadForm from '../../components/forms/LeadForm';

import { articleApi } from '../../api/content.api';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

import './ArticleDetailPage.css';

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function createHeadingId(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function prepareArticleHtml(html) {
  if (
    !html ||
    typeof DOMParser === 'undefined'
  ) {
    return {
      html: html || '',
      headings: [],
    };
  }

  const parser = new DOMParser();

  const documentNode = parser.parseFromString(
    `<div id="article-content-root">${html}</div>`,
    'text/html',
  );

  const root = documentNode.querySelector(
    '#article-content-root',
  );

  if (!root) {
    return {
      html,
      headings: [],
    };
  }

  const usedIds = new Map();
  const headings = [];

  root
    .querySelectorAll('h2, h3')
    .forEach((heading, index) => {
      const title = heading.textContent
        ?.replace(/\s+/g, ' ')
        .trim();

      if (!title) {
        return;
      }

      const baseId =
        createHeadingId(title) ||
        `noi-dung-${index + 1}`;

      const count =
        usedIds.get(baseId) || 0;

      usedIds.set(
        baseId,
        count + 1,
      );

      const id = count
        ? `${baseId}-${count + 1}`
        : baseId;

      heading.id = id;

      headings.push({
        id,
        title,
        level:
          heading.tagName.toLowerCase() ===
          'h3'
            ? 3
            : 2,
      });
    });

  return {
    html: root.innerHTML,
    headings,
  };
}

function getReadingMinutes(item, html) {
  const serverReadingMinutes = Number(
    item?.article?.readingMinutes ||
      item?.readingMinutes ||
      0,
  );

  if (serverReadingMinutes > 0) {
    return Math.ceil(
      serverReadingMinutes,
    );
  }

  const wordCount = stripHtml(html)
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(
    1,
    Math.ceil(wordCount / 220),
  );
}

function getViewCount(item) {
  return Number(
    item?.stats?.viewCount ??
      item?.viewCount ??
      0,
  );
}

function getTaxonomyValue(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return (
    value.slug ||
    value._id ||
    value.id ||
    ''
  );
}

function getTagItems(item) {
  const source =
    item?.tagIds ||
    item?.tags ||
    [];

  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((tag) => {
      if (
        !tag ||
        typeof tag === 'string'
      ) {
        return null;
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

async function copyToClipboard(value) {
  if (
    navigator.clipboard?.writeText
  ) {
    await navigator.clipboard.writeText(
      value,
    );

    return;
  }

  const textarea =
    document.createElement(
      'textarea',
    );

  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';

  document.body.appendChild(
    textarea,
  );

  textarea.focus();
  textarea.select();

  document.execCommand('copy');

  textarea.remove();
}

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const toast = useToast();

  const articleRef = useRef(null);

  const [item, setItem] =
    useState(null);

  const [error, setError] =
    useState(null);

  const [
    readingProgress,
    setReadingProgress,
  ] = useState(0);

  const [
    copied,
    setCopied,
  ] = useState(false);

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

    articleApi
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

  const bodyHtml = useMemo(
    () =>
      item?.body?.bodyHtml ||
      item?.bodyHtml ||
      '',
    [item],
  );

  const preparedBody = useMemo(
    () =>
      prepareArticleHtml(bodyHtml),
    [bodyHtml],
  );

  const readingMinutes =
    useMemo(
      () =>
        getReadingMinutes(
          item,
          bodyHtml,
        ),
      [item, bodyHtml],
    );

  const tagItems = useMemo(
    () => getTagItems(item),
    [item],
  );

  const categoryValue =
    getTaxonomyValue(
      item?.primaryCategoryId,
    );

  const areaValue =
    getTaxonomyValue(
      item?.primaryAreaId,
    );

  const authorName =
    item?.authorId?.displayName ||
    'Ban biên tập';

  const authorUsername =
    item?.authorId?.username || '';

  const authorAvatar =
    item?.authorId?.profile
      ?.avatarMediaId ||
    item?.authorId?.avatarMediaId ||
    null;

  const viewCount =
    getViewCount(item);

  const publishedAt =
    item?.publishedAt ||
    item?.createdAt;

  const updatedAt =
    item?.updatedAt;

  const wasUpdated = useMemo(() => {
    if (
      !updatedAt ||
      !publishedAt
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

    let animationFrame = null;

    const updateProgress = () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame,
        );
      }

      animationFrame =
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
            window.innerHeight * 0.72;

          const distance =
            Math.max(end - start, 1);

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
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame,
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
        await copyToClipboard(
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
          'Tin tức Đô Thị Hòa Lạc',
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

  const scrollToHeading =
    useCallback((headingId) => {
      const heading =
        document.getElementById(
          headingId,
        );

      if (!heading) {
        return;
      }

      heading.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, []);

  if (!item && !error) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <section className="article-view-error">
        <div className="article-view-container">
          <ErrorState
            error={error}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="article-view-page">
      <Seo
        title={item.title}
        description={item.summary}
      />

      <div
        className="article-reading-progress"
        aria-hidden="true"
      >
        <span
          style={{
            transform: `scaleX(${readingProgress})`,
          }}
        />
      </div>

      <div className="article-view-container">
        <nav
          className="article-view-breadcrumb"
          aria-label="Điều hướng bài viết"
        >
          <Link to="/tin-tuc">
            <ArrowLeft size={16} />
            Tin tức
          </Link>

          <span>/</span>

          {categoryValue ? (
            <Link
              to={`/tin-tuc?category=${encodeURIComponent(
                categoryValue,
              )}`}
            >
              {item.primaryCategoryId
                ?.name || 'Tin tức'}
            </Link>
          ) : (
            <span>
              {item.primaryCategoryId
                ?.name || 'Tin tức'}
            </span>
          )}
        </nav>

        <div className="article-view-layout">
          <article
            ref={articleRef}
            className="article-view-main"
          >
            <header className="article-view-header">
              <div className="article-view-labels">
                <Badge tone="primary">
                  {item.primaryCategoryId
                    ?.name || 'Tin tức'}
                </Badge>

                {item.isSponsored ? (
                  <Badge tone="warning">
                    Nội dung tài trợ
                  </Badge>
                ) : null}
              </div>

              <h1>{item.title}</h1>

              {item.summary ? (
                <p className="article-view-lead">
                  {item.summary}
                </p>
              ) : null}

              <div className="article-view-author-row">
                <div className="article-view-author">
                  <Avatar
                    name={authorName}
                    src={authorAvatar}
                    size="sm"
                  />

                  <div>
                    {authorUsername ? (
                      <Link
                        to={`/thanh-vien/${encodeURIComponent(
                          authorUsername,
                        )}`}
                      >
                        {authorName}
                      </Link>
                    ) : (
                      <strong>
                        {authorName}
                      </strong>
                    )}

                    <span>
                      <UserRound
                        size={14}
                      />
                      Ban biên tập
                    </span>
                  </div>
                </div>

                <div className="article-view-byline">
                  <span>
                    <CalendarDays
                      size={16}
                    />

                    {formatDateTime(
                      publishedAt,
                    )}
                  </span>

                  <span>
                    <Clock3 size={16} />
                    {readingMinutes} phút
                    đọc
                  </span>

                  <span>
                    <Eye size={16} />

                    {viewCount.toLocaleString(
                      'vi-VN',
                    )}{' '}
                    lượt xem
                  </span>
                </div>

                <div className="article-view-header-actions">
                  <button
                    type="button"
                    onClick={handleShare}
                  >
                    <Share2 size={17} />
                    Chia sẻ
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleCopyLink
                    }
                  >
                    {copied ? (
                      <Check size={17} />
                    ) : (
                      <Copy size={17} />
                    )}

                    {copied
                      ? 'Đã sao chép'
                      : 'Sao chép link'}
                  </button>
                </div>
              </div>

              {wasUpdated ? (
                <p className="article-view-updated">
                  Cập nhật lần cuối:{' '}
                  <strong>
                    {formatDateTime(
                      updatedAt,
                    )}
                  </strong>
                </p>
              ) : null}
            </header>

            {item.isSponsored ? (
              <div className="article-view-sponsored">
                <Newspaper
                  size={19}
                />

                <div>
                  <strong>
                    Nội dung tài trợ
                  </strong>

                  <p>
                    Bài viết có nội dung
                    hợp tác hoặc tài trợ.
                    Thông tin được trình bày
                    theo tiêu chuẩn biên tập
                    của Đô Thị Hòa Lạc.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="article-view-cover">
              <ContentImage
                media={
                  item.thumbnailMediaId
                }
                alt={item.title}
                ratio="hero"
              />
            </div>

            <div className="article-view-content">
              <div className="article-view-body">
                <ArticleBody
                  html={
                    preparedBody.html
                  }
                />
              </div>

              {item.article
                ?.sourceNote ? (
                <div className="article-view-source-note">
                  <Link2 size={18} />

                  <div>
                    <strong>
                      Nguồn và ghi chú
                    </strong>

                    <p>
                      {
                        item.article
                          .sourceNote
                      }
                    </p>
                  </div>
                </div>
              ) : null}

              {tagItems.length ? (
                <div className="article-view-tags">
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

            <div className="article-view-reactions">
              <ReactionBar
                content={item}
              />
            </div>

            <div className="article-view-comments">
              <CommentsSection
                contentId={item._id}
                allowComments={
                  item.allowComments
                }
              />
            </div>
          </article>

          <aside className="article-view-sidebar">
            <div className="article-view-sidebar__sticky">
              {preparedBody.headings
                .length ? (
                <section className="article-sidebar-card article-sidebar-toc">
                  <div className="article-sidebar-card__heading">
                    <Newspaper
                      size={18}
                    />

                    <h2>
                      Trong bài viết
                    </h2>
                  </div>

                  <nav>
                    {preparedBody.headings.map(
                      (heading) => (
                        <button
                          type="button"
                          key={heading.id}
                          className={
                            heading.level ===
                            3
                              ? 'is-level-3'
                              : ''
                          }
                          onClick={() =>
                            scrollToHeading(
                              heading.id,
                            )
                          }
                        >
                          {heading.title}
                        </button>
                      ),
                    )}
                  </nav>
                </section>
              ) : null}

              <section className="article-sidebar-card article-sidebar-info">
                <div className="article-sidebar-card__heading">
                  <Newspaper
                    size={18}
                  />

                  <h2>
                    Thông tin bài viết
                  </h2>
                </div>

                <dl>
                  <div>
                    <dt>
                      <Tag size={16} />
                      Chuyên mục
                    </dt>

                    <dd>
                      {categoryValue ? (
                        <Link
                          to={`/tin-tuc?category=${encodeURIComponent(
                            categoryValue,
                          )}`}
                        >
                          {item
                            .primaryCategoryId
                            ?.name ||
                            'Tin tức'}
                        </Link>
                      ) : (
                        item
                          .primaryCategoryId
                          ?.name ||
                        'Tin tức'
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
                          to={`/tin-tuc?area=${encodeURIComponent(
                            areaValue,
                          )}`}
                        >
                          {item
                            .primaryAreaId
                            ?.name ||
                            'Hòa Lạc'}
                        </Link>
                      ) : (
                        item.primaryAreaId
                          ?.name ||
                        'Hòa Lạc'
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <Clock3
                        size={16}
                      />
                      Thời gian đọc
                    </dt>

                    <dd>
                      {readingMinutes}{' '}
                      phút
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
                </dl>
              </section>

              <section className="article-sidebar-card article-sidebar-share">
                <div>
                  <Share2 size={19} />

                  <div>
                    <h2>
                      Chia sẻ bài viết
                    </h2>

                    <p>
                      Gửi thông tin hữu ích
                      này tới bạn bè và cộng
                      đồng.
                    </p>
                  </div>
                </div>

                <div className="article-sidebar-share__actions">
                  <button
                    type="button"
                    onClick={handleShare}
                  >
                    <Share2 size={17} />
                    Chia sẻ
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleCopyLink
                    }
                  >
                    {copied ? (
                      <Check size={17} />
                    ) : (
                      <Copy size={17} />
                    )}

                    {copied
                      ? 'Đã sao chép'
                      : 'Sao chép'}
                  </button>
                </div>
              </section>

              <section className="article-sidebar-card article-sidebar-cta">
                <span>
                  Kiến Trúc Hòa Lạc
                </span>

                <h2>
                  Bạn có đất hoặc nhà cần
                  xây?
                </h2>

                <p>
                  Gửi thông tin để nhận tư
                  vấn phương án kiến trúc
                  phù hợp với địa hình và
                  nhu cầu sử dụng.
                </p>

                <Link
                  to={`/tu-van?type=architecture_design&source=${item._id}`}
                >
                  Yêu cầu tư vấn
                  <ArrowLeft size={17} />
                </Link>
              </section>

              <section className="article-sidebar-card article-sidebar-lead">
                <div className="article-sidebar-card__heading">
                  <UserRound
                    size={18}
                  />

                  <div>
                    <h2>
                      Tư vấn nhanh
                    </h2>

                    <p>
                      Để lại thông tin, đội
                      ngũ tư vấn sẽ liên hệ
                      lại.
                    </p>
                  </div>
                </div>

                <LeadForm
                  compact
                  sourceContentId={
                    item._id
                  }
                />
              </section>
            </div>
          </aside>
        </div>
      </div>

      {readingProgress > 0.35 ? (
        <button
          type="button"
          className="article-scroll-top"
          aria-label="Quay lên đầu bài viết"
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