import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useSearchParams,
} from 'react-router-dom';

import {
  Clock3,
  Filter,
  Grid3X3,
  List,
  MapPin,
  Newspaper,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tags,
  TrendingUp,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import ArticleCard from '../../components/content/ArticleCard';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import MultiSelectFilter from '../../components/filters/MultiSelectFilter';

import { articleApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';

import './ArticlesPage.css';

const VIEW_MODE_KEY =
  'dothihoalac.article-view-mode';

const SORT_OPTIONS = [
  {
    value: '',
    label: 'Mới nhất',
    icon: Clock3,
  },
  {
    value: 'popular',
    label: 'Đọc nhiều',
    icon: TrendingUp,
  },
];

function parseCsv(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getItemId(item) {
  return String(
    item?._id ||
      item?.id ||
      '',
  );
}

function getItemUrlValue(item) {
  return String(
    item?.slug ||
      item?._id ||
      item?.id ||
      '',
  );
}

function findTaxonomyItem(items, value) {
  return items.find(
    (item) =>
      String(item?.slug || '') ===
        String(value) ||
      getItemId(item) === String(value),
  );
}

function getTotal(meta, itemCount) {
  return Number(
    meta?.total ??
      meta?.totalItems ??
      meta?.itemCount ??
      itemCount ??
      0,
  );
}

function getCurrentPage(meta, searchParams) {
  return Number(
    meta?.page ??
      meta?.currentPage ??
      searchParams.get('page') ??
      1,
  );
}

function getLimit(meta, itemCount) {
  return Number(
    meta?.limit ??
      meta?.pageSize ??
      meta?.perPage ??
      itemCount ??
      0,
  );
}

export default function ArticlesPage() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const {
    categories = [],
    areas = [],
  } = useTaxonomy();

  const resultsRef = useRef(null);

  const [
    filterPanelOpen,
    setFilterPanelOpen,
  ] = useState(false);

  const [
    searchInput,
    setSearchInput,
  ] = useState(
    searchParams.get('q') || '',
  );

  const [
    viewMode,
    setViewMode,
  ] = useState(() => {
    try {
      const savedMode =
        localStorage.getItem(
          VIEW_MODE_KEY,
        );

      return ['grid', 'list'].includes(
        savedMode,
      )
        ? savedMode
        : 'grid';
    } catch {
      return 'grid';
    }
  });

  const articleCategories = useMemo(
    () =>
      categories.filter(
        (item) =>
          item.contentScope ===
          'article',
      ),
    [categories],
  );

  const categoryOptions = useMemo(
    () =>
      articleCategories.map(
        (item) => ({
          value:
            getItemUrlValue(item),

          label:
            item.name ||
            item.title ||
            'Chuyên mục',

          searchText: [
            item.name,
            item.slug,
          ]
            .filter(Boolean)
            .join(' '),
        }),
      ),
    [articleCategories],
  );

  const areaOptions = useMemo(
    () =>
      areas.map((item) => ({
        value:
          getItemUrlValue(item),

        label:
          item.name ||
          item.title ||
          'Khu vực',

        searchText: [
          item.name,
          item.slug,
          item.parentName,
        ]
          .filter(Boolean)
          .join(' '),
      })),
    [areas],
  );

  /*
   * Hỗ trợ cả URL mới:
   * ?categories=quy-hoach,ha-tang
   *
   * Và URL cũ:
   * ?category=quy-hoach
   */
  const selectedCategories =
    useMemo(() => {
      const newValue =
        searchParams.get(
          'categories',
        );

      const legacyValue =
        searchParams.get(
          'category',
        );

      return parseCsv(
        newValue || legacyValue,
      );
    }, [searchParams]);

  const selectedAreas =
    useMemo(() => {
      const newValue =
        searchParams.get('areas');

      const legacyValue =
        searchParams.get('area');

      return parseCsv(
        newValue || legacyValue,
      );
    }, [searchParams]);

  const currentQuery =
    searchParams.get('q') || '';

  const currentSort =
    searchParams.get('sort') || '';

  /*
   * Chuyển slug trên URL thành ID để gửi API.
   * Nếu chưa tìm thấy taxonomy tương ứng,
   * giữ nguyên giá trị URL.
   */
  const categoryApiValues =
    useMemo(
      () =>
        selectedCategories.map(
          (value) => {
            const matched =
              findTaxonomyItem(
                articleCategories,
                value,
              );

            return matched?._id || value;
          },
        ),
      [
        selectedCategories,
        articleCategories,
      ],
    );

  const areaApiValues = useMemo(
    () =>
      selectedAreas.map((value) => {
        const matched =
          findTaxonomyItem(
            areas,
            value,
          );

        return matched?._id || value;
      }),
    [selectedAreas, areas],
  );

  const searchKey =
    searchParams.toString();

  const params = useMemo(() => {
    const source =
      new URLSearchParams(
        searchKey,
      );

    const nextParams = {};

    /*
     * API mới: hỗ trợ nhiều taxonomy.
     */
    if (categoryApiValues.length) {
      nextParams.categories =
        categoryApiValues.join(',');
    }

    if (areaApiValues.length) {
      nextParams.areas =
        areaApiValues.join(',');
    }

    /*
     * Tương thích backend cũ khi chỉ
     * chọn duy nhất một giá trị.
     */
    if (
      categoryApiValues.length === 1
    ) {
      nextParams.category =
        categoryApiValues[0];
    }

    if (areaApiValues.length === 1) {
      nextParams.area =
        areaApiValues[0];
    }

    const sort =
      source.get('sort');

    const q =
      source.get('q');

    const page =
      source.get('page');

    if (sort) {
      nextParams.sort = sort;
    }

    if (q) {
      nextParams.q = q;
    }

    if (page) {
      nextParams.page = page;
    }

    return nextParams;
  }, [
    searchKey,
    categoryApiValues,
    areaApiValues,
  ]);

  const result = useListPage(
    articleApi.list,
    params,
  );

  /*
   * Đồng bộ ô tìm kiếm khi URL thay đổi
   * do Back/Forward hoặc nhấn chip.
   */
  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  const setUrlParams = useCallback(
    (mutator, options = {}) => {
      setSearchParams(
        (current) => {
          const next =
            new URLSearchParams(
              current,
            );

          mutator(next);

          /*
           * Không giữ page=1 trên URL.
           */
          if (
            next.get('page') === '1'
          ) {
            next.delete('page');
          }

          return next;
        },
        options,
      );
    },
    [setSearchParams],
  );

  const updateListFilter =
    useCallback(
      ({
        key,
        legacyKey,
        values,
      }) => {
        setUrlParams((next) => {
          next.delete(legacyKey);

          if (values.length) {
            next.set(
              key,
              values.join(','),
            );
          } else {
            next.delete(key);
          }

          next.delete('page');
        });
      },
      [setUrlParams],
    );

  const updateSingleFilter =
    useCallback(
      (key, value) => {
        setUrlParams((next) => {
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }

          next.delete('page');
        });
      },
      [setUrlParams],
    );

  const commitSearch =
    useCallback(
      (value, replace = true) => {
        const cleanValue =
          String(value || '').trim();

        setUrlParams(
          (next) => {
            if (cleanValue) {
              next.set(
                'q',
                cleanValue,
              );
            } else {
              next.delete('q');
            }

            next.delete('page');
          },
          {
            replace,
          },
        );
      },
      [setUrlParams],
    );

  /*
   * Debounce tìm kiếm 450 ms.
   */
  useEffect(() => {
    const cleanInput =
      searchInput.trim();

    if (cleanInput === currentQuery) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        commitSearch(
          cleanInput,
          true,
        );
      }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    searchInput,
    currentQuery,
    commitSearch,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(
        VIEW_MODE_KEY,
        viewMode,
      );
    } catch {
      // Không ảnh hưởng giao diện nếu
      // trình duyệt chặn localStorage.
    }
  }, [viewMode]);

  useEffect(() => {
    if (!filterPanelOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    const closeWithEscape = (
      event,
    ) => {
      if (event.key === 'Escape') {
        setFilterPanelOpen(false);
      }
    };

    document.body.style.overflow =
      'hidden';

    document.addEventListener(
      'keydown',
      closeWithEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        'keydown',
        closeWithEscape,
      );
    };
  }, [filterPanelOpen]);

  const handlePageChange =
    useCallback(
      (page) => {
        setUrlParams((next) => {
          if (Number(page) <= 1) {
            next.delete('page');
          } else {
            next.set(
              'page',
              String(page),
            );
          }
        });

        window.setTimeout(() => {
          resultsRef.current?.scrollIntoView(
            {
              behavior: 'smooth',
              block: 'start',
            },
          );
        }, 30);
      },
      [setUrlParams],
    );

  const toggleCategoryChip =
    useCallback(
      (value) => {
        const exists =
          selectedCategories.includes(
            value,
          );

        const nextValues = exists
          ? selectedCategories.filter(
              (item) => item !== value,
            )
          : [
              ...selectedCategories,
              value,
            ];

        updateListFilter({
          key: 'categories',
          legacyKey: 'category',
          values: nextValues,
        });
      },
      [
        selectedCategories,
        updateListFilter,
      ],
    );

  const clearAllFilters =
    useCallback(() => {
      setSearchInput('');

      setUrlParams((next) => {
        [
          'category',
          'categories',
          'area',
          'areas',
          'sort',
          'q',
          'page',
        ].forEach((key) => {
          next.delete(key);
        });
      });
    }, [setUrlParams]);

  const removeCategory =
    useCallback(
      (value) => {
        updateListFilter({
          key: 'categories',
          legacyKey: 'category',
          values:
            selectedCategories.filter(
              (item) =>
                item !== value,
            ),
        });
      },
      [
        selectedCategories,
        updateListFilter,
      ],
    );

  const removeArea = useCallback(
    (value) => {
      updateListFilter({
        key: 'areas',
        legacyKey: 'area',
        values:
          selectedAreas.filter(
            (item) => item !== value,
          ),
      });
    },
    [
      selectedAreas,
      updateListFilter,
    ],
  );

  const selectedCategoryItems =
    useMemo(
      () =>
        selectedCategories.map(
          (value) => {
            const item =
              findTaxonomyItem(
                articleCategories,
                value,
              );

            return {
              value,
              label:
                item?.name ||
                item?.title ||
                value,
            };
          },
        ),
      [
        selectedCategories,
        articleCategories,
      ],
    );

  const selectedAreaItems =
    useMemo(
      () =>
        selectedAreas.map(
          (value) => {
            const item =
              findTaxonomyItem(
                areas,
                value,
              );

            return {
              value,
              label:
                item?.name ||
                item?.title ||
                value,
            };
          },
        ),
      [selectedAreas, areas],
    );

  const activeFilterCount =
    selectedCategories.length +
    selectedAreas.length +
    (currentQuery ? 1 : 0) +
    (currentSort ? 1 : 0);

  const hasFilters =
    activeFilterCount > 0;

  const total = getTotal(
    result.meta,
    result.items.length,
  );

  const currentPage =
    getCurrentPage(
      result.meta,
      searchParams,
    );

  const limit = getLimit(
    result.meta,
    result.items.length,
  );

  const fromItem =
    total > 0
      ? (currentPage - 1) *
          Math.max(limit, 1) +
        1
      : 0;

  const toItem =
    total > 0
      ? Math.min(
          fromItem +
            result.items.length -
            1,
          total,
        )
      : 0;

  const popularCategories =
    articleCategories.slice(0, 7);

  return (
    <section className="articles-page">
      <Seo
        title="Tin tức Hòa Lạc"
        description="Tin quy hoạch, hạ tầng, bất động sản, đời sống và chính sách tại Hòa Lạc."
      />

      <div className="articles-page__container">
        <header className="articles-hero">
          <div className="articles-hero__content">
            <span className="articles-hero__eyebrow">
              <Newspaper size={16} />
              Tin tức địa phương
            </span>

            <h1>
              Chuyển động Đô Thị Hòa Lạc
            </h1>

            <p>
              Theo dõi quy hoạch, hạ tầng,
              bất động sản, chính sách và
              đời sống địa phương theo đúng
              chuyên mục, khu vực bạn quan
              tâm.
            </p>
          </div>

          <form
            className="articles-hero__search"
            onSubmit={(event) => {
              event.preventDefault();

              commitSearch(
                searchInput,
                false,
              );
            }}
          >
            <Search size={20} />

            <input
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value,
                )
              }
              placeholder="Tìm quy hoạch, dự án, hạ tầng..."
              aria-label="Tìm kiếm tin tức"
            />

            {searchInput ? (
              <button
                type="button"
                className="articles-hero__search-clear"
                aria-label="Xóa từ khóa"
                onClick={() => {
                  setSearchInput('');
                  commitSearch('');
                }}
              >
                <X size={17} />
              </button>
            ) : null}

            <button
              type="submit"
              className="articles-hero__search-submit"
            >
              <Search size={17} />
              Tìm kiếm
            </button>
          </form>
        </header>

        {popularCategories.length ? (
          <nav
            className="articles-category-rail"
            aria-label="Chuyên mục nổi bật"
          >
            <button
              type="button"
              className={
                selectedCategories.length ===
                0
                  ? 'is-active'
                  : ''
              }
              onClick={() =>
                updateListFilter({
                  key: 'categories',
                  legacyKey:
                    'category',
                  values: [],
                })
              }
            >
              Tất cả
            </button>

            {popularCategories.map(
              (item) => {
                const value =
                  getItemUrlValue(
                    item,
                  );

                const selected =
                  selectedCategories.includes(
                    value,
                  );

                return (
                  <button
                    type="button"
                    key={
                      item._id ||
                      value
                    }
                    className={
                      selected
                        ? 'is-active'
                        : ''
                    }
                    onClick={() =>
                      toggleCategoryChip(
                        value,
                      )
                    }
                  >
                    {item.name}
                  </button>
                );
              },
            )}
          </nav>
        ) : null}

        <div className="articles-mobile-filter-row">
          <button
            type="button"
            onClick={() =>
              setFilterPanelOpen(true)
            }
          >
            <SlidersHorizontal
              size={17}
            />

            Bộ lọc

            {activeFilterCount > 0 ? (
              <span>
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <label>
            <span>Sắp xếp</span>

            <select
              value={currentSort}
              onChange={(event) =>
                updateSingleFilter(
                  'sort',
                  event.target.value,
                )
              }
            >
              <option value="">
                Mới nhất
              </option>

              <option value="popular">
                Đọc nhiều
              </option>
            </select>
          </label>
        </div>

        <section
          className={[
            'articles-filter-panel',
            filterPanelOpen
              ? 'is-open'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Bộ lọc tin tức"
        >
          <div className="articles-filter-panel__mobile-header">
            <div>
              <Filter size={19} />

              <strong>
                Bộ lọc tin tức
              </strong>
            </div>

            <button
              type="button"
              aria-label="Đóng bộ lọc"
              onClick={() =>
                setFilterPanelOpen(false)
              }
            >
              <X size={21} />
            </button>
          </div>

          <div className="articles-filter-panel__heading">
            <div>
              <span>
                <SlidersHorizontal
                  size={17}
                />
              </span>

              <div>
                <h2>
                  Lọc nội dung
                </h2>

                <p>
                  Có thể chọn đồng thời
                  nhiều chuyên mục và khu
                  vực.
                </p>
              </div>
            </div>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
              >
                <RotateCcw size={16} />
                Xóa tất cả
              </button>
            ) : null}
          </div>

          <div className="articles-filter-grid">
            <MultiSelectFilter
              label="Chuyên mục"
              placeholder="Tất cả chuyên mục"
              icon={Tags}
              options={categoryOptions}
              selectedValues={
                selectedCategories
              }
              onChange={(values) =>
                updateListFilter({
                  key: 'categories',
                  legacyKey:
                    'category',
                  values,
                })
              }
              searchable
            />

            <MultiSelectFilter
              label="Khu vực"
              placeholder="Tất cả khu vực"
              icon={MapPin}
              options={areaOptions}
              selectedValues={
                selectedAreas
              }
              onChange={(values) =>
                updateListFilter({
                  key: 'areas',
                  legacyKey: 'area',
                  values,
                })
              }
              searchable
            />

            <label className="articles-sort-filter">
              <span>Sắp xếp</span>

              <div>
                {currentSort ===
                'popular' ? (
                  <TrendingUp size={18} />
                ) : (
                  <Clock3 size={18} />
                )}

                <select
                  value={currentSort}
                  onChange={(event) =>
                    updateSingleFilter(
                      'sort',
                      event.target.value,
                    )
                  }
                >
                  {SORT_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </label>
          </div>

          {hasFilters ? (
            <div className="articles-active-filters">
              <span className="articles-active-filters__label">
                Đang lọc:
              </span>

              {selectedCategoryItems.map(
                (item) => (
                  <button
                    type="button"
                    key={`category-${item.value}`}
                    onClick={() =>
                      removeCategory(
                        item.value,
                      )
                    }
                  >
                    <Tags size={14} />

                    {item.label}

                    <X size={14} />
                  </button>
                ),
              )}

              {selectedAreaItems.map(
                (item) => (
                  <button
                    type="button"
                    key={`area-${item.value}`}
                    onClick={() =>
                      removeArea(
                        item.value,
                      )
                    }
                  >
                    <MapPin size={14} />

                    {item.label}

                    <X size={14} />
                  </button>
                ),
              )}

              {currentQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    commitSearch('');
                  }}
                >
                  <Search size={14} />

                  “{currentQuery}”

                  <X size={14} />
                </button>
              ) : null}

              {currentSort ===
              'popular' ? (
                <button
                  type="button"
                  onClick={() =>
                    updateSingleFilter(
                      'sort',
                      '',
                    )
                  }
                >
                  <TrendingUp
                    size={14}
                  />

                  Đọc nhiều

                  <X size={14} />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="articles-filter-panel__mobile-actions">
            <button
              type="button"
              className="articles-filter-mobile-clear"
              onClick={clearAllFilters}
              disabled={!hasFilters}
            >
              Xóa bộ lọc
            </button>

            <button
              type="button"
              className="articles-filter-mobile-apply"
              onClick={() =>
                setFilterPanelOpen(false)
              }
            >
              Xem kết quả
            </button>
          </div>
        </section>

        {filterPanelOpen ? (
          <button
            type="button"
            className="articles-filter-overlay"
            aria-label="Đóng bộ lọc"
            onClick={() =>
              setFilterPanelOpen(false)
            }
          />
        ) : null}

        <section
          ref={resultsRef}
          className="articles-results"
        >
          <header className="articles-results__header">
            <div>
              <span className="articles-results__eyebrow">
                <Newspaper size={15} />
                Kết quả tin tức
              </span>

              <h2>
                {currentQuery
                  ? `Kết quả cho “${currentQuery}”`
                  : hasFilters
                    ? 'Tin tức theo bộ lọc'
                    : 'Tin tức mới nhất'}
              </h2>

              {!result.loading &&
              !result.error ? (
                <p>
                  {total > 0 ? (
                    <>
                      Hiển thị{' '}
                      <strong>
                        {fromItem}–
                        {toItem}
                      </strong>{' '}
                      trong tổng số{' '}
                      <strong>
                        {total.toLocaleString(
                          'vi-VN',
                        )}
                      </strong>{' '}
                      bài viết.
                    </>
                  ) : (
                    'Chưa có bài viết phù hợp.'
                  )}
                </p>
              ) : null}
            </div>

            <div className="articles-view-switch">
              <button
                type="button"
                className={
                  viewMode === 'grid'
                    ? 'is-active'
                    : ''
                }
                aria-label="Xem dạng lưới"
                title="Dạng lưới"
                onClick={() =>
                  setViewMode('grid')
                }
              >
                <Grid3X3 size={18} />
              </button>

              <button
                type="button"
                className={
                  viewMode === 'list'
                    ? 'is-active'
                    : ''
                }
                aria-label="Xem dạng danh sách"
                title="Dạng danh sách"
                onClick={() =>
                  setViewMode('list')
                }
              >
                <List size={19} />
              </button>
            </div>
          </header>

          <div className="articles-results__body">
            {result.loading ? (
              <LoadingBlock />
            ) : result.error ? (
              <ErrorState
                error={result.error}
                onRetry={result.reload}
              />
            ) : result.items.length ? (
              <div
                className={[
                  'articles-content-grid',
                  viewMode === 'list'
                    ? 'is-list'
                    : 'is-grid',
                ].join(' ')}
              >
                {result.items.map(
                  (item) => (
                    <article
                      className="articles-content-item"
                      key={item._id}
                    >
                      <ArticleCard
                        item={item}
                      />
                    </article>
                  ),
                )}
              </div>
            ) : (
              <div className="articles-empty-state">
                <span>
                  <Newspaper
                    size={37}
                  />
                </span>

                <h3>
                  Không tìm thấy bài viết
                </h3>

                <p>
                  Hãy thử bỏ bớt chuyên
                  mục, khu vực hoặc sử dụng
                  một từ khóa tìm kiếm
                  khác.
                </p>

                {hasFilters ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                  >
                    <RotateCcw
                      size={17}
                    />
                    Xóa tất cả bộ lọc
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </section>

        {!result.loading &&
        !result.error &&
        result.items.length ? (
          <div className="articles-pagination">
            <Pagination
              meta={result.meta}
              onPageChange={
                handlePageChange
              }
            />

            {result.meta?.totalPages ? (
              <p>
                Trang {currentPage} /{' '}
                {result.meta.totalPages}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}