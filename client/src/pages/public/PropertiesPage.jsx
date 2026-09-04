import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  Filter,
  Grid3X3,
  Home,
  KeyRound,
  Landmark,
  List,
  Map,
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
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import PropertyCard from '../../components/content/PropertyCard';
import ContentImage from '../../components/content/ContentImage';

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

const VIEW_MODE_KEY = 'dothihoalac.property-view-mode.reference';

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
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(number);
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';

  if (number >= 1_000_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(number / 1_000_000_000)} tỷ`;
  }

  if (number >= 1_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000)} triệu`;
  }

  return `${formatNumber(number)} đồng`;
}

function getRangeLabel({ min, max, formatter, suffix = '' }) {
  if (min && max) return `${formatter(min)} – ${formatter(max)}${suffix}`;
  if (min) return `Từ ${formatter(min)}${suffix}`;
  if (max) return `Đến ${formatter(max)}${suffix}`;
  return '';
}

function getTotal(meta, itemCount) {
  return Number(meta?.total ?? meta?.totalItems ?? meta?.itemCount ?? itemCount ?? 0);
}

function getCurrentPage(meta, searchParams) {
  return Number(meta?.page ?? meta?.currentPage ?? searchParams.get('page') ?? 1);
}

function getPageSize(meta, itemCount) {
  return Number(meta?.limit ?? meta?.pageSize ?? meta?.perPage ?? itemCount ?? 0);
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

function presetValue(preset) {
  return `${preset.min}|${preset.max}`;
}

function findPreset(presets, min, max) {
  return presets.find(
    (preset) =>
      String(preset.min) === String(min) &&
      String(preset.max) === String(max),
  );
}

function sameArea(item, area) {
  const itemArea = item?.primaryAreaId;
  if (!itemArea || !area) return false;

  const itemKeys = [itemArea?._id, itemArea?.slug, itemArea?.name]
    .filter(Boolean)
    .map(String);
  const areaKeys = [area?._id, area?.slug, area?.name]
    .filter(Boolean)
    .map(String);

  return itemKeys.some((key) => areaKeys.includes(key));
}

function getTransactionIcon(value) {
  return TRANSACTION_ICONS[value] || Building2;
}

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { areas = [] } = useTaxonomy();
  const resultsRef = useRef(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState(() => {
    try {
      const savedValue = localStorage.getItem(VIEW_MODE_KEY);
      return ['grid', 'list'].includes(savedValue) ? savedValue : 'list';
    } catch {
      return 'list';
    }
  });

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
          if (value !== undefined && value !== null && String(value).trim() !== '') {
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
          if (value !== undefined && value !== null && String(value).trim() !== '') {
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
  }, [currentMinPrice, currentMaxPrice, currentMinArea, currentMaxArea]);

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    syncRangeDrafts();
  }, [syncRangeDrafts]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Local storage is optional.
    }
  }, [viewMode]);

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

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setRangeValues({ minPrice: '', maxPrice: '', minArea: '', maxArea: '' });
    setRangeError('');
    setUrlParams((next) => QUERY_KEYS.forEach((key) => next.delete(key)));
  }, [setUrlParams]);

  const setPage = useCallback(
    (page) => {
      setUrlParams((next) => {
        if (Number(page) <= 1) next.delete('page');
        else next.set('page', String(page));
      });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 30);
    },
    [setUrlParams],
  );

  const handlePresetSelect = useCallback(
    (type, value) => {
      if (!value) {
        if (type === 'price') updateMultiple({ minPrice: '', maxPrice: '' });
        else updateMultiple({ minArea: '', maxArea: '' });
        return;
      }

      if (value === 'custom') {
        syncRangeDrafts();
        setFiltersOpen(true);
        return;
      }

      const [min, max] = value.split('|');
      if (type === 'price') updateMultiple({ minPrice: min, maxPrice: max });
      else updateMultiple({ minArea: min, maxArea: max });
    },
    [syncRangeDrafts, updateMultiple],
  );

  const total = getTotal(result.meta, result.items.length);
  const currentPage = getCurrentPage(result.meta, searchParams);
  const pageSize = getPageSize(result.meta, result.items.length);
  const fromItem = total > 0 ? (currentPage - 1) * Math.max(pageSize, 1) + 1 : 0;
  const toItem = total > 0 ? Math.min(fromItem + result.items.length - 1, total) : 0;

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

  const pricePreset = findPreset(PRICE_PRESETS, currentMinPrice, currentMaxPrice);
  const areaPreset = findPreset(AREA_PRESETS, currentMinArea, currentMaxArea);
  const priceSelectValue = pricePreset
    ? presetValue(pricePreset)
    : priceRangeLabel
      ? 'custom'
      : '';
  const areaSelectValue = areaPreset
    ? presetValue(areaPreset)
    : areaRangeLabel
      ? 'custom'
      : '';

  const filterCount =
    (currentPropertyType ? 1 : 0) +
    (currentArea ? 1 : 0) +
    (currentOwnerType ? 1 : 0) +
    (currentLegalStatus ? 1 : 0) +
    (currentTransaction ? 1 : 0) +
    (currentMinPrice || currentMaxPrice ? 1 : 0) +
    (currentMinArea || currentMaxArea ? 1 : 0) +
    (currentQuery ? 1 : 0);

  const hasFilters = Boolean(filterCount || currentSort);
  const featuredAreas = areas.slice(0, 5);
  const heroMedia = result.items.find((item) => item?.thumbnailMediaId)?.thumbnailMediaId;
  const currentSortOption =
    SORT_OPTIONS.find((option) => option.value === currentSort) || SORT_OPTIONS[0];
  const SortIcon = currentSortOption.icon;

  return (
    <section className="properties-page">
      <Seo
        title="Bất động sản Hòa Lạc"
        description="Tin mua bán, cho thuê nhà đất Hòa Lạc với bộ lọc giá, diện tích, pháp lý và khu vực."
      />

      <div className="properties-page__container">
        <header className="properties-hero">
          {heroMedia ? (
            <ContentImage
              media={heroMedia}
              alt=""
              className="properties-hero__background"
              loading="eager"
              fetchPriority="high"
            />
          ) : null}

          <div className="properties-hero__shade" aria-hidden="true" />

          <div className="properties-hero__content">
            <span className="properties-hero__eyebrow">
              <Landmark size={17} />
              Thị trường bất động sản Hòa Lạc
            </span>
            <h1>Bất động sản Hòa Lạc</h1>
            <p>
              Khám phá hàng ngàn bất động sản chính chủ, pháp lý rõ ràng tại Hòa Lạc và vùng ven.
            </p>
          </div>

          <form
            className="properties-hero__finder"
            onSubmit={(event) => {
              event.preventDefault();
              resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <label>
              <span>Khu vực</span>
              <div>
                <MapPin size={17} />
                <select value={currentArea} onChange={(event) => update('area', event.target.value)}>
                  <option value="">Chọn khu vực</option>
                  {areas.map((area) => (
                    <option key={area._id || area.slug} value={taxonomyUrlValue(area)}>
                      {area.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <label>
              <span>Loại bất động sản</span>
              <div>
                <Building2 size={17} />
                <select
                  value={currentPropertyType}
                  onChange={(event) => update('propertyType', event.target.value)}
                >
                  <option value="">Chọn loại</option>
                  {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <label>
              <span>Mức giá</span>
              <div>
                <WalletCards size={17} />
                <select value={priceSelectValue} onChange={(event) => handlePresetSelect('price', event.target.value)}>
                  <option value="">Tất cả mức giá</option>
                  {PRICE_PRESETS.map((preset) => (
                    <option key={preset.label} value={presetValue(preset)}>{preset.label}</option>
                  ))}
                  {priceRangeLabel && !pricePreset ? <option value="custom">Tùy chỉnh</option> : null}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <label>
              <span>Diện tích</span>
              <div>
                <Ruler size={17} />
                <select value={areaSelectValue} onChange={(event) => handlePresetSelect('area', event.target.value)}>
                  <option value="">Tất cả diện tích</option>
                  {AREA_PRESETS.map((preset) => (
                    <option key={preset.label} value={presetValue(preset)}>{preset.label}</option>
                  ))}
                  {areaRangeLabel && !areaPreset ? <option value="custom">Tùy chỉnh</option> : null}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <button type="submit">
              <Search size={18} />
              Tìm kiếm
            </button>
          </form>
        </header>

        <nav className="properties-type-rail" aria-label="Loại bất động sản">
          <button
            type="button"
            className={!currentPropertyType ? 'is-active' : ''}
            onClick={() => update('propertyType', '')}
          >
            <Building2 size={17} />
            Tất cả
          </button>

          {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={currentPropertyType === value ? 'is-active' : ''}
              onClick={() => update('propertyType', currentPropertyType === value ? '' : value)}
            >
              <Home size={17} />
              {label}
            </button>
          ))}
        </nav>

        {featuredAreas.length ? (
          <section className="properties-featured-areas" aria-labelledby="featured-areas-heading">
            <header>
              <div>
                <span>Khu vực</span>
                <h2 id="featured-areas-heading">Khu vực nổi bật</h2>
              </div>
              <button type="button" onClick={() => update('area', '')}>
                Xem tất cả <ArrowRight size={16} />
              </button>
            </header>

            <div className="properties-featured-areas__grid">
              {featuredAreas.map((area, index) => {
                const areaItem = result.items.find((item) => sameArea(item, area));
                const selected =
                  String(currentArea) === String(area?._id) ||
                  String(currentArea) === String(area?.slug);
                const count = Number(area?.propertyCount ?? area?.listingCount ?? area?.count ?? 0);

                return (
                  <button
                    type="button"
                    key={area._id || area.slug || area.name}
                    className={selected ? 'is-active' : ''}
                    onClick={() => update('area', selected ? '' : taxonomyUrlValue(area))}
                  >
                    <span className="properties-featured-areas__media">
                      {areaItem?.thumbnailMediaId ? (
                        <ContentImage
                          media={areaItem.thumbnailMediaId}
                          alt=""
                          ratio="property"
                          loading={index < 2 ? 'eager' : 'lazy'}
                        />
                      ) : (
                        <span className="properties-featured-areas__placeholder">
                          <Landmark size={28} />
                        </span>
                      )}
                    </span>
                    <strong>{area.name}</strong>
                    {count > 0 ? <small>{count.toLocaleString('vi-VN')} tin</small> : <small>Khám phá khu vực</small>}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <main className="properties-market-shell" ref={resultsRef} id="property-results">
          <section className="properties-toolbar" aria-label="Bộ lọc nhanh">
            <div className="properties-toolbar__filters">
              <label>
                <MapPin size={16} />
                <select value={currentArea} onChange={(event) => update('area', event.target.value)}>
                  <option value="">Khu vực</option>
                  {areas.map((area) => (
                    <option key={area._id || area.slug} value={taxonomyUrlValue(area)}>{area.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>

              <label>
                <WalletCards size={16} />
                <select value={priceSelectValue} onChange={(event) => handlePresetSelect('price', event.target.value)}>
                  <option value="">Mức giá</option>
                  {PRICE_PRESETS.map((preset) => (
                    <option key={preset.label} value={presetValue(preset)}>{preset.label}</option>
                  ))}
                  {priceRangeLabel && !pricePreset ? <option value="custom">Tùy chỉnh</option> : null}
                </select>
                <ChevronDown size={14} />
              </label>

              <label>
                <Ruler size={16} />
                <select value={areaSelectValue} onChange={(event) => handlePresetSelect('area', event.target.value)}>
                  <option value="">Diện tích</option>
                  {AREA_PRESETS.map((preset) => (
                    <option key={preset.label} value={presetValue(preset)}>{preset.label}</option>
                  ))}
                  {areaRangeLabel && !areaPreset ? <option value="custom">Tùy chỉnh</option> : null}
                </select>
                <ChevronDown size={14} />
              </label>

              <label>
                <ShieldCheck size={16} />
                <select value={currentLegalStatus} onChange={(event) => update('legalStatus', event.target.value)}>
                  <option value="">Pháp lý</option>
                  {Object.entries(LEGAL_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>

              <button type="button" className="properties-toolbar__advanced" onClick={() => {
                syncRangeDrafts();
                setFiltersOpen(true);
              }}>
                <SlidersHorizontal size={16} />
                Bộ lọc
                {filterCount ? <b>{filterCount}</b> : null}
              </button>
            </div>

            <div className="properties-toolbar__views">
              <button
                type="button"
                className={viewMode === 'list' ? 'is-active' : ''}
                onClick={() => setViewMode('list')}
              >
                <List size={17} />
                Danh sách
              </button>
              <button
                type="button"
                className={viewMode === 'grid' ? 'is-active' : ''}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 size={17} />
                Lưới
              </button>
            </div>
          </section>

          <section className="properties-results">
            <header className="properties-results__header">
              <div>
                <span className="properties-results__eyebrow">
                  <FileCheck2 size={15} />
                  {result.loading ? 'Đang tải bất động sản' : `${total.toLocaleString('vi-VN')} bất động sản phù hợp`}
                </span>
                <h2>
                  {currentQuery
                    ? `Kết quả cho “${currentQuery}”`
                    : hasFilters
                      ? 'Bất động sản theo bộ lọc'
                      : 'Bất động sản mới nhất'}
                </h2>
              </div>

              <div className="properties-results__controls">
                <form
                  className="properties-results__search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    update('q', searchInput.trim());
                  }}
                >
                  <Search size={16} />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Tìm trong danh sách..."
                    aria-label="Tìm trong danh sách bất động sản"
                  />
                  {searchInput ? (
                    <button type="button" aria-label="Xóa từ khóa" onClick={() => {
                      setSearchInput('');
                      update('q', '');
                    }}>
                      <X size={14} />
                    </button>
                  ) : null}
                </form>

                <label className="properties-results__sort">
                  <span>Sắp xếp:</span>
                  <SortIcon size={15} />
                  <select value={currentSort} onChange={(event) => update('sort', event.target.value)}>
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
            </header>

            {filterCount ? (
              <div className="properties-active-filters">
                <span>Đang lọc</span>
                {currentArea ? (
                  <button type="button" onClick={() => update('area', '')}>
                    {selectedArea?.name || 'Khu vực'} <X size={12} />
                  </button>
                ) : null}
                {currentPropertyType ? (
                  <button type="button" onClick={() => update('propertyType', '')}>
                    {PROPERTY_TYPES[currentPropertyType] || currentPropertyType} <X size={12} />
                  </button>
                ) : null}
                {priceRangeLabel ? (
                  <button type="button" onClick={() => updateMultiple({ minPrice: '', maxPrice: '' })}>
                    {priceRangeLabel} <X size={12} />
                  </button>
                ) : null}
                {areaRangeLabel ? (
                  <button type="button" onClick={() => updateMultiple({ minArea: '', maxArea: '' })}>
                    {areaRangeLabel} <X size={12} />
                  </button>
                ) : null}
                {currentLegalStatus ? (
                  <button type="button" onClick={() => update('legalStatus', '')}>
                    {LEGAL_STATUS[currentLegalStatus] || currentLegalStatus} <X size={12} />
                  </button>
                ) : null}
                {currentTransaction ? (
                  <button type="button" onClick={() => update('transactionType', '')}>
                    {TRANSACTION_TYPES[currentTransaction] || currentTransaction} <X size={12} />
                  </button>
                ) : null}
                <button type="button" className="properties-active-filters__clear" onClick={clearAllFilters}>
                  Xóa tất cả
                </button>
              </div>
            ) : null}

            <div className="properties-results-layout">
              <div className="properties-results__body">
                {result.loading ? (
                  <LoadingBlock />
                ) : result.error ? (
                  <ErrorState error={result.error} onRetry={result.reload} />
                ) : result.items.length ? (
                  <>
                    <div className={`properties-grid ${viewMode === 'list' ? 'is-list' : 'is-grid'}`}>
                      {result.items.map((item) => (
                        <article className="properties-item" key={item._id}>
                          <PropertyCard item={item} />
                        </article>
                      ))}
                    </div>

                    <div className="properties-pagination">
                      <Pagination meta={result.meta} onPageChange={setPage} />
                      {result.meta?.totalPages ? (
                        <p>Trang {currentPage} / {result.meta.totalPages}</p>
                      ) : null}
                      {total > 0 ? (
                        <small>Hiển thị {fromItem}–{toItem} trong {total.toLocaleString('vi-VN')} tin</small>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="properties-empty-state">
                    <span><Building2 size={36} /></span>
                    <h3>Không có tin phù hợp</h3>
                    <p>
                      {hasFilters
                        ? 'Hãy thử mở rộng khoảng giá, diện tích hoặc thay đổi khu vực tìm kiếm.'
                        : 'Hiện chưa có tin bất động sản nào được đăng trong hệ thống.'}
                    </p>
                    <div>
                      {hasFilters ? (
                        <button type="button" onClick={clearAllFilters}>
                          <RotateCcw size={16} /> Xóa bộ lọc
                        </button>
                      ) : null}
                      <Link to="/dang-bai/nha-dat"><Plus size={16} /> Đăng tin nhà đất</Link>
                    </div>
                  </div>
                )}
              </div>

              <aside className="properties-sidebar">
                <section className="properties-sidebar-card properties-sidebar-map">
                  <header>
                    <div>
                      <Map size={18} />
                      <h3>Khu vực Hòa Lạc</h3>
                    </div>
                  </header>
                  <div className="properties-sidebar-map__visual" aria-hidden="true">
                    <span className="route route-a" />
                    <span className="route route-b" />
                    {featuredAreas.slice(0, 4).map((area, index) => (
                      <span className={`map-dot map-dot-${index + 1}`} key={area._id || area.slug || area.name}>
                        {index + 1}
                      </span>
                    ))}
                  </div>
                  <div className="properties-sidebar-map__areas">
                    {featuredAreas.slice(0, 4).map((area) => (
                      <button
                        type="button"
                        key={area._id || area.slug || area.name}
                        onClick={() => update('area', taxonomyUrlValue(area))}
                      >
                        <MapPin size={13} /> {area.name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="properties-sidebar-card properties-market-card">
                  <header>
                    <div>
                      <TrendingUp size={18} />
                      <h3>Thị trường Hòa Lạc</h3>
                    </div>
                  </header>
                  <dl>
                    <div>
                      <dt>Nguồn cung</dt>
                      <dd>{total.toLocaleString('vi-VN')} tin</dd>
                    </div>
                    <div>
                      <dt>Khu vực</dt>
                      <dd>{areas.length.toLocaleString('vi-VN')}</dd>
                    </div>
                    <div>
                      <dt>Loại hình</dt>
                      <dd>{Object.keys(PROPERTY_TYPES).length.toLocaleString('vi-VN')}</dd>
                    </div>
                  </dl>
                  <button type="button" onClick={result.reload} disabled={result.loading}>
                    <RefreshCw size={15} className={result.loading ? 'is-spinning' : ''} />
                    Cập nhật dữ liệu
                  </button>
                </section>

                <section className="properties-sidebar-card properties-post-card">
                  <Building2 size={28} />
                  <h3>Đăng tin bất động sản</h3>
                  <p>Tiếp cận người tìm kiếm bất động sản tại Hòa Lạc trên cùng hệ thống.</p>
                  <Link to="/dang-bai/nha-dat">
                    Đăng tin ngay <ArrowRight size={16} />
                  </Link>
                </section>
              </aside>
            </div>
          </section>
        </main>

        {filtersOpen ? (
          <div className="properties-filter-modal-layer">
            <button
              type="button"
              className="properties-filter-modal-backdrop"
              aria-label="Đóng bộ lọc"
              onClick={() => {
                syncRangeDrafts();
                setFiltersOpen(false);
              }}
            />

            <section className="properties-filter-modal" role="dialog" aria-modal="true" aria-label="Bộ lọc bất động sản">
              <header className="properties-filter-modal__header">
                <div>
                  <SlidersHorizontal size={20} />
                  <div>
                    <small>Tìm chính xác hơn</small>
                    <strong>Bộ lọc bất động sản</strong>
                  </div>
                </div>
                <button type="button" aria-label="Đóng" onClick={() => {
                  syncRangeDrafts();
                  setFiltersOpen(false);
                }}>
                  <X size={21} />
                </button>
              </header>

              <div className="properties-filter-modal__body">
                <section className="properties-filter-modal__section">
                  <h3>Giao dịch & loại hình</h3>
                  <div className="properties-filter-choice-grid">
                    <label>
                      <span>Nhu cầu</span>
                      <select value={currentTransaction} onChange={(event) => update('transactionType', event.target.value)}>
                        <option value="">Tất cả giao dịch</option>
                        {Object.entries(TRANSACTION_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Loại bất động sản</span>
                      <select value={currentPropertyType} onChange={(event) => update('propertyType', event.target.value)}>
                        <option value="">Tất cả loại BĐS</option>
                        {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Khu vực</span>
                      <select value={currentArea} onChange={(event) => update('area', event.target.value)}>
                        <option value="">Tất cả khu vực</option>
                        {areas.map((area) => (
                          <option key={area._id || area.slug} value={taxonomyUrlValue(area)}>{area.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="properties-filter-modal__section">
                  <div className="properties-filter-modal__section-heading">
                    <div><WalletCards size={18} /><h3>Khoảng giá</h3></div>
                    {priceRangeLabel ? <span>{priceRangeLabel}</span> : null}
                  </div>
                  <div className="properties-modal-range-inputs">
                    <label>
                      <span>Từ</span>
                      <input
                        type="number"
                        min="0"
                        value={rangeValues.minPrice}
                        onChange={(event) => setRangeValues((current) => ({ ...current, minPrice: event.target.value }))}
                        placeholder="0"
                      />
                      <small>VNĐ</small>
                    </label>
                    <b>–</b>
                    <label>
                      <span>Đến</span>
                      <input
                        type="number"
                        min="0"
                        value={rangeValues.maxPrice}
                        onChange={(event) => setRangeValues((current) => ({ ...current, maxPrice: event.target.value }))}
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
                          onClick={() => setRangeValues((current) => ({ ...current, minPrice: preset.min, maxPrice: preset.max }))}
                        >
                          {selected ? <Check size={13} /> : null}{preset.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="properties-filter-modal__section">
                  <div className="properties-filter-modal__section-heading">
                    <div><Ruler size={18} /><h3>Diện tích</h3></div>
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
                        onChange={(event) => setRangeValues((current) => ({ ...current, minArea: event.target.value }))}
                        placeholder="0"
                      />
                      <small>m²</small>
                    </label>
                    <b>–</b>
                    <label>
                      <span>Đến</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={rangeValues.maxArea}
                        onChange={(event) => setRangeValues((current) => ({ ...current, maxArea: event.target.value }))}
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
                          onClick={() => setRangeValues((current) => ({ ...current, minArea: preset.min, maxArea: preset.max }))}
                        >
                          {selected ? <Check size={13} /> : null}{preset.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="properties-filter-modal__section">
                  <h3>Thông tin tin đăng</h3>
                  <div className="properties-filter-choice-grid">
                    <label>
                      <span>Người đăng</span>
                      <select value={currentOwnerType} onChange={(event) => update('ownerType', event.target.value)}>
                        <option value="">Tất cả người đăng</option>
                        {Object.entries(OWNER_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Pháp lý</span>
                      <select value={currentLegalStatus} onChange={(event) => update('legalStatus', event.target.value)}>
                        <option value="">Tất cả pháp lý</option>
                        {Object.entries(LEGAL_STATUS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Sắp xếp</span>
                      <select value={currentSort} onChange={(event) => update('sort', event.target.value)}>
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                {rangeError ? <div className="properties-range-error">{rangeError}</div> : null}
              </div>

              <footer className="properties-filter-modal__footer">
                <button type="button" className="properties-filter-modal__reset" onClick={clearAllFilters}>
                  <RotateCcw size={16} /> Đặt lại
                </button>
                <button type="button" className="properties-filter-modal__apply" onClick={() => {
                  if (applyRangeFilters()) setFiltersOpen(false);
                }}>
                  Xem kết quả {filterCount ? <span>{filterCount}</span> : null}
                </button>
              </footer>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
