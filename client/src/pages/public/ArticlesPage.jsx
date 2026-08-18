import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  Newspaper,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import ContentImage from '../../components/content/ContentImage';
import ContentMeta from '../../components/content/ContentMeta';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { articleApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { contentPath } from '../../utils/content';
import { truncate } from '../../utils/formatters';
import {
  ARTICLE_CATEGORY_PAGE_COPY,
  ARTICLE_CATEGORY_RAIL,
  ARTICLE_DEFAULT_PAGE_COPY,
} from '../../utils/constants';

import './ArticlesPageV3.css';

const PAGE_SIZE = 12;

function valueOf(item) {
  return String(item?.slug || item?._id || item?.id || '');
}

function findTaxonomy(items, value) {
  return items.find(
    (item) =>
      valueOf(item) === String(value) ||
      String(item?._id || item?.id || '') === String(value),
  );
}

function getDateRange(value) {
  if (!value) return null;

  const start = new Date(`${value}T00:00:00`);
  const end = new Date(`${value}T23:59:59.999`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    publishedFrom: start.toISOString(),
    publishedTo: end.toISOString(),
  };
}

function getPageCopy(category, categoryName) {
  if (!category) return ARTICLE_DEFAULT_PAGE_COPY;
  if (ARTICLE_CATEGORY_PAGE_COPY[category]) {
    return ARTICLE_CATEGORY_PAGE_COPY[category];
  }

  const name = categoryName || 'Chuyên mục tin tức';
  return {
    ...ARTICLE_DEFAULT_PAGE_COPY,
    theme: 'news',
    seoTitle: `${name} | Đô Thị Hòa Lạc`,
    seoDescription: `Tin mới thuộc chuyên mục ${name} tại khu vực Đô Thị Hòa Lạc.`,
    eyebrow: name,
    title: name,
    description: `Những cập nhật mới nhất thuộc chuyên mục ${name}, ưu tiên thông tin gắn với Hòa Lạc và khu vực lân cận.`,
    latestTitle: `${name} mới nhất`,
    filteredTitle: `${name} theo bộ lọc`,
  };
}

function StoryImage({ item, className = '', eager = false }) {
  return (
    <ContentImage
      media={item?.thumbnailMediaId}
      alt={item?.title}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      fallback={
        <div className={`${className} news-story__image-fallback`} aria-hidden="true">
          <Newspaper size={28} />
        </div>
      }
    />
  );
}

function StoryCard({ item, variant = 'feed', eager = false }) {
  if (!item) return null;

  const href = contentPath(item);
  const Heading = variant === 'lead' ? 'h2' : 'h3';
  const category = item?.primaryCategoryId?.name || 'Tin Hòa Lạc';

  return (
    <article className={`news-story news-story--${variant}`}>
      <Link className="news-story__media" to={href} aria-label={item.title}>
        <StoryImage item={item} className="news-story__image" eager={eager} />
      </Link>

      <div className="news-story__body">
        <div className="news-story__kicker">
          <span>{category}</span>
          {item?.isSponsored ? <i>Tài trợ</i> : null}
        </div>

        <Heading>
          <Link to={href}>{item.title}</Link>
        </Heading>

        {(variant === 'lead' || variant === 'feed') && item.summary ? (
          <p>{truncate(item.summary, variant === 'lead' ? 210 : 150)}</p>
        ) : null}

        <ContentMeta item={item} compact={variant !== 'lead'} />
      </div>
    </article>
  );
}

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories = [], areas = [] } = useTaxonomy();
  const resultsRef = useRef(null);

  const articleCategories = useMemo(
    () =>
      categories.filter((item) =>
        ['article', 'all'].includes(item.contentScope),
      ),
    [categories],
  );

  const category = searchParams.get('category') || '';
  const area = searchParams.get('area') || '';
  const date = searchParams.get('date') || '';
  const sort = searchParams.get('sort') || '';
  const query = searchParams.get('q') || '';

  const [searchDraft, setSearchDraft] = useState(query);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

  const categoryItem = useMemo(
    () => findTaxonomy(articleCategories, category),
    [articleCategories, category],
  );
  const areaItem = useMemo(
    () => findTaxonomy(areas, area),
    [areas, area],
  );

  const categoryName =
    categoryItem?.name ||
    ARTICLE_CATEGORY_RAIL.find((item) => item.slug === category)?.label ||
    '';
  const pageCopy = useMemo(
    () => getPageCopy(category, categoryName),
    [category, categoryName],
  );

  const listParams = useMemo(() => {
    const params = { limit: PAGE_SIZE };
    const page = searchParams.get('page');
    const range = getDateRange(date);

    if (category) params.category = categoryItem?._id || category;
    if (area) params.area = areaItem?._id || area;
    if (sort) params.sort = sort;
    if (query) params.q = query;
    if (page) params.page = page;
    if (range) Object.assign(params, range);

    return params;
  }, [searchParams, category, categoryItem, area, areaItem, sort, query, date]);

  const result = useListPage(articleApi.list, listParams);

  const updateUrl = useCallback(
    (values) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        Object.entries(values).forEach(([key, value]) => {
          if (value === '' || value === null || value === undefined) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        });

        next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const onPageChange = useCallback(
    (page) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (Number(page) <= 1) next.delete('page');
        else next.set('page', String(page));
        return next;
      });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 20);
    },
    [setSearchParams],
  );

  const total = Number(result.meta?.total || 0);
  const currentPage = Number(result.meta?.page || 1);
  const totalPages = Math.max(1, Number(result.meta?.totalPages || 1));
  const hasSecondaryFilter = Boolean(area || date || sort || query);
  const editorialMode = currentPage === 1 && !hasSecondaryFilter;

  const leadStory = editorialMode ? result.items[0] : null;
  const sideStories = editorialMode ? result.items.slice(1, 3) : [];
  const streamStories = editorialMode ? result.items.slice(3) : result.items;

  const resultTitle = query
    ? `Kết quả cho “${query}”`
    : hasSecondaryFilter
      ? pageCopy.filteredTitle
      : pageCopy.latestTitle;

  const submitSearch = (event) => {
    event.preventDefault();
    updateUrl({ q: searchDraft.trim() });
  };

  const clearSecondaryFilters = () => {
    setSearchDraft('');
    updateUrl({ q: '', area: '', date: '', sort: '' });
    setFiltersOpen(false);
  };

  return (
    <section className={`news-hub news-hub--${pageCopy.theme || 'news'}`}>
      <Seo title={pageCopy.seoTitle} description={pageCopy.seoDescription} />

      <div className="news-hub__container">
        <header className="news-masthead">
          <div className="news-masthead__identity">
            <span className="news-masthead__eyebrow">
              <Sparkles size={15} />
              {category ? 'Chuyên mục' : 'Dòng tin Hòa Lạc'}
            </span>
            <h1>{category ? categoryName || pageCopy.title : 'Tin tức'}</h1>
            <p>{pageCopy.description}</p>
          </div>

          <form className="news-masthead__search" onSubmit={submitSearch} role="search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder={pageCopy.searchPlaceholder || 'Tìm tin, dự án, địa bàn...'}
              aria-label="Tìm kiếm tin tức"
            />
            <button type="submit" disabled={!searchDraft.trim()}>
              Tìm
            </button>
          </form>
        </header>

        <div className="news-category-bar">
          <nav aria-label="Chuyên mục tin tức">
            <button
              type="button"
              className={!category ? 'is-active' : ''}
              onClick={() => updateUrl({ category: '' })}
            >
              Mới nhất
            </button>
            {ARTICLE_CATEGORY_RAIL.map((item) => (
              <button
                type="button"
                key={item.slug}
                className={category === item.slug ? 'is-active' : ''}
                onClick={() => updateUrl({ category: item.slug })}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className={filtersOpen || hasSecondaryFilter ? 'news-filter-toggle is-active' : 'news-filter-toggle'}
            onClick={() => setFiltersOpen((value) => !value)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={16} />
            Bộ lọc
          </button>
        </div>

        {filtersOpen || hasSecondaryFilter ? (
          <section className="news-filter-panel" aria-label="Bộ lọc tin tức">
            <label>
              <span><MapPin size={14} /> Khu vực</span>
              <select value={area} onChange={(event) => updateUrl({ area: event.target.value })}>
                <option value="">Tất cả khu vực</option>
                {areas.map((item) => (
                  <option key={item._id || valueOf(item)} value={valueOf(item)}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span><CalendarDays size={14} /> Ngày đăng</span>
              <input type="date" value={date} onChange={(event) => updateUrl({ date: event.target.value })} />
            </label>

            <label>
              <span>{sort === 'popular' ? <TrendingUp size={14} /> : <Clock3 size={14} />} Sắp xếp</span>
              <select value={sort} onChange={(event) => updateUrl({ sort: event.target.value })}>
                <option value="">Mới nhất</option>
                <option value="popular">Đọc nhiều</option>
              </select>
            </label>

            {hasSecondaryFilter ? (
              <button type="button" className="news-filter-reset" onClick={clearSecondaryFilters}>
                <RotateCcw size={15} />
                Xóa lọc
              </button>
            ) : null}
          </section>
        ) : null}

        {result.loading ? (
          <div className="news-hub__loading"><LoadingBlock /></div>
        ) : result.error ? (
          <div className="news-hub__error">
            <ErrorState error={result.error} />
            <button type="button" onClick={result.reload}>Tải lại</button>
          </div>
        ) : result.items.length ? (
          <>
            {editorialMode && leadStory ? (
              <section className="news-lead-grid" aria-label="Tin nổi bật">
                <StoryCard item={leadStory} variant="lead" eager />
                <div className="news-lead-grid__side">
                  {sideStories.map((item) => (
                    <StoryCard key={item._id} item={item} variant="side" />
                  ))}
                </div>
              </section>
            ) : null}

            <section ref={resultsRef} className="news-stream">
              <header className="news-stream__heading">
                <div>
                  <span><Filter size={14} /> {pageCopy.resultsEyebrow || 'Dòng tin cập nhật'}</span>
                  <h2>{resultTitle}</h2>
                </div>
                <p>{total.toLocaleString('vi-VN')} bài viết</p>
              </header>

              {streamStories.length ? (
                <div className="news-stream__list">
                  {streamStories.map((item) => (
                    <StoryCard key={item._id} item={item} variant="feed" />
                  ))}
                </div>
              ) : editorialMode ? (
                <div className="news-stream__continue">
                  <span>Bạn đã xem các tin nổi bật mới nhất.</span>
                  {totalPages > 1 ? (
                    <button type="button" onClick={() => onPageChange(2)}>
                      Xem thêm tin <ChevronRight size={16} />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>

            {totalPages > 1 ? (
              <div className="news-pagination">
                <Pagination
                  meta={{ ...result.meta, page: currentPage, totalPages, total }}
                  onPageChange={onPageChange}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="news-hub__empty">
            <EmptyState
              title="Chưa có tin phù hợp"
              description="Hãy thử một chuyên mục khác hoặc xóa bớt điều kiện lọc."
            />
            {hasSecondaryFilter ? (
              <button type="button" onClick={clearSecondaryFilters}>Xóa bộ lọc</button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
