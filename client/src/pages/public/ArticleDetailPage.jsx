import {
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
  ChevronUp,
  Clock3,
  Eye,
  Link2,
  Newspaper,
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

import { articleApi } from '../../api/content.api';
import { formatDateTime } from '../../utils/formatters';
import { mediaUrl } from '../../utils/media';

import './ArticleDetailPage.css';
import './ArticlePopularSidebar.css';

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDisplayText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function mediaIdOf(value) {
  return String(
    value?._id ||
      value?.id ||
      value ||
      '',
  );
}

function bodyContainsMediaId(html, mediaId) {
  const id = String(mediaId || '').trim();
  if (!id) return false;

  const source = String(html || '');

  return (
    source.includes(`data-media-id="${id}"`) ||
    source.includes(`data-media-id='${id}'`)
  );
}

function getReadingMinutes(item, html) {
  const serverReadingMinutes = Number(
    item?.body?.readingTime ||
      item?.article?.readingMinutes ||
      item?.readingMinutes ||
      0,
  );

  if (serverReadingMinutes > 0) {
    return Math.ceil(serverReadingMinutes);
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
  if (!value) return '';
  if (typeof value === 'string') return value;

  return value.slug || value._id || value.id || '';
}

function getTagItems(item) {
  const source = item?.tagIds || item?.tags || [];

  if (!Array.isArray(source)) return [];

  return source
    .map((tag) => {
      if (!tag || typeof tag === 'string') return null;

      const name = normalizeDisplayText(
        tag.name || tag.title || tag.label,
      );
      if (!name) return null;

      return {
        id: tag._id || tag.id || tag.slug || name,
        name,
      };
    })
    .filter(Boolean);
}

function getArticleId(article) {
  return String(article?._id || article?.id || '');
}

function getCategoryKey(article) {
  const category = article?.primaryCategoryId;

  if (!category) return '';
  if (typeof category === 'string') return category;

  return String(
    category._id ||
      category.id ||
      category.slug ||
      '',
  );
}

function selectSidebarArticles(currentItem, articles = []) {
  const currentId = getArticleId(currentItem);
  const currentSlug = String(currentItem?.slug || '');
  const seen = new Set();
  const result = [];

  for (const article of articles) {
    const id = getArticleId(article);
    const slug = String(article?.slug || '');

    if (
      !id ||
      !slug ||
      id === currentId ||
      slug === currentSlug ||
      seen.has(id)
    ) {
      continue;
    }

    seen.add(id);
    result.push(article);
  }

  return result;
}

function selectRelatedArticles(currentItem, articles = [], limit = 4) {
  const candidates = selectSidebarArticles(currentItem, articles);
  const currentCategory = getCategoryKey(currentItem);

  if (!currentCategory) {
    return candidates.slice(0, limit);
  }

  const sameCategory = [];
  const fallback = [];

  for (const article of candidates) {
    if (getCategoryKey(article) === currentCategory) {
      sameCategory.push(article);
    } else {
      fallback.push(article);
    }
  }

  return [...sameCategory, ...fallback].slice(0, limit);
}

function clampSidebarCount(value, max) {
  if (!max) return 0;
  return Math.min(max, Math.max(Math.min(4, max), value));
}

function isCanceledRequest(error) {
  return (
    error?.name === 'CanceledError' ||
    error?.code === 'ERR_CANCELED'
  );
}

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const storyRef = useRef(null);
  const progressBarRef = useRef(null);

  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sidebarArticles, setSidebarArticles] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sidebarVisibleCount, setSidebarVisibleCount] = useState(4);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setItem(null);
    setError(null);
    setShowScrollTop(false);
    setSidebarArticles([]);
    setSidebarLoading(true);
    setSidebarVisibleCount(4);

    if (progressBarRef.current) {
      progressBarRef.current.style.transform = 'scaleX(0)';
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });

    articleApi
      .detail(slug, {
        signal: controller.signal,
      })
      .then((result) => {
        if (active) setItem(result);
      })
      .catch((requestError) => {
        if (active && !isCanceledRequest(requestError)) {
          setError(requestError);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [slug]);

  useEffect(() => {
    if (!item?._id) return undefined;

    let active = true;
    const controller = new AbortController();

    const loadSidebarArticles = async () => {
      setSidebarLoading(true);

      try {
        const result = await articleApi.list(
          {
            sort: 'popular',
            limit: 30,
          },
          {
            signal: controller.signal,
          },
        );

        if (active) {
          setSidebarArticles(
            selectSidebarArticles(item, result?.items || []),
          );
        }
      } catch (requestError) {
        if (active && !isCanceledRequest(requestError)) {
          setSidebarArticles([]);
        }
      } finally {
        if (active) setSidebarLoading(false);
      }
    };

    void loadSidebarArticles();

    return () => {
      active = false;
      controller.abort();
    };
  }, [item?._id]);

  useEffect(() => {
    const story = storyRef.current;
    if (!story || !sidebarArticles.length) return undefined;

    let frame = null;

    const measure = () => {
      if (frame) cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        if (window.innerWidth <= 980) {
          setSidebarVisibleCount(
            clampSidebarCount(8, sidebarArticles.length),
          );
          return;
        }

        const storyHeight = story.getBoundingClientRect().height;
        const railHeadingHeight = 72;
        const railItemHeight = window.innerWidth <= 1280 ? 124 : 132;
        const usableHeight = Math.max(storyHeight - railHeadingHeight, railItemHeight * 4);
        const capacity = Math.floor(usableHeight / railItemHeight);

        setSidebarVisibleCount(
          clampSidebarCount(capacity, sidebarArticles.length),
        );
      });
    };

    measure();

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(story);
    }

    window.addEventListener('resize', measure);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [sidebarArticles.length, item?._id]);

  const bodyHtml = useMemo(
    () => item?.body?.bodyHtml || item?.bodyHtml || '',
    [item],
  );

  const coverMediaId = useMemo(
    () => mediaIdOf(item?.thumbnailMediaId),
    [item?.thumbnailMediaId],
  );

  const coverUrl = useMemo(
    () => mediaUrl(item?.thumbnailMediaId),
    [item?.thumbnailMediaId],
  );

  const coverIsInline = useMemo(
    () => bodyContainsMediaId(bodyHtml, coverMediaId),
    [bodyHtml, coverMediaId],
  );

  const showStandaloneCover = Boolean(coverUrl) && !coverIsInline;

  const displayTitle = useMemo(
    () => normalizeDisplayText(item?.title),
    [item?.title],
  );

  const seoDescription = useMemo(() => {
    const explicit = String(item?.summary || '').trim();
    if (explicit) return explicit;

    return stripHtml(bodyHtml).slice(0, 180).trim();
  }, [bodyHtml, item?.summary]);

  const readingMinutes = useMemo(
    () => getReadingMinutes(item, bodyHtml),
    [item, bodyHtml],
  );

  const tagItems = useMemo(
    () => getTagItems(item),
    [item],
  );

  const categoryValue = getTaxonomyValue(item?.primaryCategoryId);
  const categoryName = normalizeDisplayText(
    item?.primaryCategoryId?.name || 'Tin tức',
  );
  const authorName = normalizeDisplayText(
    item?.authorId?.displayName || 'Ban biên tập',
  );
  const authorUsername = item?.authorId?.username || '';
  const authorAvatar =
    item?.authorId?.profile?.avatarMediaId ||
    item?.authorId?.avatarMediaId ||
    null;
  const viewCount = getViewCount(item);
  const publishedAt = item?.publishedAt || item?.createdAt;
  const updatedAt = item?.updatedAt;

  const wasUpdated = useMemo(() => {
    if (!updatedAt || !publishedAt) return false;

    const publishedTime = new Date(publishedAt).getTime();
    const updatedTime = new Date(updatedAt).getTime();

    if (Number.isNaN(publishedTime) || Number.isNaN(updatedTime)) return false;

    return updatedTime - publishedTime > 60 * 1000;
  }, [publishedAt, updatedAt]);

  useEffect(() => {
    if (!item) return undefined;

    let animationFrame = null;

    const updateProgress = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);

      animationFrame = requestAnimationFrame(() => {
        const article = storyRef.current;
        if (!article) return;

        const articleTop = article.getBoundingClientRect().top + window.scrollY;
        const articleHeight = article.offsetHeight;
        const start = articleTop - 120;
        const end = articleTop + articleHeight - window.innerHeight * 0.72;
        const distance = Math.max(end - start, 1);
        const progress = (window.scrollY - start) / distance;
        const clampedProgress = Math.min(Math.max(progress, 0), 1);

        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${clampedProgress})`;
        }

        const shouldShowScrollTop = clampedProgress > 0.35;
        setShowScrollTop((current) =>
          current === shouldShowScrollTop ? current : shouldShowScrollTop,
        );
      });
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [item]);

  if (!item && !error) return <PageLoading />;

  if (error) {
    return (
      <section className="article-view-error">
        <div className="article-view-container">
          <ErrorState error={error} />
        </div>
      </section>
    );
  }

  const visibleSidebarArticles = sidebarArticles.slice(0, sidebarVisibleCount);
  const relatedArticles = selectRelatedArticles(item, sidebarArticles, 4);

  return (
    <section className="article-view-page">
      <Seo title={displayTitle} description={seoDescription} />

      <div className="article-reading-progress" aria-hidden="true">
        <span ref={progressBarRef} />
      </div>

      <div className="article-view-container">
        <nav className="article-view-breadcrumb" aria-label="Điều hướng bài viết">
          <Link to="/tin-tuc">
            <ArrowLeft size={16} />
            Tin tức
          </Link>
          <span>/</span>
          {categoryValue ? (
            <Link to={`/tin-tuc?category=${encodeURIComponent(categoryValue)}`}>
              {categoryName}
            </Link>
          ) : (
            <span>{categoryName}</span>
          )}
        </nav>

        <div className="article-view-layout">
          <article className="article-view-main">
            <div ref={storyRef} className="article-view-story">
              <header className="article-view-header">
                <div className="article-view-labels">
                  <Badge tone="primary">
                    {categoryName}
                  </Badge>
                  {item.isSponsored ? (
                    <Badge tone="warning">Nội dung tài trợ</Badge>
                  ) : null}
                </div>

                <h1>{displayTitle}</h1>

                {item.summary ? (
                  <p className="article-view-lead">
                    {normalizeDisplayText(item.summary)}
                  </p>
                ) : null}

                <div className="article-view-author-row">
                  <div className="article-view-author">
                    <Avatar name={authorName} src={authorAvatar} size="sm" />
                    <div>
                      {authorUsername ? (
                        <Link to={`/thanh-vien/${encodeURIComponent(authorUsername)}`}>
                          {authorName}
                        </Link>
                      ) : (
                        <strong>{authorName}</strong>
                      )}
                      <span>
                        <UserRound size={14} />
                        Ban biên tập
                      </span>
                    </div>
                  </div>

                  <div className="article-view-byline">
                    <span>
                      <CalendarDays size={16} />
                      {formatDateTime(publishedAt)}
                    </span>
                    <span>
                      <Clock3 size={16} />
                      {readingMinutes} phút đọc
                    </span>
                    <span>
                      <Eye size={16} />
                      {viewCount.toLocaleString('vi-VN')} lượt xem
                    </span>
                  </div>
                </div>

                {wasUpdated ? (
                  <p className="article-view-updated">
                    Cập nhật lần cuối: <strong>{formatDateTime(updatedAt)}</strong>
                  </p>
                ) : null}
              </header>

              {item.isSponsored ? (
                <div className="article-view-sponsored">
                  <Newspaper size={19} />
                  <div>
                    <strong>Nội dung tài trợ</strong>
                    <p>
                      Bài viết có nội dung hợp tác hoặc tài trợ. Thông tin được trình bày
                      theo tiêu chuẩn biên tập của Đô Thị Hòa Lạc.
                    </p>
                  </div>
                </div>
              ) : null}

              {showStandaloneCover ? (
                <div className="article-view-cover">
                  <ContentImage
                    media={item.thumbnailMediaId}
                    alt={displayTitle}
                    ratio="hero"
                    loading="eager"
                    sizes="(max-width: 980px) 100vw, 1120px"
                  />
                </div>
              ) : null}

              <div className="article-view-content">
                <div className="article-view-body">
                  <ArticleBody html={bodyHtml} />
                </div>

                {item.article?.sourceNote ? (
                  <div className="article-view-source-note">
                    <Link2 size={18} />
                    <div>
                      <strong>Nguồn và ghi chú</strong>
                      <p>{normalizeDisplayText(item.article.sourceNote)}</p>
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
                      {tagItems.map((tag) => (
                        <span key={tag.id}>{tag.name}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="article-view-reactions">
                <ReactionBar content={item} />
              </div>
            </div>

            <div className="article-view-comments">
              <CommentsSection
                contentId={item._id}
                allowComments={item.allowComments}
              />
            </div>
          </article>

          <aside
            className="article-view-sidebar article-popular-sidebar-shell"
            aria-label="Bài viết xem nhiều"
          >
            <div className="article-view-sidebar__sticky">
              <section className="article-popular-sidebar">
                <header className="article-popular-sidebar__header">
                  <div>
                    <span>Tin đáng chú ý</span>
                    <h2>Xem nhiều</h2>
                  </div>
                  <Link to="/tin-tuc">Xem tất cả</Link>
                </header>

                <div className="article-popular-sidebar__accent" />

                <div className="article-popular-sidebar__list">
                  {sidebarLoading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <div
                          className="article-popular-sidebar__skeleton"
                          key={`popular-loading-${index}`}
                          aria-hidden="true"
                        >
                          <span />
                          <div>
                            <i />
                            <i />
                            <i />
                          </div>
                        </div>
                      ))
                    : visibleSidebarArticles.map((article) => {
                        const sidebarCoverUrl = mediaUrl(article.thumbnailMediaId);
                        const views = getViewCount(article);

                        return (
                          <Link
                            className="article-popular-sidebar__item"
                            to={`/tin-tuc/${article.slug}`}
                            key={getArticleId(article)}
                          >
                            <div className="article-popular-sidebar__thumb">
                              {sidebarCoverUrl ? (
                                <ContentImage
                                  media={article.thumbnailMediaId}
                                  alt=""
                                  loading="lazy"
                                  sizes="(max-width: 980px) 112px, 150px"
                                />
                              ) : (
                                <span>
                                  <Newspaper size={22} />
                                </span>
                              )}
                            </div>

                            <div className="article-popular-sidebar__copy">
                              <span>
                                {normalizeDisplayText(
                                  article.primaryCategoryId?.name || 'Tin tức',
                                )}
                              </span>
                              <h3>{normalizeDisplayText(article.title)}</h3>
                              <small>
                                <Eye size={13} />
                                {views.toLocaleString('vi-VN')} lượt xem
                              </small>
                            </div>
                          </Link>
                        );
                      })}

                  {!sidebarLoading && !visibleSidebarArticles.length ? (
                    <div className="article-popular-sidebar__empty">
                      Chưa có đủ bài viết để hiển thị mục xem nhiều.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </aside>
        </div>

        {!sidebarLoading ? (
          <section
            className="article-view-more"
            aria-labelledby="article-view-more-title"
          >
            <header className="article-view-more__header">
              <div>
                <span>Đọc tiếp</span>
                <h2 id="article-view-more-title">Bài viết liên quan</h2>
              </div>
              <Link to="/tin-tuc">Xem tất cả tin tức</Link>
            </header>

            {relatedArticles.length ? (
              <div className="article-view-more__grid">
                {relatedArticles.map((article) => {
                  const relatedCoverUrl = mediaUrl(article.thumbnailMediaId);
                  const relatedViews = getViewCount(article);

                  return (
                    <Link
                      className="article-view-more__card"
                      to={`/tin-tuc/${article.slug}`}
                      key={`related-${getArticleId(article)}`}
                    >
                      <div className="article-view-more__thumb">
                        {relatedCoverUrl ? (
                          <ContentImage
                            media={article.thumbnailMediaId}
                            alt=""
                            loading="lazy"
                            sizes="(max-width: 720px) 100vw, 320px"
                          />
                        ) : (
                          <span>
                            <Newspaper size={26} />
                          </span>
                        )}
                      </div>

                      <div className="article-view-more__copy">
                        <span>
                          {normalizeDisplayText(
                            article.primaryCategoryId?.name || 'Tin tức',
                          )}
                        </span>
                        <h3>{normalizeDisplayText(article.title)}</h3>
                        <small>
                          <Eye size={13} />
                          {relatedViews.toLocaleString('vi-VN')} lượt xem
                        </small>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="article-view-more__fallback">
                <p>
                  Xem thêm các tin mới, quy hoạch, hạ tầng và đời sống tại Hòa Lạc.
                </p>
                <Link to="/tin-tuc">Khám phá tin mới</Link>
              </div>
            )}
          </section>
        ) : null}
      </div>

      {showScrollTop ? (
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
