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
  Check,
  ChevronDown,
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

const VIEW_MODE_KEY = 'dothihoalac.property-view-mode';

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

const FILTER_ONLY_KEYS = [
  'propertyType',
  'area',
  'ownerType',
  'legalStatus',
  'minPrice',
  'maxPrice',
  'minArea',
  'maxArea',
  'sort',
];

const PRICE_PRESETS = [
  { label: 'Dưới 1 tỷ', min: '', max: '1000000000' },
  { label: '1–3 tỷ', min: '1000000000', max: '3000000000' },
  { label: '3–5 tỷ', min: '3000000000', max: '5000000000' },
  { label: '5–10 tỷ', min: '5000000000', max: '10000000000' },
  { label: 'Trên 10 tỷ', min: '10000000000', max: '' },
];

const AREA_PRESETS = [
  { label: 'Dưới 50 m²', min: '', max: '50' },
  { label: '50–100 m²', min: '50', max: '100' },
  { label: '100–200 m²', min: '100', max: '200' },
  { label: '200–500 m²', min: '200', max: '500' },
  { label: 'Trên 500 m²', min: '500', max: '' },
];

const SORT_OPTIONS = [
  { value: '', label: 'Mới nhất', icon: Clock3 },
  { value: 'price_asc', label: 'Giá tăng dần', icon: TrendingUp },
  { value: 'price_desc', label: 'Giá giảm dần', icon: TrendingDown },
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
  const cleanValue = String(value ?? '').trim();
  if (!cleanValue) return '';

  const number = Number(cleanValue);
  if (!Number.isFinite(number) || number < 0) return '';

  return String(number);
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';

  if (number >= 1_000_000_000) {
    return `${new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 2,
    }).format(number / 1_000_000_000)} tỷ`;
  }

  if (number >= 1_000_000) {
    return `${new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 1,
    }).format(number / 1_000_000)} triệu`;
  }

  return `${formatNumber(number)} đồng`;
}

function getRangeLabel({ min, max, formatter, suffix = '' }) {
  if (min && max) {
    return `${formatter(min)} – ${formatter(max)}${suffix}`;
  }

  if (min) return `Từ ${formatter(min)}${suffix}`;
  if (max) return `Đến ${formatter(max)}${suffix}`;
  return '';
}

function getTransactionIcon(value) {
  return TRANSACTION_ICONS[value] || Building2;
}

function findByIdOrSlug(items, value) {
  return items.find(
    (item) =>
      String(item?._id || '') === String(value) ||
      String(item?.slug || '') === String(value),
  );
}

function taxonomyUrlValue(item) {
  return String(item?.slug || item?._id || item?.id || '');
}

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { areas = [] } = useTaxonomy();

  const resultsRef = useRef(null);
  const quickToolbarRef = useRef(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickFilterOpen, setQuickFilterOpen] = useState('');

  const [viewMode, setViewMode] = useState(() => {
    try {
      const savedValue = localStorage.getItem(VIEW_MODE_KEY);
      return ['grid', 'list'].includes(savedValue) ? savedValue : 'grid';
    } catch {
      return 'grid';
    }
  });

  const [searchInput, setSearchInput] = useState(
    searchParams.get('q') || '',
  );

  const [rangeValues, setRangeValues] = useState({
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
  });

  const [rangeError, setRangeError] = useState('');

  const searchKey = searchParams.toString();

  const params = useMemo(() => {
    const source = new URLSearchParams(searchKey);
    const nextParams = {};

    QUERY_KEYS.forEach((key) => {
      const value = source.get(key);
      if (value) nextParams[key] = value;
    });

    return nextParams;
  }, [searchKey]);

  const result = useListPage(propertyApi.list, params);

  const currentTransaction = searchParams.get('transactionType') || '';
  const currentPropertyType = searchParams.get('propertyType') || '';
  const currentArea = searchParams.get('area') || '';
  const currentOwnerType = searchParams.get('ownerType') || '';
  const currentLegalStatus = searchParams.get('legalStatus') || '';
  const currentSort = searchParams.get('sort') || '';
  const currentQuery = searchParams.get('q') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentMinArea = searchParams.get('minArea') || '';
  const currentMaxArea = searchParams.get('maxArea') || '';

  const selectedArea = useMemo(
    () => findByIdOrSlug(areas, currentArea),
    [areas, currentArea],
  );

  useEffect(() => {
    const areaSlug = String(selectedArea?.slug || '');

    if (!currentArea || !areaSlug || currentArea === areaSlug) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('area', areaSlug);
        return next;
      },
      { replace: true },
    );
  }, [currentArea, selectedArea?.slug, setSearchParams]);

  const currentSortOption =
    SORT_OPTIONS.find((item) => item.value === currentSort) ||
    SORT_OPTIONS[0];

  const SortIcon = currentSortOption.icon;

  const setUrlParams = useCallback(
    (mutator, options = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutator(next);

          if (next.get('page') === '1') next.delete('page');
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
            next.set(key, String(value));
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

  const updateMultiple = useCallback(
    (values) => {
      setUrlParams((next) => {
        Object.entries(values).forEach(([key, value]) => {
          if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ''
          ) {
            next.set(key, String(value));
          } else {
            next.delete(key);
          }
        });

        next.delete('page');
      });
    },
    [setUrlParams],
  );

  const syncRangeDrafts = useCallback(() => {
    setRangeValues({
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice,
      minArea: currentMinArea,
      maxArea: currentMaxArea,
    });
    setRangeError('');
  }, [
    currentMinPrice,
    currentMaxPrice,
    currentMinArea,
    currentMaxArea,
  ]);

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    syncRangeDrafts();
  }, [syncRangeDrafts]);

  useEffect(() => {
    const cleanValue = searchInput.trim();
    if (cleanValue === currentQuery) return undefined;

    const timer = window.setTimeout(() => {
      update('q', cleanValue, { replace: true });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [searchInput, currentQuery, update]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Không ảnh hưởng giao diện.
    }
  }, [viewMode]);

  useEffect(() => {
    if (!quickFilterOpen) return undefined;

    const closeOutside = (event) => {
      if (!quickToolbarRef.current?.contains(event.target)) {
        setQuickFilterOpen('');
      }
    };

    const closeWithEscape = (event) => {
      if (event.key === 'Escape') setQuickFilterOpen('');
    };

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [quickFilterOpen]);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    const previousOverflow = document.body.style.overflow;

    const closeWithEscape = (event) => {
      if (event.key === 'Escape') {
        syncRangeDrafts();
        setFiltersOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeWithEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [filtersOpen, syncRangeDrafts]);

  const applyRangeFilters = useCallback(() => {
    const minPrice = sanitizeNumber(rangeValues.minPrice);
    const maxPrice = sanitizeNumber(rangeValues.maxPrice);
    const minArea = sanitizeNumber(rangeValues.minArea);
    const maxArea = sanitizeNumber(rangeValues.maxArea);

    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setRangeError('Giá tối thiểu không được lớn hơn giá tối đa.');
      return false;
    }

    if (minArea && maxArea && Number(minArea) > Number(maxArea)) {
      setRangeError('Diện tích tối thiểu không được lớn hơn diện tích tối đa.');
      return false;
    }

    setRangeError('');
    updateMultiple({ minPrice, maxPrice, minArea, maxArea });
    return true;
  }, [rangeValues, updateMultiple]);

  const applyPricePreset = useCallback((preset) => {
    setRangeValues((current) => ({
      ...current,
      minPrice: preset.min,
      maxPrice: preset.max,
    }));
    setRangeError('');
  }, []);

  const applyAreaPreset = useCallback((preset) => {
    setRangeValues((current) => ({
      ...current,
      minArea: preset.min,
      maxArea: preset.max,
    }));
    setRangeError('');
  }, []);

  const clearFiltersOnly = useCallback(() => {
    setRangeValues({
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
    });
    setRangeError('');

    setUrlParams((next) => {
      FILTER_ONLY_KEYS.forEach((key) => next.delete(key));
      next.delete('page');
    });
  }, [setUrlParams]);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setRangeValues({
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
    });
    setRangeError('');

    setUrlParams((next) => {
      QUERY_KEYS.forEach((key) => next.delete(key));
    });
  }, [setUrlParams]);

  const toggleQuickFilter = useCallback(
    (name) => {
      syncRangeDrafts();
      setQuickFilterOpen((current) => (current === name ? '' : name));
    },
    [syncRangeDrafts],
  );

  const openFilterModal = useCallback(() => {
    syncRangeDrafts();
    setQuickFilterOpen('');
    setFiltersOpen(true);
  }, [syncRangeDrafts]);

  const closeFilterModal = useCallback(() => {
    syncRangeDrafts();
    setFiltersOpen(false);
  }, [syncRangeDrafts]);

  const showFilterResults = useCallback(() => {
    if (!applyRangeFilters()) return;
    setFiltersOpen(false);
  }, [applyRangeFilters]);

  const setPage = useCallback(
    (page) => {
      setUrlParams((next) => {
        if (Number(page) <= 1) next.delete('page');
        else next.set('page', String(page));
      });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 30);
    },
    [setUrlParams],
  );

  const filterCount =
    (currentPropertyType ? 1 : 0) +
    (currentArea ? 1 : 0) +
    (currentOwnerType ? 1 : 0) +
    (currentLegalStatus ? 1 : 0) +
    (currentMinPrice || currentMaxPrice ? 1 : 0) +
    (currentMinArea || currentMaxArea ? 1 : 0);

  const hasFilters = Boolean(
    filterCount ||
      currentTransaction ||
      currentSort ||
      currentQuery,
  );

  const total = getTotal(result.meta, result.items.length);
  const currentPage = getCurrentPage(result.meta, searchParams);
  const pageSize = getPageSize(result.meta, result.items.length);

  const fromItem =
    total > 0
      ? (currentPage - 1) * Math.max(pageSize, 1) + 1
      : 0;

  const toItem =
    total > 0
      ? Math.min(fromItem + result.items.length - 1, total)
      : 0;

  const priceRangeLabel = getRangeLabel({
    min: currentMinPrice,
    max: currentMaxPrice,
    formatter: formatPrice,
  });

  const areaRangeLabel = getRangeLabel({
    min: currentMinArea,
    max: currentMaxArea,
    formatter: formatNumber,
    suffix: ' m²',
  });

  const rangeChanged =
    String(rangeValues.minPrice) !== String(currentMinPrice) ||
    String(rangeValues.maxPrice) !== String(currentMaxPrice) ||
    String(rangeValues.minArea) !== String(currentMinArea) ||
    String(rangeValues.maxArea) !== String(currentMaxArea);

  const propertyTypeButtonLabel =
    PROPERTY_TYPES[currentPropertyType] || 'Loại BĐS';
  const areaButtonLabel = selectedArea?.name || 'Khu vực';
  const priceButtonLabel = priceRangeLabel || 'Khoảng giá';
  const sizeButtonLabel = areaRangeLabel || 'Diện tích';

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
              Bất động sản Hòa Lạc
            </span>

            <h1>Bất động sản Hòa Lạc</h1>

            <p>
              Tìm kiếm nhà, đất, căn hộ, biệt thự và bất động sản cho thuê
              theo khu vực, mức giá, diện tích và thông tin pháp lý rõ ràng.
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
              update('q', searchInput.trim());
            }}
          >
            <label>
              <Search size={19} />

              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
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
            className={!currentTransaction ? 'is-active' : ''}
            onClick={() => update('transactionType', '')}
          >
            <Building2 size={16} />
            Tất cả giao dịch
          </button>

          {Object.entries(TRANSACTION_TYPES).map(([value, label]) => {
            const TransactionIcon = getTransactionIcon(value);
            const selected = currentTransaction === value;

            return (
              <button
                type="button"
                key={value}
                className={selected ? 'is-active' : ''}
                onClick={() =>
                  update('transactionType', selected ? '' : value)
                }
              >
                <TransactionIcon size={16} />
                {label}
              </button>
            );
          })}
        </nav>

        <div
          className="properties-filter-toolbar"
          ref={quickToolbarRef}
        >
          <button
            type="button"
            className="properties-filter-toolbar__main"
            onClick={openFilterModal}
          >
            <Filter size={18} />
            <span>Lọc</span>
            {filterCount ? <b>{filterCount}</b> : null}
          </button>

          <div className="properties-quick-filter">
            <button
              type="button"
              className={currentPropertyType ? 'is-selected' : ''}
              aria-expanded={quickFilterOpen === 'propertyType'}
              onClick={() => toggleQuickFilter('propertyType')}
            >
              <Building2 size={17} />
              <span>{propertyTypeButtonLabel}</span>
              <ChevronDown size={16} />
            </button>

            {quickFilterOpen === 'propertyType' ? (
              <div className="properties-filter-popover properties-filter-popover--list">
                <header>
                  <strong>Loại bất động sản</strong>
                  <button
                    type="button"
                    aria-label="Đóng"
                    onClick={() => setQuickFilterOpen('')}
                  >
                    <X size={19} />
                  </button>
                </header>

                <div className="properties-filter-option-list">
                  <button
                    type="button"
                    className={!currentPropertyType ? 'is-active' : ''}
                    onClick={() => {
                      update('propertyType', '');
                      setQuickFilterOpen('');
                    }}
                  >
                    <span>Tất cả loại BĐS</span>
                    {!currentPropertyType ? <Check size={17} /> : null}
                  </button>

                  {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={currentPropertyType === value ? 'is-active' : ''}
                      onClick={() => {
                        update('propertyType', value);
                        setQuickFilterOpen('');
                      }}
                    >
                      <span>{label}</span>
                      {currentPropertyType === value ? <Check size={17} /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="properties-quick-filter">
            <button
              type="button"
              className={currentArea ? 'is-selected' : ''}
              aria-expanded={quickFilterOpen === 'location'}
              onClick={() => toggleQuickFilter('location')}
            >
              <MapPin size={17} />
              <span>{areaButtonLabel}</span>
              <ChevronDown size={16} />
            </button>

            {quickFilterOpen === 'location' ? (
              <div className="properties-filter-popover properties-filter-popover--list properties-filter-popover--location">
                <header>
                  <strong>Khu vực</strong>
                  <button
                    type="button"
                    aria-label="Đóng"
                    onClick={() => setQuickFilterOpen('')}
                  >
                    <X size={19} />
                  </button>
                </header>

                <div className="properties-filter-option-list">
                  <button
                    type="button"
                    className={!currentArea ? 'is-active' : ''}
                    onClick={() => {
                      update('area', '');
                      setQuickFilterOpen('');
                    }}
                  >
                    <span>Tất cả khu vực</span>
                    {!currentArea ? <Check size={17} /> : null}
                  </button>

                  {areas.map((item) => (
                    <button
                      type="button"
                      key={item._id || item.slug}
                      className={
                        String(currentArea) === String(item._id) ||
                        String(currentArea) === String(item.slug)
                          ? 'is-active'
                          : ''
                      }
                      onClick={() => {
                        update('area', taxonomyUrlValue(item));
                        setQuickFilterOpen('');
                      }}
                    >
                      <span>{item.name}</span>
                      {String(currentArea) === String(item._id) ||
                      String(currentArea) === String(item.slug) ? (
                        <Check size={17} />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="properties-quick-filter">
            <button
              type="button"
              className={priceRangeLabel ? 'is-selected' : ''}
              aria-expanded={quickFilterOpen === 'price'}
              onClick={() => toggleQuickFilter('price')}
            >
              <WalletCards size={17} />
              <span>{priceButtonLabel}</span>
              <ChevronDown size={16} />
            </button>

            {quickFilterOpen === 'price' ? (
              <div className="properties-filter-popover properties-filter-popover--range">
                <header>
                  <strong>Khoảng giá</strong>
                  <button
                    type="button"
                    aria-label="Đóng"
                    onClick={() => setQuickFilterOpen('')}
                  >
                    <X size={19} />
                  </button>
                </header>

                <div className="properties-popover-range-inputs">
                  <label>
                    <span>Giá thấp nhất</span>
                    <input
                      type="number"
                      min="0"
                      value={rangeValues.minPrice}
                      onChange={(event) =>
                        setRangeValues((current) => ({
                          ...current,
                          minPrice: event.target.value,
                        }))
                      }
                      placeholder="Từ"
                    />
                  </label>

                  <span>→</span>

                  <label>
                    <span>Giá cao nhất</span>
                    <input
                      type="number"
                      min="0"
                      value={rangeValues.maxPrice}
                      onChange={(event) =>
                        setRangeValues((current) => ({
                          ...current,
                          maxPrice: event.target.value,
                        }))
                      }
                      placeholder="Đến"
                    />
                  </label>
                </div>

                <div className="properties-popover-presets">
                  {PRICE_PRESETS.map((preset) => {
                    const selected =
                      String(rangeValues.minPrice) === String(preset.min) &&
                      String(rangeValues.maxPrice) === String(preset.max);

                    return (
                      <button
                        type="button"
                        key={preset.label}
                        className={selected ? 'is-active' : ''}
                        onClick={() => applyPricePreset(preset)}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {rangeError ? (
                  <div className="properties-range-error">{rangeError}</div>
                ) : null}

                <footer>
                  <button
                    type="button"
                    onClick={() =>
                      setRangeValues((current) => ({
                        ...current,
                        minPrice: '',
                        maxPrice: '',
                      }))
                    }
                  >
                    Đặt lại
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (applyRangeFilters()) setQuickFilterOpen('');
                    }}
                  >
                    Áp dụng
                  </button>
                </footer>
              </div>
            ) : null}
          </div>

          <div className="properties-quick-filter">
            <button
              type="button"
              className={areaRangeLabel ? 'is-selected' : ''}
              aria-expanded={quickFilterOpen === 'size'}
              onClick={() => toggleQuickFilter('size')}
            >
              <Ruler size={17} />
              <span>{sizeButtonLabel}</span>
              <ChevronDown size={16} />
            </button>

            {quickFilterOpen === 'size' ? (
              <div className="properties-filter-popover properties-filter-popover--range properties-filter-popover--size">
                <header>
                  <strong>Diện tích</strong>
                  <button
                    type="button"
                    aria-label="Đóng"
                    onClick={() => setQuickFilterOpen('')}
                  >
                    <X size={19} />
                  </button>
                </header>

                <div className="properties-popover-range-inputs">
                  <label>
                    <span>Diện tích nhỏ nhất</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={rangeValues.minArea}
                      onChange={(event) =>
                        setRangeValues((current) => ({
                          ...current,
                          minArea: event.target.value,
                        }))
                      }
                      placeholder="Từ"
                    />
                  </label>

                  <span>→</span>

                  <label>
                    <span>Diện tích lớn nhất</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={rangeValues.maxArea}
                      onChange={(event) =>
                        setRangeValues((current) => ({
                          ...current,
                          maxArea: event.target.value,
                        }))
                      }
                      placeholder="Đến"
                    />
                  </label>
                </div>

                <div className="properties-popover-presets">
                  {AREA_PRESETS.map((preset) => {
                    const selected =
                      String(rangeValues.minArea) === String(preset.min) &&
                      String(rangeValues.maxArea) === String(preset.max);

                    return (
                      <button
                        type="button"
                        key={preset.label}
                        className={selected ? 'is-active' : ''}
                        onClick={() => applyAreaPreset(preset)}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {rangeError ? (
                  <div className="properties-range-error">{rangeError}</div>
                ) : null}

                <footer>
                  <button
                    type="button"
                    onClick={() =>
                      setRangeValues((current) => ({
                        ...current,
                        minArea: '',
                        maxArea: '',
                      }))
                    }
                  >
                    Đặt lại
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (applyRangeFilters()) setQuickFilterOpen('');
                    }}
                  >
                    Áp dụng
                  </button>
                </footer>
              </div>
            ) : null}
          </div>

          <label className="properties-filter-toolbar__sort">
            <SortIcon size={17} />
            <select
              value={currentSort}
              onChange={(event) => update('sort', event.target.value)}
              aria-label="Sắp xếp bất động sản"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filterCount ? (
          <div className="properties-active-filters properties-active-filters--compact">
            <span>Đang lọc:</span>

            {currentPropertyType ? (
              <button type="button" onClick={() => update('propertyType', '')}>
                {PROPERTY_TYPES[currentPropertyType] || currentPropertyType}
                <X size={13} />
              </button>
            ) : null}

            {currentArea ? (
              <button type="button" onClick={() => update('area', '')}>
                {selectedArea?.name || 'Khu vực'}
                <X size={13} />
              </button>
            ) : null}

            {priceRangeLabel ? (
              <button
                type="button"
                onClick={() =>
                  updateMultiple({ minPrice: '', maxPrice: '' })
                }
              >
                {priceRangeLabel}
                <X size={13} />
              </button>
            ) : null}

            {areaRangeLabel ? (
              <button
                type="button"
                onClick={() => updateMultiple({ minArea: '', maxArea: '' })}
              >
                {areaRangeLabel}
                <X size={13} />
              </button>
            ) : null}

            {currentOwnerType ? (
              <button type="button" onClick={() => update('ownerType', '')}>
                {OWNER_TYPES[currentOwnerType] || currentOwnerType}
                <X size={13} />
              </button>
            ) : null}

            {currentLegalStatus ? (
              <button type="button" onClick={() => update('legalStatus', '')}>
                {LEGAL_STATUS[currentLegalStatus] || currentLegalStatus}
                <X size={13} />
              </button>
            ) : null}

            <button
              type="button"
              className="properties-active-filters__clear"
              onClick={clearFiltersOnly}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="properties-filter-modal-layer">
            <button
              type="button"
              className="properties-filter-modal-backdrop"
              aria-label="Đóng bộ lọc"
              onClick={closeFilterModal}
            />

            <section
              className="properties-filter-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Bộ lọc bất động sản"
            >
              <header className="properties-filter-modal__header">
                <div>
                  <SlidersHorizontal size={20} />
                  <strong>Bộ lọc</strong>
                </div>

                <button
                  type="button"
                  aria-label="Đóng bộ lọc"
                  onClick={closeFilterModal}
                >
                  <X size={22} />
                </button>
              </header>

              <div className="properties-filter-modal__body">
                <section className="properties-filter-modal__section">
                  <h3>Loại bất động sản & khu vực</h3>

                  <div className="properties-modal-select-grid">
                    <label>
                      <span>Loại bất động sản</span>
                      <div>
                        <Building2 size={18} />
                        <select
                          value={currentPropertyType}
                          onChange={(event) =>
                            update('propertyType', event.target.value)
                          }
                        >
                          <option value="">Tất cả loại BĐS</option>
                          {Object.entries(PROPERTY_TYPES).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </label>

                    <label>
                      <span>Khu vực</span>
                      <div>
                        <MapPin size={18} />
                        <select
                          value={currentArea}
                          onChange={(event) => update('area', event.target.value)}
                        >
                          <option value="">Tất cả khu vực</option>
                          {areas.map((item) => (
                            <option
                              key={item._id || item.slug}
                              value={taxonomyUrlValue(item)}
                            >
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>
                </section>

                <section className="properties-filter-modal__section">
                  <div className="properties-filter-modal__section-heading">
                    <div>
                      <WalletCards size={18} />
                      <h3>Khoảng giá</h3>
                    </div>
                    {priceRangeLabel ? <span>{priceRangeLabel}</span> : null}
                  </div>

                  <div className="properties-modal-range-inputs">
                    <label>
                      <span>Từ</span>
                      <input
                        type="number"
                        min="0"
                        value={rangeValues.minPrice}
                        onChange={(event) =>
                          setRangeValues((current) => ({
                            ...current,
                            minPrice: event.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                      <small>VNĐ</small>
                    </label>

                    <span>–</span>

                    <label>
                      <span>Đến</span>
                      <input
                        type="number"
                        min="0"
                        value={rangeValues.maxPrice}
                        onChange={(event) =>
                          setRangeValues((current) => ({
                            ...current,
                            maxPrice: event.target.value,
                          }))
                        }
                        placeholder="Không giới hạn"
                      />
                      <small>VNĐ</small>
                    </label>
                  </div>

                  <div className="properties-modal-preset-grid">
                    {PRICE_PRESETS.map((preset) => {
                      const selected =
                        String(rangeValues.minPrice) === String(preset.min) &&
                        String(rangeValues.maxPrice) === String(preset.max);

                      return (
                        <button
                          type="button"
                          key={preset.label}
                          className={selected ? 'is-active' : ''}
                          onClick={() => applyPricePreset(preset)}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="properties-filter-modal__section">
                  <div className="properties-filter-modal__section-heading">
                    <div>
                      <Ruler size={18} />
                      <h3>Diện tích</h3>
                    </div>
                    {areaRangeLabel ? <span>{areaRangeLabel}</span> : null}
                  </div>

                  <div className="properties-modal-range-inputs">
                    <label>
                      <span>Từ</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={rangeValues.minArea}
                        onChange={(event) =>
                          setRangeValues((current) => ({
                            ...current,
                            minArea: event.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                      <small>m²</small>
                    </label>

                    <span>–</span>

                    <label>
                      <span>Đến</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={rangeValues.maxArea}
                        onChange={(event) =>
                          setRangeValues((current) => ({
                            ...current,
                            maxArea: event.target.value,
                          }))
                        }
                        placeholder="Không giới hạn"
                      />
                      <small>m²</small>
                    </label>
                  </div>

                  <div className="properties-modal-preset-grid">
                    {AREA_PRESETS.map((preset) => {
                      const selected =
                        String(rangeValues.minArea) === String(preset.min) &&
                        String(rangeValues.maxArea) === String(preset.max);

                      return (
                        <button
                          type="button"
                          key={preset.label}
                          className={selected ? 'is-active' : ''}
                          onClick={() => applyAreaPreset(preset)}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="properties-filter-modal__section">
                  <h3>Thông tin tin đăng</h3>

                  <div className="properties-modal-select-grid properties-modal-select-grid--three">
                    <label>
                      <span>Người đăng</span>
                      <div>
                        <UserRound size={18} />
                        <select
                          value={currentOwnerType}
                          onChange={(event) =>
                            update('ownerType', event.target.value)
                          }
                        >
                          <option value="">Tất cả người đăng</option>
                          {Object.entries(OWNER_TYPES).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>

                    <label>
                      <span>Pháp lý</span>
                      <div>
                        <ShieldCheck size={18} />
                        <select
                          value={currentLegalStatus}
                          onChange={(event) =>
                            update('legalStatus', event.target.value)
                          }
                        >
                          <option value="">Tất cả pháp lý</option>
                          {Object.entries(LEGAL_STATUS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>

                    <label>
                      <span>Sắp xếp</span>
                      <div>
                        <SortIcon size={18} />
                        <select
                          value={currentSort}
                          onChange={(event) => update('sort', event.target.value)}
                        >
                          {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>
                </section>

                {rangeError ? (
                  <div className="properties-range-error properties-range-error--modal">
                    {rangeError}
                  </div>
                ) : null}
              </div>

              <footer className="properties-filter-modal__footer">
                <button
                  type="button"
                  className="properties-filter-modal__reset"
                  onClick={clearFiltersOnly}
                >
                  <RotateCcw size={17} />
                  Đặt lại
                </button>

                <button
                  type="button"
                  className="properties-filter-modal__apply"
                  onClick={showFilterResults}
                >
                  Xem kết quả
                  {filterCount ? <span>{filterCount}</span> : null}
                </button>
              </footer>
            </section>
          </div>
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

              {!result.loading && !result.error ? (
                <p>
                  {total > 0 ? (
                    <>
                      Hiển thị <strong>{fromItem}–{toItem}</strong> trong tổng số{' '}
                      <strong>{total.toLocaleString('vi-VN')}</strong> tin đăng.
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
                  className={result.loading ? 'is-spinning' : ''}
                />
                Làm mới
              </button>

              <div className="properties-view-switch">
                <button
                  type="button"
                  className={viewMode === 'grid' ? 'is-active' : ''}
                  aria-label="Hiển thị dạng lưới"
                  title="Dạng lưới"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 size={18} />
                </button>

                <button
                  type="button"
                  className={viewMode === 'list' ? 'is-active' : ''}
                  aria-label="Hiển thị dạng danh sách"
                  title="Dạng danh sách"
                  onClick={() => setViewMode('list')}
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
              <ErrorState error={result.error} onRetry={result.reload} />
            ) : result.items.length ? (
              <div
                className={[
                  'properties-grid',
                  viewMode === 'list' ? 'is-list' : 'is-grid',
                ].join(' ')}
              >
                {result.items.map((item) => (
                  <article className="properties-item" key={item._id}>
                    <PropertyCard item={item} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="properties-empty-state">
                <span>
                  <Building2 size={39} />
                </span>

                <h3>Không có tin phù hợp</h3>

                <p>
                  {hasFilters
                    ? 'Hãy thử mở rộng khoảng giá, diện tích hoặc thay đổi khu vực tìm kiếm.'
                    : 'Hiện chưa có tin bất động sản nào được đăng trong hệ thống.'}
                </p>

                <div>
                  {hasFilters ? (
                    <button type="button" onClick={clearAllFilters}>
                      <RotateCcw size={17} />
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

        {!result.loading && !result.error && result.items.length ? (
          <div className="properties-pagination">
            <Pagination meta={result.meta} onPageChange={setPage} />

            {result.meta?.totalPages ? (
              <p>
                Trang {currentPage} / {result.meta.totalPages}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
