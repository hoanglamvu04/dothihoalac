import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  Building2,
  Clock3,
  FileCheck2,
  Filter,
  Grid3X3,
  Home,
  KeyRound,
  List,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Ruler,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import PropertyCard from '../../components/content/PropertyCard';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';

import { propertyApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';

import {
  LEGAL_STATUS,
  OWNER_TYPES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from '../../utils/constants';

import './PropertiesPage.css';

const VIEW_MODE_KEY =
  'dothihoalac.property-view-mode';

const QUERY_KEYS = [
  'transactionType',
  'propertyType',
  'area',
  'ownerType',
  'legalStatus',
  'minPrice',
  'maxPrice',
  'minArea',
  'maxArea',
  'sort',
  'q',
  'page',
];

const PRICE_PRESETS = [
  {
    label: 'Dưới 1 tỷ',
    min: '',
    max: '1000000000',
  },
  {
    label: '1–3 tỷ',
    min: '1000000000',
    max: '3000000000',
  },
  {
    label: '3–5 tỷ',
    min: '3000000000',
    max: '5000000000',
  },
  {
    label: '5–10 tỷ',
    min: '5000000000',
    max: '10000000000',
  },
  {
    label: 'Trên 10 tỷ',
    min: '10000000000',
    max: '',
  },
];

const AREA_PRESETS = [
  {
    label: 'Dưới 50 m²',
    min: '',
    max: '50',
  },
  {
    label: '50–100 m²',
    min: '50',
    max: '100',
  },
  {
    label: '100–200 m²',
    min: '100',
    max: '200',
  },
  {
    label: '200–500 m²',
    min: '200',
    max: '500',
  },
  {
    label: 'Trên 500 m²',
    min: '500',
    max: '',
  },
];

const SORT_OPTIONS = [
  {
    value: '',
    label: 'Mới nhất',
    icon: Clock3,
  },
  {
    value: 'price_asc',
    label: 'Giá tăng dần',
    icon: TrendingUp,
  },
  {
    value: 'price_desc',
    label: 'Giá giảm dần',
    icon: TrendingDown,
  },
];

const TRANSACTION_ICONS = {
  sale: Home,
  rent: KeyRound,
  transfer: RefreshCw,
  wanted_buy: Search,
  wanted_rent: Search,
};

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

function getPageSize(meta, itemCount) {
  return Number(
    meta?.limit ??
      meta?.pageSize ??
      meta?.perPage ??
      itemCount ??
      0,
  );
}

function sanitizeNumber(value) {
  const cleanValue =
    String(value ?? '').trim();

  if (!cleanValue) {
    return '';
  }

  const number = Number(cleanValue);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return '';
  }

  return String(number);
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '';
  }

  return new Intl.NumberFormat(
    'vi-VN',
    {
      maximumFractionDigits: 2,
    },
  ).format(number);
}

function formatPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '';
  }

  if (number >= 1_000_000_000) {
    return `${new Intl.NumberFormat(
      'vi-VN',
      {
        maximumFractionDigits: 2,
      },
    ).format(
      number / 1_000_000_000,
    )} tỷ`;
  }

  if (number >= 1_000_000) {
    return `${new Intl.NumberFormat(
      'vi-VN',
      {
        maximumFractionDigits: 1,
      },
    ).format(
      number / 1_000_000,
    )} triệu`;
  }

  return `${formatNumber(number)} đồng`;
}

function getRangeLabel({
  min,
  max,
  formatter,
  suffix = '',
}) {
  if (min && max) {
    return `${formatter(min)} – ${formatter(
      max,
    )}${suffix}`;
  }

  if (min) {
    return `Từ ${formatter(
      min,
    )}${suffix}`;
  }

  if (max) {
    return `Đến ${formatter(
      max,
    )}${suffix}`;
  }

  return '';
}

function getTransactionIcon(value) {
  return (
    TRANSACTION_ICONS[value] ||
    Building2
  );
}

function findByIdOrSlug(items, value) {
  return items.find(
    (item) =>
      String(item?._id || '') ===
        String(value) ||
      String(item?.slug || '') ===
        String(value),
  );
}

export default function PropertiesPage() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const {
    areas = [],
  } = useTaxonomy();

  const resultsRef = useRef(null);

  const [
    mobileFiltersOpen,
    setMobileFiltersOpen,
  ] = useState(false);

  const [
    viewMode,
    setViewMode,
  ] = useState(() => {
    try {
      const savedValue =
        localStorage.getItem(
          VIEW_MODE_KEY,
        );

      return ['grid', 'list'].includes(
        savedValue,
      )
        ? savedValue
        : 'grid';
    } catch {
      return 'grid';
    }
  });

  const [
    searchInput,
    setSearchInput,
  ] = useState(
    searchParams.get('q') || '',
  );

  const [
    rangeValues,
    setRangeValues,
  ] = useState({
    minPrice:
      searchParams.get('minPrice') ||
      '',

    maxPrice:
      searchParams.get('maxPrice') ||
      '',

    minArea:
      searchParams.get('minArea') ||
      '',

    maxArea:
      searchParams.get('maxArea') ||
      '',
  });

  const [
    rangeError,
    setRangeError,
  ] = useState('');

  const searchKey =
    searchParams.toString();

  const params = useMemo(() => {
    const source =
      new URLSearchParams(searchKey);

    const nextParams = {};

    QUERY_KEYS.forEach((key) => {
      const value = source.get(key);

      if (value) {
        nextParams[key] = value;
      }
    });

    return nextParams;
  }, [searchKey]);

  const result = useListPage(
    propertyApi.list,
    params,
  );

  const currentTransaction =
    searchParams.get(
      'transactionType',
    ) || '';

  const currentPropertyType =
    searchParams.get(
      'propertyType',
    ) || '';

  const currentArea =
    searchParams.get('area') || '';

  const currentOwnerType =
    searchParams.get('ownerType') ||
    '';

  const currentLegalStatus =
    searchParams.get('legalStatus') ||
    '';

  const currentSort =
    searchParams.get('sort') || '';

  const currentQuery =
    searchParams.get('q') || '';

  const currentMinPrice =
    searchParams.get('minPrice') ||
    '';

  const currentMaxPrice =
    searchParams.get('maxPrice') ||
    '';

  const currentMinArea =
    searchParams.get('minArea') ||
    '';

  const currentMaxArea =
    searchParams.get('maxArea') ||
    '';

  const selectedArea = useMemo(
    () =>
      findByIdOrSlug(
        areas,
        currentArea,
      ),
    [areas, currentArea],
  );

  const currentSortOption =
    SORT_OPTIONS.find(
      (item) =>
        item.value === currentSort,
    ) || SORT_OPTIONS[0];

  const SortIcon =
    currentSortOption.icon;

  const setUrlParams = useCallback(
    (mutator, options = {}) => {
      setSearchParams(
        (current) => {
          const next =
            new URLSearchParams(
              current,
            );

          mutator(next);

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

  const update = useCallback(
    (key, value, options = {}) => {
      setUrlParams(
        (next) => {
          if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ''
          ) {
            next.set(
              key,
              String(value),
            );
          } else {
            next.delete(key);
          }

          next.delete('page');
        },
        options,
      );
    },
    [setUrlParams],
  );

  const updateMultiple =
    useCallback(
      (values) => {
        setUrlParams((next) => {
          Object.entries(
            values,
          ).forEach(
            ([key, value]) => {
              if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !==
                  ''
              ) {
                next.set(
                  key,
                  String(value),
                );
              } else {
                next.delete(key);
              }
            },
          );

          next.delete('page');
        });
      },
      [setUrlParams],
    );

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    setRangeValues({
      minPrice:
        currentMinPrice,

      maxPrice:
        currentMaxPrice,

      minArea:
        currentMinArea,

      maxArea:
        currentMaxArea,
    });

    setRangeError('');
  }, [
    currentMinPrice,
    currentMaxPrice,
    currentMinArea,
    currentMaxArea,
  ]);

  useEffect(() => {
    const cleanValue =
      searchInput.trim();

    if (cleanValue === currentQuery) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        update(
          'q',
          cleanValue,
          {
            replace: true,
          },
        );
      }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    searchInput,
    currentQuery,
    update,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(
        VIEW_MODE_KEY,
        viewMode,
      );
    } catch {
      // Không ảnh hưởng giao diện.
    }
  }, [viewMode]);

  useEffect(() => {
    if (!mobileFiltersOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    const closeWithEscape = (
      event,
    ) => {
      if (event.key === 'Escape') {
        setMobileFiltersOpen(false);
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
  }, [mobileFiltersOpen]);

  const applyRangeFilters =
    useCallback(() => {
      const minPrice =
        sanitizeNumber(
          rangeValues.minPrice,
        );

      const maxPrice =
        sanitizeNumber(
          rangeValues.maxPrice,
        );

      const minArea =
        sanitizeNumber(
          rangeValues.minArea,
        );

      const maxArea =
        sanitizeNumber(
          rangeValues.maxArea,
        );

      if (
        minPrice &&
        maxPrice &&
        Number(minPrice) >
          Number(maxPrice)
      ) {
        setRangeError(
          'Giá tối thiểu không được lớn hơn giá tối đa.',
        );

        return;
      }

      if (
        minArea &&
        maxArea &&
        Number(minArea) >
          Number(maxArea)
      ) {
        setRangeError(
          'Diện tích tối thiểu không được lớn hơn diện tích tối đa.',
        );

        return;
      }

      setRangeError('');

      updateMultiple({
        minPrice,
        maxPrice,
        minArea,
        maxArea,
      });
    }, [
      rangeValues,
      updateMultiple,
    ]);

  const applyPricePreset =
    useCallback(
      (preset) => {
        const nextRangeValues = {
          ...rangeValues,
          minPrice: preset.min,
          maxPrice: preset.max,
        };

        setRangeValues(
          nextRangeValues,
        );

        setRangeError('');

        updateMultiple({
          minPrice: preset.min,
          maxPrice: preset.max,
        });
      },
      [
        rangeValues,
        updateMultiple,
      ],
    );

  const applyAreaPreset =
    useCallback(
      (preset) => {
        const nextRangeValues = {
          ...rangeValues,
          minArea: preset.min,
          maxArea: preset.max,
        };

        setRangeValues(
          nextRangeValues,
        );

        setRangeError('');

        updateMultiple({
          minArea: preset.min,
          maxArea: preset.max,
        });
      },
      [
        rangeValues,
        updateMultiple,
      ],
    );

  const clearAllFilters =
    useCallback(() => {
      setSearchInput('');

      setRangeValues({
        minPrice: '',
        maxPrice: '',
        minArea: '',
        maxArea: '',
      });

      setRangeError('');

      setUrlParams((next) => {
        QUERY_KEYS.forEach((key) => {
          next.delete(key);
        });
      });
    }, [setUrlParams]);

  const setPage = useCallback(
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

  const activeFilterCount =
    (currentTransaction ? 1 : 0) +
    (currentPropertyType ? 1 : 0) +
    (currentArea ? 1 : 0) +
    (currentOwnerType ? 1 : 0) +
    (currentLegalStatus ? 1 : 0) +
    (currentMinPrice ||
    currentMaxPrice
      ? 1
      : 0) +
    (currentMinArea ||
    currentMaxArea
      ? 1
      : 0) +
    (currentSort ? 1 : 0) +
    (currentQuery ? 1 : 0);

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

  const pageSize =
    getPageSize(
      result.meta,
      result.items.length,
    );

  const fromItem =
    total > 0
      ? (currentPage - 1) *
          Math.max(pageSize, 1) +
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

  const priceRangeLabel =
    getRangeLabel({
      min: currentMinPrice,
      max: currentMaxPrice,
      formatter: formatPrice,
    });

  const areaRangeLabel =
    getRangeLabel({
      min: currentMinArea,
      max: currentMaxArea,
      formatter: formatNumber,
      suffix: ' m²',
    });

  const rangeChanged =
    String(rangeValues.minPrice) !==
      String(currentMinPrice) ||
    String(rangeValues.maxPrice) !==
      String(currentMaxPrice) ||
    String(rangeValues.minArea) !==
      String(currentMinArea) ||
    String(rangeValues.maxArea) !==
      String(currentMaxArea);

  return (
    <section className="properties-page">
      <Seo
        title="Bất động sản Hòa Lạc"
        description="Tin mua bán, cho thuê nhà đất Hòa Lạc với bộ lọc giá, diện tích, pháp lý và khu vực."
      />

      <div className="properties-page__container">
        <header className="properties-hero">
          <div className="properties-hero__content">
            <span className="properties-hero__eyebrow">
              <Building2 size={17} />
              Nhà đất Hòa Lạc
            </span>

            <h1>
              Bất động sản Hòa Lạc
            </h1>

            <p>
              Tìm kiếm nhà, đất, căn hộ,
              biệt thự và bất động sản cho
              thuê theo khu vực, mức giá,
              diện tích và thông tin pháp
              lý rõ ràng.
            </p>

            <div className="properties-hero__actions">
              <Link
                className="properties-primary-button"
                to="/dang-bai/nha-dat"
              >
                <Plus size={18} />
                Đăng tin bất động sản
              </Link>

              <a
                className="properties-secondary-button"
                href="#property-results"
              >
                <Search size={18} />
                Xem danh sách tin
              </a>
            </div>
          </div>

          <form
            className="properties-hero__search"
            onSubmit={(event) => {
              event.preventDefault();

              update(
                'q',
                searchInput.trim(),
              );
            }}
          >
            <div className="properties-hero__search-heading">
              <span>
                <Search size={21} />
              </span>

              <div>
                <strong>
                  Tìm nhanh bất động sản
                </strong>

                <small>
                  Tìm theo tiêu đề, vị trí
                  hoặc nội dung tin đăng.
                </small>
              </div>
            </div>

            <label>
              <Search size={18} />

              <input
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Ví dụ: đất Yên Bình, nhà Thạch Hòa..."
                aria-label="Tìm kiếm bất động sản"
              />

              {searchInput ? (
                <button
                  type="button"
                  aria-label="Xóa từ khóa"
                  onClick={() => {
                    setSearchInput('');
                    update('q', '');
                  }}
                >
                  <X size={16} />
                </button>
              ) : null}
            </label>

            <button type="submit">
              <Search size={17} />
              Tìm kiếm
            </button>
          </form>
        </header>

        <nav
          className="properties-transaction-rail"
          aria-label="Nhu cầu bất động sản"
        >
          <button
            type="button"
            className={
              !currentTransaction
                ? 'is-active'
                : ''
            }
            onClick={() =>
              update(
                'transactionType',
                '',
              )
            }
          >
            <Building2 size={16} />
            Tất cả giao dịch
          </button>

          {Object.entries(
            TRANSACTION_TYPES,
          ).map(([value, label]) => {
            const TransactionIcon =
              getTransactionIcon(value);

            const selected =
              currentTransaction ===
              value;

            return (
              <button
                type="button"
                key={value}
                className={
                  selected
                    ? 'is-active'
                    : ''
                }
                onClick={() =>
                  update(
                    'transactionType',
                    selected
                      ? ''
                      : value,
                  )
                }
              >
                <TransactionIcon
                  size={16}
                />

                {label}
              </button>
            );
          })}
        </nav>

        <div className="properties-mobile-controls">
          <button
            type="button"
            onClick={() =>
              setMobileFiltersOpen(true)
            }
          >
            <SlidersHorizontal
              size={17}
            />

            Bộ lọc

            {activeFilterCount ? (
              <span>
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <label>
            <SortIcon size={16} />

            <select
              value={currentSort}
              onChange={(event) =>
                update(
                  'sort',
                  event.target.value,
                )
              }
            >
              {SORT_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <section
          className={[
            'properties-filter-panel',
            mobileFiltersOpen
              ? 'is-open'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="properties-filter-panel__mobile-header">
            <div>
              <Filter size={19} />

              <strong>
                Bộ lọc bất động sản
              </strong>
            </div>

            <button
              type="button"
              aria-label="Đóng bộ lọc"
              onClick={() =>
                setMobileFiltersOpen(false)
              }
            >
              <X size={21} />
            </button>
          </div>

          <div className="properties-filter-panel__heading">
            <div>
              <span>
                <SlidersHorizontal
                  size={18}
                />
              </span>

              <div>
                <h2>
                  Bộ lọc tìm kiếm
                </h2>

                <p>
                  Thu hẹp kết quả theo loại
                  hình, vị trí, giá, diện
                  tích và pháp lý.
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

          <div className="properties-filter-selects">
            <label className="properties-filter-field">
              <span>
                Loại bất động sản
              </span>

              <div>
                <Building2 size={18} />

                <select
                  value={
                    currentPropertyType
                  }
                  onChange={(event) =>
                    update(
                      'propertyType',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Tất cả loại BĐS
                  </option>

                  {Object.entries(
                    PROPERTY_TYPES,
                  ).map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </label>

            <label className="properties-filter-field">
              <span>Khu vực</span>

              <div>
                <MapPin size={18} />

                <select
                  value={currentArea}
                  onChange={(event) =>
                    update(
                      'area',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Tất cả khu vực
                  </option>

                  {areas.map((item) => (
                    <option
                      key={item._id}
                      value={item._id}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="properties-filter-field">
              <span>Người đăng</span>

              <div>
                <UserRound size={18} />

                <select
                  value={
                    currentOwnerType
                  }
                  onChange={(event) =>
                    update(
                      'ownerType',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Tất cả người đăng
                  </option>

                  {Object.entries(
                    OWNER_TYPES,
                  ).map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </label>

            <label className="properties-filter-field">
              <span>Pháp lý</span>

              <div>
                <ShieldCheck size={18} />

                <select
                  value={
                    currentLegalStatus
                  }
                  onChange={(event) =>
                    update(
                      'legalStatus',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Tất cả pháp lý
                  </option>

                  {Object.entries(
                    LEGAL_STATUS,
                  ).map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </label>

            <label className="properties-filter-field">
              <span>Sắp xếp</span>

              <div>
                <SortIcon size={18} />

                <select
                  value={currentSort}
                  onChange={(event) =>
                    update(
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

          <div className="properties-range-section">
            <div className="properties-range-group">
              <div className="properties-range-group__heading">
                <span>
                  <WalletCards
                    size={18}
                  />
                </span>

                <div>
                  <strong>
                    Khoảng giá
                  </strong>

                  <small>
                    Đơn vị tính theo tổng giá
                    tin đăng
                  </small>
                </div>
              </div>

              <div className="properties-range-inputs">
                <label>
                  <span>Từ</span>

                  <input
                    type="number"
                    min="0"
                    value={
                      rangeValues.minPrice
                    }
                    onChange={(event) =>
                      setRangeValues(
                        (current) => ({
                          ...current,
                          minPrice:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="0"
                  />

                  <small>VNĐ</small>
                </label>

                <span className="properties-range-separator">
                  –
                </span>

                <label>
                  <span>Đến</span>

                  <input
                    type="number"
                    min="0"
                    value={
                      rangeValues.maxPrice
                    }
                    onChange={(event) =>
                      setRangeValues(
                        (current) => ({
                          ...current,
                          maxPrice:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Không giới hạn"
                  />

                  <small>VNĐ</small>
                </label>
              </div>

              <div className="properties-range-presets">
                {PRICE_PRESETS.map(
                  (preset) => {
                    const selected =
                      String(
                        currentMinPrice,
                      ) ===
                        String(
                          preset.min,
                        ) &&
                      String(
                        currentMaxPrice,
                      ) ===
                        String(
                          preset.max,
                        );

                    return (
                      <button
                        type="button"
                        key={preset.label}
                        className={
                          selected
                            ? 'is-active'
                            : ''
                        }
                        onClick={() =>
                          applyPricePreset(
                            preset,
                          )
                        }
                      >
                        {preset.label}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="properties-range-group">
              <div className="properties-range-group__heading">
                <span>
                  <Ruler size={18} />
                </span>

                <div>
                  <strong>
                    Khoảng diện tích
                  </strong>

                  <small>
                    Diện tích đất theo mét
                    vuông
                  </small>
                </div>
              </div>

              <div className="properties-range-inputs">
                <label>
                  <span>Từ</span>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      rangeValues.minArea
                    }
                    onChange={(event) =>
                      setRangeValues(
                        (current) => ({
                          ...current,
                          minArea:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="0"
                  />

                  <small>m²</small>
                </label>

                <span className="properties-range-separator">
                  –
                </span>

                <label>
                  <span>Đến</span>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      rangeValues.maxArea
                    }
                    onChange={(event) =>
                      setRangeValues(
                        (current) => ({
                          ...current,
                          maxArea:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Không giới hạn"
                  />

                  <small>m²</small>
                </label>
              </div>

              <div className="properties-range-presets">
                {AREA_PRESETS.map(
                  (preset) => {
                    const selected =
                      String(
                        currentMinArea,
                      ) ===
                        String(
                          preset.min,
                        ) &&
                      String(
                        currentMaxArea,
                      ) ===
                        String(
                          preset.max,
                        );

                    return (
                      <button
                        type="button"
                        key={preset.label}
                        className={
                          selected
                            ? 'is-active'
                            : ''
                        }
                        onClick={() =>
                          applyAreaPreset(
                            preset,
                          )
                        }
                      >
                        {preset.label}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          </div>

          {rangeError ? (
            <div className="properties-range-error">
              {rangeError}
            </div>
          ) : null}

          <div className="properties-range-actions">
            <span>
              {rangeChanged
                ? 'Khoảng giá hoặc diện tích chưa được áp dụng.'
                : 'Các khoảng tìm kiếm đã được đồng bộ.'}
            </span>

            <button
              type="button"
              disabled={!rangeChanged}
              onClick={applyRangeFilters}
            >
              <Filter size={16} />
              Áp dụng khoảng tìm kiếm
            </button>
          </div>

          {hasFilters ? (
            <div className="properties-active-filters">
              <span>
                Đang lọc:
              </span>

              {currentTransaction ? (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      'transactionType',
                      '',
                    )
                  }
                >
                  <Home size={14} />

                  {TRANSACTION_TYPES[
                    currentTransaction
                  ] ||
                    currentTransaction}

                  <X size={14} />
                </button>
              ) : null}

              {currentPropertyType ? (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      'propertyType',
                      '',
                    )
                  }
                >
                  <Building2
                    size={14}
                  />

                  {PROPERTY_TYPES[
                    currentPropertyType
                  ] ||
                    currentPropertyType}

                  <X size={14} />
                </button>
              ) : null}

              {currentArea ? (
                <button
                  type="button"
                  onClick={() =>
                    update('area', '')
                  }
                >
                  <MapPin size={14} />

                  {selectedArea?.name ||
                    'Khu vực'}

                  <X size={14} />
                </button>
              ) : null}

              {currentOwnerType ? (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      'ownerType',
                      '',
                    )
                  }
                >
                  <UserRound size={14} />

                  {OWNER_TYPES[
                    currentOwnerType
                  ] || currentOwnerType}

                  <X size={14} />
                </button>
              ) : null}

              {currentLegalStatus ? (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      'legalStatus',
                      '',
                    )
                  }
                >
                  <ShieldCheck
                    size={14}
                  />

                  {LEGAL_STATUS[
                    currentLegalStatus
                  ] ||
                    currentLegalStatus}

                  <X size={14} />
                </button>
              ) : null}

              {priceRangeLabel ? (
                <button
                  type="button"
                  onClick={() =>
                    updateMultiple({
                      minPrice: '',
                      maxPrice: '',
                    })
                  }
                >
                  <WalletCards
                    size={14}
                  />

                  {priceRangeLabel}

                  <X size={14} />
                </button>
              ) : null}

              {areaRangeLabel ? (
                <button
                  type="button"
                  onClick={() =>
                    updateMultiple({
                      minArea: '',
                      maxArea: '',
                    })
                  }
                >
                  <Ruler size={14} />

                  {areaRangeLabel}

                  <X size={14} />
                </button>
              ) : null}

              {currentSort ? (
                <button
                  type="button"
                  onClick={() =>
                    update('sort', '')
                  }
                >
                  <SortIcon size={14} />

                  {
                    currentSortOption.label
                  }

                  <X size={14} />
                </button>
              ) : null}

              {currentQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    update('q', '');
                  }}
                >
                  <Search size={14} />

                  “{currentQuery}”

                  <X size={14} />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="properties-filter-panel__mobile-actions">
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={!hasFilters}
            >
              Xóa bộ lọc
            </button>

            <button
              type="button"
              onClick={() => {
                if (rangeChanged) {
                  applyRangeFilters();

                  if (rangeError) {
                    return;
                  }
                }

                setMobileFiltersOpen(
                  false,
                );
              }}
            >
              Xem kết quả
            </button>
          </div>
        </section>

        {mobileFiltersOpen ? (
          <button
            type="button"
            className="properties-filter-overlay"
            aria-label="Đóng bộ lọc"
            onClick={() =>
              setMobileFiltersOpen(false)
            }
          />
        ) : null}

        <section
          id="property-results"
          ref={resultsRef}
          className="properties-results"
        >
          <header className="properties-results__header">
            <div>
              <span className="properties-results__eyebrow">
                <FileCheck2 size={16} />
                Danh sách bất động sản
              </span>

              <h2>
                {currentQuery
                  ? `Kết quả cho “${currentQuery}”`
                  : hasFilters
                    ? 'Tin phù hợp với bộ lọc'
                    : 'Tin bất động sản mới nhất'}
              </h2>

              {!result.loading &&
              !result.error ? (
                <p>
                  {total > 0 ? (
                    <>
                      Hiển thị{' '}
                      <strong>
                        {fromItem}–{toItem}
                      </strong>{' '}
                      trong tổng số{' '}
                      <strong>
                        {total.toLocaleString(
                          'vi-VN',
                        )}
                      </strong>{' '}
                      tin đăng.
                    </>
                  ) : (
                    'Chưa có tin đăng phù hợp.'
                  )}
                </p>
              ) : null}
            </div>

            <div className="properties-results__tools">
              <button
                type="button"
                className="properties-results__reload"
                disabled={result.loading}
                onClick={result.reload}
              >
                <RefreshCw
                  size={16}
                  className={
                    result.loading
                      ? 'is-spinning'
                      : ''
                  }
                />

                Làm mới
              </button>

              <div className="properties-view-switch">
                <button
                  type="button"
                  className={
                    viewMode === 'grid'
                      ? 'is-active'
                      : ''
                  }
                  aria-label="Hiển thị dạng lưới"
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
                  aria-label="Hiển thị dạng danh sách"
                  title="Dạng danh sách"
                  onClick={() =>
                    setViewMode('list')
                  }
                >
                  <List size={19} />
                </button>
              </div>
            </div>
          </header>

          <div className="properties-results__body">
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
                  'properties-grid',
                  viewMode === 'list'
                    ? 'is-list'
                    : 'is-grid',
                ].join(' ')}
              >
                {result.items.map(
                  (item) => (
                    <article
                      className="properties-item"
                      key={item._id}
                    >
                      <PropertyCard
                        item={item}
                      />
                    </article>
                  ),
                )}
              </div>
            ) : (
              <div className="properties-empty-state">
                <span>
                  <Building2 size={39} />
                </span>

                <h3>
                  Không có tin phù hợp
                </h3>

                <p>
                  {hasFilters
                    ? 'Hãy thử mở rộng khoảng giá, diện tích hoặc thay đổi khu vực tìm kiếm.'
                    : 'Hiện chưa có tin bất động sản nào được đăng trong hệ thống.'}
                </p>

                <div>
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={
                        clearAllFilters
                      }
                    >
                      <RotateCcw
                        size={17}
                      />

                      Xóa tất cả bộ lọc
                    </button>
                  ) : null}

                  <Link to="/dang-bai/nha-dat">
                    <Plus size={17} />
                    Đăng tin nhà đất
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {!result.loading &&
        !result.error &&
        result.items.length ? (
          <div className="properties-pagination">
            <Pagination
              meta={result.meta}
              onPageChange={setPage}
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