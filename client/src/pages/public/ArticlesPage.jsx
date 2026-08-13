import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  Grid3X3,
  List,
  MapPin,
  Newspaper,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tags,
  TrendingUp,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import ArticleCard from '../../components/content/ArticleCard';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import { articleApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';
import {
  ARTICLE_CATEGORY_PAGE_COPY,
  ARTICLE_CATEGORY_RAIL,
  ARTICLE_DEFAULT_PAGE_COPY,
} from '../../utils/constants';

import './ArticlesPageV3.css';

const PAGE_SIZE = 12;
const VIEW_MODE_KEY = 'dothihoalac.article-view-mode';

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
    seoTitle: `${name} | Đô Thị Hòa Lạc`,
    seoDescription: `Tin mới thuộc chuyên mục ${name} tại khu vực Đô Thị Hòa Lạc.`,
    eyebrow: name,
    title: `${name} tại khu vực Đô Thị Hòa Lạc`,
    description: `Tổng hợp thông tin mới thuộc chuyên mục ${name}, ưu tiên những nội dung gắn với địa bàn và thay đổi có ảnh hưởng trực tiếp đến khu vực.`,
    resultsEyebrow: name,
    latestTitle: `${name} mới nhất`,
    filteredTitle: `${name} theo bộ lọc`,
  };
}

function facetMap(rows) {
  return new Map(
    (Array.isArray(rows) ? rows : []).map((row) => [
      String(row?.id || ''),
      Number(row?.count || 0),
    ]),
  );
}

function facetCount(map, item) {
  const id = String(item?._id || item?.id || '');
  return id ? Number(map.get(id) || 0) : 0;
}

function isSelected(item, value) {
  if (!value) return false;
  return (
    valueOf(item) === String(value) ||
    String(item?._id || item?.id || '') === String(value)
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
  const isCategoryPage = Boolean(category);

  const [searchDraft, setSearchDraft] = useState(query);
  const [categoryDraft, setCategoryDraft] = useState(category);
  const [areaDraft, setAreaDraft] = useState(area);
  const [dateDraft, setDateDraft] = useState(date);
  const [sortDraft, setSortDraft] = useState(sort);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === 'list'
        ? 'list'
        : 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    setSearchDraft(query);
    setCategoryDraft(category);
    setAreaDraft(area);
    setDateDraft(date);
    setSortDraft(sort);
  }, [query, category, area, date, sort]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Không chặn giao diện nếu localStorage bị vô hiệu hóa.
    }
  }, [viewMode]);

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
  const areaName = areaItem?.name || '';
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

  const categoryCounts = useMemo(
    () => facetMap(result.meta?.facets?.categories),
    [result.meta?.facets?.categories],
  );
  const areaCounts = useMemo(
    () => facetMap(result.meta?.facets?.areas),
    [result.meta?.facets?.areas],
  );

  const categoryOptions = useMemo(
    () =>
      articleCategories.filter((item) => {
        const count = facetCount(categoryCounts, item);
        return result.loading || count > 0 || isSelected(item, category);
      }),
    [articleCategories, categoryCounts, result.loading, category],
  );

  const areaOptions = useMemo(
    () =>
      areas.filter((item) => {
        const count = facetCount(areaCounts, item);
        return result.loading || count > 0 || isSelected(item, area);
      }),
    [areas, areaCounts, result.loading, area],
  );

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

        next.delete('categories');
        next.delete('areas');
        next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const applyFilters = useCallback(() => {
    updateUrl({
      category: categoryDraft,
      area: areaDraft,
      date: dateDraft,
      sort: sortDraft,
    });
  }, [categoryDraft, areaDraft, dateDraft, sortDraft, updateUrl]);

  const clearFilters = useCallback(() => {
    setAreaDraft('');
    setDateDraft('');
    setSortDraft('');
    updateUrl({ area: '', date: '', sort: '' });
  }, [updateUrl]);

  const clearAll = useCallback(() => {
    setSearchDraft('');
    setCategoryDraft('');
    setAreaDraft('');
    setDateDraft('');
    setSortDraft('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const onPageChange = useCallback(
    (page) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (Number(page) <= 1) next.delete('page');
        else next.set('page', String(page));
        return next;
      });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 30);
    },
    [setSearchParams],
  );

  const total = Number(result.meta?.total || 0);
  const currentPage = Number(result.meta?.page || 1);
  const totalPages = Math.max(1, Number(result.meta?.totalPages || 1));
  const limit = Number(result.meta?.limit || PAGE_SIZE);
  const pageStart = total ? (currentPage - 1) * limit + 1 : 0;
  const pageEnd = total ? Math.min(total, currentPage * limit) : 0;
  const hasSecondaryFilter = Boolean(area || date || sort || query);

  const resultTitle = query
    ? `Kết quả cho “${query}”`
    : hasSecondaryFilter
      ? pageCopy.filteredTitle
      : pageCopy.latestTitle;

  return (
    <section
      className={`articles-page articles-page-v3 articles-page--${pageCopy.theme}`}
    >
      <Seo title={pageCopy.seoTitle} description={pageCopy.seoDescription} />

      <div className="articles-page__container">
        {!isCategoryPage ? (
          <>
            <header className="articles-hero articles-v3-hero">
              <div className="articles-hero__content">
                <span className="articles-hero__eyebrow">
                  <Newspaper size={15} />
                  {pageCopy.eyebrow}
                </span>
                <h1>{pageCopy.title}</h1>
                <p>{pageCopy.description}</p>
              </div>

              <form
                className="articles-hero__search articles-v3-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateUrl({ q: searchDraft.trim() });
                }}
              >
                <Search size={19} />
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder={pageCopy.searchPlaceholder}
                  aria-label="Tìm kiếm tin tức"
                />
                <button
                  type="submit"
                  className="articles-hero__search-submit"
                  disabled={!searchDraft.trim()}
                >
                  <Search size={16} />
                  Tìm kiếm
                </button>
              </form>
            </header>

            <div className="articles-v3-category-shell">
              <span className="articles-v3-category-label">Theo chuyên mục</span>
              <nav
                className="articles-category-rail articles-v3-category-rail"
                aria-label="Chuyên mục tin tức"
              >
                <button
                  type="button"
                  className={!category ? 'is-active' : ''}
                  onClick={() => {
                    setCategoryDraft('');
                    updateUrl({ category: '' });
                  }}
                >
                  Tin mới
                </button>
                {ARTICLE_CATEGORY_RAIL.map((item) => (
                  <button
                    type="button"
                    key={item.slug}
                    className={category === item.slug ? 'is-active' : ''}
                    onClick={() => {
                      setCategoryDraft(item.slug);
                      updateUrl({ category: item.slug });
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <section
              className="articles-v3-filterbar"
              aria-label="Bộ lọc tin tức"
            >
              <div className="articles-v3-filterbar__title">
                <SlidersHorizontal size={17} />
                <strong>Lọc nội dung</strong>
              </div>

              <label className="articles-v3-field">
                <span>Chuyên mục</span>
                <div>
                  <Tags size={16} />
                  <select
                    value={categoryDraft}
                    onChange={(event) => setCategoryDraft(event.target.value)}
                  >
                    <option value="">Tất cả chuyên mục</option>
                    {categoryOptions.map((item) => (
                      <option
                        key={item._id || valueOf(item)}
                        value={valueOf(item)}
                      >
                        {item.name} ({facetCount(categoryCounts, item)})
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="articles-v3-field">
                <span>Khu vực</span>
                <div>
                  <MapPin size={16} />
                  <select
                    value={areaDraft}
                    onChange={(event) => setAreaDraft(event.target.value)}
                  >
                    <option value="">Tất cả khu vực</option>
                    {areaOptions.map((item) => (
                      <option
                        key={item._id || valueOf(item)}
                        value={valueOf(item)}
                      >
                        {item.name} ({facetCount(areaCounts, item)})
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="articles-v3-field articles-v3-date-field">
                <span>Ngày đăng</span>
                <div>
                  <CalendarDays size={16} />
                  <input
                    type="date"
                    value={dateDraft}
                    onChange={(event) => setDateDraft(event.target.value)}
                  />
                </div>
              </label>

              <label className="articles-v3-field">
                <span>Sắp xếp</span>
                <div>
                  {sortDraft === 'popular' ? (
                    <TrendingUp size={16} />
                  ) : (
                    <Clock3 size={16} />
                  )}
                  <select
                    value={sortDraft}
                    onChange={(event) => setSortDraft(event.target.value)}
                  >
                    <option value="">Mới nhất</option>
                    <option value="popular">Đọc nhiều</option>
                  </select>
                </div>
              </label>

              <div className="articles-v3-filterbar__actions">
                <button
                  type="button"
                  className="is-primary"
                  onClick={applyFilters}
                >
                  <SlidersHorizontal size={16} />
                  Lọc tin
                </button>
                {hasSecondaryFilter ? (
                  <button
                    type="button"
                    className="is-reset"
                    onClick={clearFilters}
                  >
                    <RotateCcw size={15} />
                    Xóa lọc
                  </button>
                ) : null}
              </div>
            </section>

            {hasSecondaryFilter ? (
              <div className="articles-v3-active-filter">
                <span>Đang xem:</span>
                {areaName ? <b>{areaName}</b> : null}
                {date ? <b>{date.split('-').reverse().join('/')}</b> : null}
                {sort === 'popular' ? <b>Đọc nhiều</b> : null}
                {query ? <b>“{query}”</b> : null}
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft('');
                    setAreaDraft('');
                    setDateDraft('');
                    setSortDraft('');
                    updateUrl({ q: '', area: '', date: '', sort: '' });
                  }}
                >
                  Xóa tất cả bộ lọc phụ
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        <section
          ref={resultsRef}
          className="articles-results articles-v3-results"
        >
          <header className="articles-results__header articles-v3-results__header">
            <div>
              <span className="articles-results__eyebrow">
                <Newspaper size={14} />
                {pageCopy.resultsEyebrow}
              </span>
              <h2>
                {resultTitle}
                {!result.loading && !result.error ? (
                  <small>{total.toLocaleString('vi-VN')} bài viết</small>
                ) : null}
              </h2>
            </div>

            <div className="articles-view-switch">
              <button
                type="button"
                className={viewMode === 'grid' ? 'is-active' : ''}
                aria-label="Xem dạng lưới"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 size={17} />
              </button>
              <button
                type="button"
                className={viewMode === 'list' ? 'is-active' : ''}
                aria-label="Xem dạng danh sách"
                onClick={() => setViewMode('list')}
              >
                <List size={18} />
              </button>
            </div>
          </header>

          <div className="articles-results__body articles-v3-results__body">
            {result.loading ? (
              <LoadingBlock />
            ) : result.error ? (
              <ErrorState error={result.error} onRetry={result.reload} />
            ) : result.items.length ? (
              <div className={`articles-content-grid is-${viewMode}`}>
                {result.items.map((item) => (
                  <article className="articles-content-item" key={item._id}>
                    <ArticleCard item={item} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="articles-empty-state">
                <span>
                  <Newspaper size={34} />
                </span>
                <h3>Chưa có bài viết phù hợp</h3>
                <p>Thử đổi ngày đăng, khu vực hoặc chuyển sang chuyên mục khác.</p>
                <button type="button" onClick={clearAll}>
                  <RotateCcw size={16} />
                  Làm mới bộ lọc
                </button>
              </div>
            )}
          </div>
        </section>

        {!result.loading && !result.error && result.items.length ? (
          <div className="articles-pagination">
            <div className="articles-pagination__summary">
              Hiển thị <strong>{pageStart}-{pageEnd}</strong> trong{' '}
              <strong>{total.toLocaleString('vi-VN')}</strong> bài viết
              {totalPages > 1 ? (
                <>
                  {' '}· Trang <strong>{currentPage}/{totalPages}</strong>
                </>
              ) : null}
            </div>
            <Pagination meta={result.meta} onPageChange={onPageChange} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
