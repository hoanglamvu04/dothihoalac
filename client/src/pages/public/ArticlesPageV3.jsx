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

const VIEW_MODE_KEY = 'dothihoalac.article-view-mode';

function itemValue(item) {
  return String(item?.slug || item?._id || item?.id || '');
}

function findItem(items, value) {
  return items.find(
    (item) =>
      itemValue(item) === String(value) ||
      String(item?._id || item?.id || '') === String(value),
  );
}

function getDateRange(dateValue) {
  if (!dateValue) return null;

  const start = new Date(`${dateValue}T00:00:00`);
  const end = new Date(`${dateValue}T23:59:59.999`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return null;
  }

  return {
    publishedFrom: start.toISOString(),
    publishedTo: end.toISOString(),
  };
}

export default function ArticlesPageV3() {
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

  const selectedCategory = searchParams.get('category') || '';
  const selectedArea = searchParams.get('area') || '';
  const selectedDate = searchParams.get('date') || '';
  const selectedSort = searchParams.get('sort') || '';
  const currentQuery = searchParams.get('q') || '';

  const [searchDraft, setSearchDraft] = useState(currentQuery);
  const [categoryDraft, setCategoryDraft] = useState(selectedCategory);
  const [areaDraft, setAreaDraft] = useState(selectedArea);
  const [dateDraft, setDateDraft] = useState(selectedDate);
  const [sortDraft, setSortDraft] = useState(selectedSort);

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
    setSearchDraft(currentQuery);
    setCategoryDraft(selectedCategory);
    setAreaDraft(selectedArea);
    setDateDraft(selectedDate);
    setSortDraft(selectedSort);
  }, [
    currentQuery,
    selectedCategory,
    selectedArea,
    selectedDate,
    selectedSort,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Không chặn hiển thị nếu localStorage bị vô hiệu hóa.
    }
  }, [viewMode]);

  const categoryApiValue = useMemo(() => {
    const item = findItem(articleCategories, selectedCategory);
    return item?._id || selectedCategory;
  }, [articleCategories, selectedCategory]);

  const areaApiValue = useMemo(() => {
    const item = findItem(areas, selectedArea);
    return item?._id || selectedArea;
  }, [areas, selectedArea]);

  const listParams = useMemo(() => {
    const params = {};
    const page = searchParams.get('page');
    const range = getDateRange(selectedDate);

    if (categoryApiValue) params.category = categoryApiValue;
    if (areaApiValue) params.area = areaApiValue;
    if (selectedSort) params.sort = selectedSort;
    if (currentQuery) params.q = currentQuery;
    if (page) params.page = page;

    if (range) {
      params.publishedFrom = range.publishedFrom;
      params.publishedTo = range.publishedTo;
    }

    return params;
  }, [
    searchParams,
    categoryApiValue,
    areaApiValue,
    selectedSort,
    currentQuery,
    selectedDate,
  ]);

  const result = useListPage(articleApi.list, listParams);

  const updateUrl = useCallback(
    (values, { replace = false } = {}) => {
      setSearchParams(
        (current) => {
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
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const handleSearchSubmit = useCallback(
    (event) => {
      event.preventDefault();
      updateUrl({ q: searchDraft.trim() });
    },
    [searchDraft, updateUrl],
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
    setCategoryDraft('');
    setAreaDraft('');
    setDateDraft('');
    setSortDraft('');

    updateUrl({
      category: '',
      area: '',
      date: '',
      sort: '',
    });
  }, [updateUrl]);

  const clearAll = useCallback(() => {
    setSearchDraft('');
    setCategoryDraft('');
    setAreaDraft('');
    setDateDraft('');
    setSortDraft('');

    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const handleCategoryRail = useCallback(
    (value) => {
      setCategoryDraft(value);
      updateUrl({ category: value });
    },
    [updateUrl],
  );

  const handlePageChange = useCallback(
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
  const hasFilter = Boolean(
    selectedCategory ||
      selectedArea ||
      selectedDate ||
      selectedSort ||
      currentQuery,
  );

  const selectedCategoryName =
    findItem(articleCategories, selectedCategory)?.name || '';
  const selectedAreaName = findItem(areas, selectedArea)?.name || '';

  const popularCategories = articleCategories.slice(0, 8);

  return (
    <section className="articles-page articles-page-v3">
      <Seo
        title="Tin tức Hòa Lạc"
        description="Tin quy hoạch, hạ tầng, bất động sản, đời sống và chính sách tại khu vực Đô Thị Hòa Lạc."
      />

      <div className="articles-page__container">
        <header className="articles-hero articles-v3-hero">
          <div className="articles-hero__content">
            <span className="articles-hero__eyebrow">
              <Newspaper size={15} />
              Tin tức địa phương
            </span>

            <h1>Chuyển động Đô Thị Hòa Lạc</h1>

            <p>
              Theo dõi quy hoạch, hạ tầng, bất động sản, chính sách
              và đời sống địa phương.
            </p>
          </div>

          <form
            className="articles-hero__search articles-v3-search"
            onSubmit={handleSearchSubmit}
          >
            <Search size={19} />

            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Tìm quy hoạch, dự án, địa điểm..."
              aria-label="Tìm kiếm tin tức"
            />

            <button
              type="submit"
              className="articles-hero__search-submit"
            >
              <Search size={16} />
              Tìm kiếm
            </button>
          </form>
        </header>

        <nav className="articles-category-rail articles-v3-category-rail">
          <button
            type="button"
            className={!selectedCategory ? 'is-active' : ''}
            onClick={() => handleCategoryRail('')}
          >
            Tất cả
          </button>

          {popularCategories.map((item) => {
            const value = itemValue(item);
            return (
              <button
                type="button"
                key={item._id || value}
                className={selectedCategory === value ? 'is-active' : ''}
                onClick={() => handleCategoryRail(value)}
              >
                {item.name}
              </button>
            );
          })}
        </nav>

        <section className="articles-v3-filterbar" aria-label="Bộ lọc tin tức">
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
                <option value="">Tất cả</option>
                {articleCategories.map((item) => (
                  <option key={item._id || itemValue(item)} value={itemValue(item)}>
                    {item.name}
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
                <option value="">Tất cả</option>
                {areas.map((item) => (
                  <option key={item._id || itemValue(item)} value={itemValue(item)}>
                    {item.name}
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
            <button type="button" className="is-primary" onClick={applyFilters}>
              <SlidersHorizontal size={16} />
              Lọc tin
            </button>

            {(selectedCategory || selectedArea || selectedDate || selectedSort) ? (
              <button type="button" className="is-reset" onClick={clearFilters}>
                <RotateCcw size={15} />
                Xóa lọc
              </button>
            ) : null}
          </div>
        </section>

        {hasFilter ? (
          <div className="articles-v3-active-filter">
            <span>Đang xem:</span>
            {selectedCategoryName ? <b>{selectedCategoryName}</b> : null}
            {selectedAreaName ? <b>{selectedAreaName}</b> : null}
            {selectedDate ? <b>{selectedDate.split('-').reverse().join('/')}</b> : null}
            {currentQuery ? <b>“{currentQuery}”</b> : null}
            <button type="button" onClick={clearAll}>Xóa tất cả</button>
          </div>
        ) : null}

        <section ref={resultsRef} className="articles-results articles-v3-results">
          <header className="articles-results__header articles-v3-results__header">
            <div>
              <span className="articles-results__eyebrow">
                <Newspaper size={14} />
                Kết quả tin tức
              </span>

              <h2>
                {currentQuery
                  ? `Kết quả cho “${currentQuery}”`
                  : hasFilter
                    ? 'Tin tức theo bộ lọc'
                    : 'Tin tức mới nhất'}
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
                <span><Newspaper size={34} /></span>
                <h3>Không tìm thấy bài viết phù hợp</h3>
                <p>Thử đổi từ khóa, ngày đăng, chuyên mục hoặc khu vực.</p>
                <button type="button" onClick={clearAll}>
                  <RotateCcw size={16} />
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>
        </section>

        {!result.loading && !result.error && result.items.length ? (
          <div className="articles-pagination">
            <Pagination meta={result.meta} onPageChange={handlePageChange} />
            {result.meta?.totalPages ? (
              <p>Trang {currentPage} / {result.meta.totalPages}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
