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
  BarChart3,
  Bookmark,
  Building2,
  ChevronDown,
  FileCheck2,
  Filter,
  Grid3X3,
  Layers3,
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
  WalletCards,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import PropertyCard from '../../components/content/PropertyCard';
import ContentImage from '../../components/content/ContentImage';
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
const SAVED_SEARCH_KEY = 'dothihoalac.property-saved-searches';

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
  { label: 'Tất cả mức giá', min: '', max: '' },
  { label: 'Dưới 1 tỷ', min: '', max: '1000000000' },
  { label: '1–3 tỷ', min: '1000000000', max: '3000000000' },
  { label: '3–5 tỷ', min: '3000000000', max: '5000000000' },
  { label: '5–10 tỷ', min: '5000000000', max: '10000000000' },
  { label: 'Trên 10 tỷ', min: '10000000000', max: '' },
];

const AREA_PRESETS = [
  { label: 'Tất cả diện tích', min: '', max: '' },
  { label: 'Dưới 50 m²', min: '', max: '50' },
  { label: '50–100 m²', min: '50', max: '100' },
  { label: '100–200 m²', min: '100', max: '200' },
  { label: '200–500 m²', min: '200', max: '500' },
  { label: 'Trên 500 m²', min: '500', max: '' },
];

const SORT_OPTIONS = [
  { value: '', label: 'Mới nhất', icon: RefreshCw },
  { value: 'price_asc', label: 'Giá tăng dần', icon: TrendingUp },
  { value: 'price_desc', label: 'Giá giảm dần', icon: TrendingDown },
];

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

function rangeValue(min, max) {
  return `${String(min || '')}|${String(max || '')}`;
}

function selectedPreset(presets, min, max) {
  const key = rangeValue(min, max);
  return presets.find((item) => rangeValue(item.min, item.max) === key) || presets[0];
}

function sanitizeNumber(value) {
  const clean = String(value ?? '').trim();
  if (!clean) return '';
  const number = Number(clean);
  if (!Number.isFinite(number) || number < 0) return '';
  return String(number);
}

function buildSavedSearchLabel({ query, area, propertyType, transactionType }) {
  if (query) return `“${query}”`;

  const pieces = [
    propertyType ? PROPERTY_TYPES[propertyType] : '',
    transactionType ? TRANSACTION_TYPES[transactionType] : '',
    area?.name || '',
  ].filter(Boolean);

  return pieces.length ? pieces.join(' · ') : 'Tìm kiếm bất động sản';
}

export default function PropertiesMarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { areas = [] } = useTaxonomy();
  const resultsRef = useRef(null);

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const [rangeDraft, setRangeDraft] = useState({
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
  });

  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      return ['list', 'grid'].includes(saved) ? saved : 'list';
    } catch {
      return 'list';
    }
  });

  const [savedSearches, setSavedSearches] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVED_SEARCH_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
    } catch {
      return [];
    }
  });

  const searchKey = searchParams.toString();

  const params = useMemo(() => {
    const source = new URLSearchParams(searchKey);
    const next = {};

    QUERY_KEYS.forEach((key) => {
      const value = source.get(key);
      if (value) next[key] = value;
    });

    return next;
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
          if (value !== undefined && value !== null && String(value).trim()) {
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
          if (value !== undefined && value !== null && String(value).trim()) {
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

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    setRangeDraft({
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice,
      minArea: currentMinArea,
      maxArea: currentMaxArea,
    });
    setRangeError('');
  }, [currentMinPrice, currentMaxPrice, currentMinArea, currentMaxArea]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Không ảnh hưởng trải nghiệm nếu localStorage bị chặn.
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(savedSearches));
    } catch {
      // Không ảnh hưởng trải nghiệm nếu localStorage bị chặn.
    }
  }, [savedSearches]);

  const filterCount = [
    currentPropertyType,
    currentArea,
    currentOwnerType,
    currentLegalStatus,
    currentMinPrice || currentMaxPrice,
    currentMinArea || currentMaxArea,
  ].filter(Boolean).length;

  const hasFilters = Boolean(
    filterCount || currentTransaction || currentSort || currentQuery,
  );

  const total = getTotal(result.meta, result.items.length);
  const currentPage = getCurrentPage(result.meta, searchParams);
  const pageSize = getPageSize(result.meta, result.items.length);
  const fromItem = total > 0 ? (currentPage - 1) * Math.max(pageSize, 1) + 1 : 0;
  const toItem = total > 0 ? Math.min(fromItem + result.items.length - 1, total) : 0;

  const currentPricePreset = selectedPreset(
    PRICE_PRESETS,
    currentMinPrice,
    currentMaxPrice,
  );
  const currentAreaPreset = selectedPreset(
    AREA_PRESETS,
    currentMinArea,
    currentMaxArea,
  );

  const heroMedia = result.items[0]?.thumbnailMediaId;

  const featuredAreas = useMemo(() => {
    return areas.slice(0, 5).map((area) => {
      const value = taxonomyUrlValue(area);
      const matchingItem = result.items.find((item) => {
        const primaryArea = item?.primaryAreaId;
        const itemId = primaryArea?._id || primaryArea;
        const itemSlug = primaryArea?.slug;
        return String(itemId || '') === String(area?._id || '') ||
          String(itemSlug || '') === String(area?.slug || '');
      });

      return {
        key: area?._id || area?.slug || area?.name,
        name: area?.name || 'Khu vực Hòa Lạc',
        value,
        media: matchingItem?.thumbnailMediaId,
      };
    });
  }, [areas, result.items]);

  const categoryItems = useMemo(() => {
    const propertyItems = Object.entries(PROPERTY_TYPES)
      .slice(0, 5)
      .map(([value, label]) => ({
        key: `property-${value}`,
        label,
        active: currentPropertyType === value,
        onClick: () => update('propertyType', currentPropertyType === value ? '' : value),
      }));

    return [
      {
        key: 'all',
        label: 'Tất cả',
        active: !currentPropertyType && !currentTransaction,
        onClick: () => updateMultiple({ propertyType: '', transactionType: '' }),
      },
      ...propertyItems,
      {
        key: 'rent',
        label: 'Cho thuê',
        active: currentTransaction === 'rent',
        onClick: () => update('transactionType', currentTransaction === 'rent' ? '' : 'rent'),
      },
    ];
  }, [currentPropertyType, currentTransaction, update, updateMultiple]);

  const marketSummary = useMemo(() => {
    const byType = new Map();
    result.items.forEach((item) => {
      const key = item?.property?.propertyType || 'other';
      byType.set(key, (byType.get(key) || 0) + 1);
    });

    let dominantType = '';
    let dominantCount = 0;
    byType.forEach((count, key) => {
      if (count > dominantCount) {
        dominantType = key;
        dominantCount = count;
      }
    });

    return {
      dominantType: dominantType ? PROPERTY_TYPES[dominantType] || 'Bất động sản' : 'Chưa có dữ liệu',
      dominantCount,
    };
  }, [result.items]);

  const applyPreset = useCallback(
    (preset, kind) => {
      if (kind === 'price') {
        updateMultiple({ minPrice: preset.min, maxPrice: preset.max });
      } else {
        updateMultiple({ minArea: preset.min, maxArea: preset.max });
      }
    },
    [updateMultiple],
  );

  const applyAdvanced = useCallback(() => {
    const minPrice = sanitizeNumber(rangeDraft.minPrice);
    const maxPrice = sanitizeNumber(rangeDraft.maxPrice);
    const minArea = sanitizeNumber(rangeDraft.minArea);
    const maxArea = sanitizeNumber(rangeDraft.maxArea);

    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setRangeError('Giá tối thiểu không được lớn hơn giá tối đa.');
      return;
    }

    if (minArea && maxArea && Number(minArea) > Number(maxArea)) {
      setRangeError('Diện tích tối thiểu không được lớn hơn diện tích tối đa.');
      return;
    }

    setRangeError('');
    updateMultiple({ minPrice, maxPrice, minArea, maxArea });
    setAdvancedOpen(false);
  }, [rangeDraft, updateMultiple]);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setAdvancedOpen(false);
    setRangeError('');
    setUrlParams((next) => {
      QUERY_KEYS.forEach((key) => next.delete(key));
    });
  }, [setUrlParams]);

  const saveCurrentSearch = useCallback(() => {
    const query = searchParams.toString();
    if (!query) return;

    const item = {
      id: `${Date.now()}`,
      label: buildSavedSearchLabel({
        query: currentQuery,
        area: selectedArea,
        propertyType: currentPropertyType,
        transactionType: currentTransaction,
      }),
      query,
    };

    setSavedSearches((current) => {
      const deduped = current.filter((saved) => saved.query !== query);
      return [item, ...deduped].slice(0, 4);
    });
  }, [
    searchParams,
    currentQuery,
    selectedArea,
    currentPropertyType,
    currentTransaction,
  ]);

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

  return (
    <section className="properties-page">
      <Seo
        title="Bất động sản Hòa Lạc"
        description="Tin mua bán, cho thuê nhà đất Hòa Lạc với bộ lọc giá, diện tích, pháp lý và khu vực."
      />

      <div className="properties-page__container">
        <header className="properties-hero">
          <div className="properties-hero__media" aria-hidden="true">
            <ContentImage media={heroMedia} alt="" ratio="wide" />
          </div>
          <div className="properties-hero__veil" aria-hidden="true" />

          <div className="properties-hero__content">
            <span className="properties-hero__eyebrow">
              <Building2 size={16} />
              Thị trường nhà đất địa phương
            </span>
            <h1>Bất động sản Hòa Lạc</h1>
            <p>
              Khám phá nhà đất chính chủ, pháp lý rõ ràng tại Hòa Lạc và khu vực lân cận.
            </p>
          </div>

          <form
            className="properties-hero__search"
            onSubmit={(event) => {
              event.preventDefault();
              update('q', searchInput.trim());
            }}
          >
            <label className="properties-search-field properties-search-field--keyword">
              <span>Từ khóa</span>
              <div>
                <Search size={17} />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Tìm bất động sản..."
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
                    <X size={15} />
                  </button>
                ) : null}
              </div>
            </label>

            <label className="properties-search-field">
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

            <label className="properties-search-field">
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

            <label className="properties-search-field">
              <span>Mức giá</span>
              <div>
                <WalletCards size={17} />
                <select
                  value={rangeValue(currentPricePreset.min, currentPricePreset.max)}
                  onChange={(event) => {
                    const preset = PRICE_PRESETS.find(
                      (item) => rangeValue(item.min, item.max) === event.target.value,
                    ) || PRICE_PRESETS[0];
                    applyPreset(preset, 'price');
                  }}
                >
                  {PRICE_PRESETS.map((preset) => (
                    <option key={preset.label} value={rangeValue(preset.min, preset.max)}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <label className="properties-search-field">
              <span>Diện tích</span>
              <div>
                <Ruler size={17} />
                <select
                  value={rangeValue(currentAreaPreset.min, currentAreaPreset.max)}
                  onChange={(event) => {
                    const preset = AREA_PRESETS.find(
                      (item) => rangeValue(item.min, item.max) === event.target.value,
                    ) || AREA_PRESETS[0];
                    applyPreset(preset, 'area');
                  }}
                >
                  {AREA_PRESETS.map((preset) => (
                    <option key={preset.label} value={rangeValue(preset.min, preset.max)}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </label>

            <button className="properties-hero__submit" type="submit">
              <Search size={17} />
              Tìm kiếm
            </button>
          </form>
        </header>

        <nav className="properties-category-rail" aria-label="Loại bất động sản nổi bật">
          {categoryItems.map((item) => (
            <button
              type="button"
              key={item.key}
              className={item.active ? 'is-active' : ''}
              onClick={item.onClick}
            >
              <Building2 size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        {featuredAreas.length ? (
          <section className="properties-featured-areas">
            <div className="properties-section-heading">
              <div>
                <span>Khu vực đáng chú ý</span>
                <h2>Khu vực nổi bật</h2>
              </div>
              <button type="button" onClick={() => update('area', '')}>
                Xem tất cả <ArrowRight size={15} />
              </button>
            </div>

            <div className="properties-featured-areas__grid">
              {featuredAreas.map((area) => (
                <button
                  type="button"
                  key={area.key}
                  className={currentArea === area.value ? 'is-active' : ''}
                  onClick={() => update('area', currentArea === area.value ? '' : area.value)}
                >
                  <span className="properties-featured-areas__image">
                    <ContentImage media={area.media} alt={area.name} ratio="wide" />
                  </span>
                  <strong>{area.name}</strong>
                  <small>Khám phá tin đăng</small>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="properties-marketplace" ref={resultsRef} id="property-results">
          <div className="properties-marketplace__toolbar">
            <div className="properties-toolbar-filters">
              <label>
                <MapPin size={16} />
                <select value={currentArea} onChange={(event) => update('area', event.target.value)}>
                  <option value="">Khu vực</option>
                  {areas.map((area) => (
                    <option key={area._id || area.slug} value={taxonomyUrlValue(area)}>
                      {area.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>

              <label>
                <WalletCards size={16} />
                <select
                  value={rangeValue(currentPricePreset.min, currentPricePreset.max)}
                  onChange={(event) => {
                    const preset = PRICE_PRESETS.find(
                      (item) => rangeValue(item.min, item.max) === event.target.value,
                    ) || PRICE_PRESETS[0];
                    applyPreset(preset, 'price');
                  }}
                >
                  {PRICE_PRESETS.map((preset) => (
                    <option key={preset.label} value={rangeValue(preset.min, preset.max)}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>

              <label>
                <Ruler size={16} />
                <select
                  value={rangeValue(currentAreaPreset.min, currentAreaPreset.max)}
                  onChange={(event) => {
                    const preset = AREA_PRESETS.find(
                      (item) => rangeValue(item.min, item.max) === event.target.value,
                    ) || AREA_PRESETS[0];
                    applyPreset(preset, 'area');
                  }}
                >
                  {AREA_PRESETS.map((preset) => (
                    <option key={preset.label} value={rangeValue(preset.min, preset.max)}>
                      {preset.label}
                    </option>
                  ))}
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

              <button
                type="button"
                className={advancedOpen ? 'is-active' : ''}
                onClick={() => setAdvancedOpen((open) => !open)}
              >
                <SlidersHorizontal size={16} />
                Bộ lọc
                {filterCount ? <b>{filterCount}</b> : null}
              </button>
            </div>

            <div className="properties-toolbar-views">
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
              <a href="#property-area-panel">
                <Map size={17} />
                Khu vực
              </a>
            </div>
          </div>

          {advancedOpen ? (
            <div className="properties-advanced-filter">
              <div className="properties-advanced-filter__heading">
                <div>
                  <Filter size={18} />
                  <strong>Bộ lọc chi tiết</strong>
                </div>
                <button type="button" onClick={() => setAdvancedOpen(false)} aria-label="Đóng bộ lọc">
                  <X size={18} />
                </button>
              </div>

              <div className="properties-advanced-filter__grid">
                <label>
                  <span>Giao dịch</span>
                  <select value={currentTransaction} onChange={(event) => update('transactionType', event.target.value)}>
                    <option value="">Tất cả giao dịch</option>
                    {Object.entries(TRANSACTION_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

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
                  <span>Giá từ</span>
                  <input
                    type="number"
                    min="0"
                    value={rangeDraft.minPrice}
                    onChange={(event) => setRangeDraft((current) => ({ ...current, minPrice: event.target.value }))}
                    placeholder="0"
                  />
                </label>

                <label>
                  <span>Giá đến</span>
                  <input
                    type="number"
                    min="0"
                    value={rangeDraft.maxPrice}
                    onChange={(event) => setRangeDraft((current) => ({ ...current, maxPrice: event.target.value }))}
                    placeholder="Không giới hạn"
                  />
                </label>

                <label>
                  <span>Diện tích từ</span>
                  <input
                    type="number"
                    min="0"
                    value={rangeDraft.minArea}
                    onChange={(event) => setRangeDraft((current) => ({ ...current, minArea: event.target.value }))}
                    placeholder="0"
                  />
                </label>

                <label>
                  <span>Diện tích đến</span>
                  <input
                    type="number"
                    min="0"
                    value={rangeDraft.maxArea}
                    onChange={(event) => setRangeDraft((current) => ({ ...current, maxArea: event.target.value }))}
                    placeholder="Không giới hạn"
                  />
                </label>
              </div>

              {rangeError ? <p className="properties-advanced-filter__error">{rangeError}</p> : null}

              <div className="properties-advanced-filter__actions">
                <button type="button" onClick={clearAllFilters}>
                  <RotateCcw size={16} />
                  Xóa bộ lọc
                </button>
                <button type="button" onClick={applyAdvanced}>Áp dụng</button>
              </div>
            </div>
          ) : null}

          <div className="properties-results-bar">
            <div>
              <FileCheck2 size={16} />
              {!result.loading && !result.error ? (
                total > 0 ? (
                  <span>
                    <strong>{total.toLocaleString('vi-VN')}</strong> bất động sản phù hợp
                  </span>
                ) : (
                  <span>Chưa có bất động sản phù hợp</span>
                )
              ) : (
                <span>Đang cập nhật danh sách</span>
              )}
            </div>

            <label>
              <span>Sắp xếp:</span>
              <select value={currentSort} onChange={(event) => update('sort', event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
          </div>

          <div className="properties-marketplace__layout">
            <main className="properties-results-column">
              {result.loading ? (
                <LoadingBlock />
              ) : result.error ? (
                <ErrorState error={result.error} onRetry={result.reload} />
              ) : result.items.length ? (
                <div className={`properties-grid is-${viewMode}`}>
                  {result.items.map((item) => (
                    <div className="properties-item" key={item._id}>
                      <PropertyCard item={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="properties-empty-state">
                  <Building2 size={38} />
                  <h3>Không có tin phù hợp</h3>
                  <p>Hãy thử mở rộng khu vực, khoảng giá hoặc diện tích để xem thêm tin đăng.</p>
                  {hasFilters ? (
                    <button type="button" onClick={clearAllFilters}>
                      <RotateCcw size={16} />
                      Xóa tất cả bộ lọc
                    </button>
                  ) : null}
                </div>
              )}

              {!result.loading && !result.error && result.items.length ? (
                <div className="properties-pagination">
                  <Pagination meta={result.meta} onPageChange={setPage} />
                  {result.meta?.totalPages ? (
                    <p>Trang {currentPage} / {result.meta.totalPages} · Hiển thị {fromItem}–{toItem}</p>
                  ) : null}
                </div>
              ) : null}
            </main>

            <aside className="properties-marketplace__aside">
              <section className="properties-side-card" id="property-area-panel">
                <div className="properties-side-card__heading">
                  <Map size={18} />
                  <div>
                    <strong>Sơ đồ khu vực</strong>
                    <span>Chọn nhanh địa bàn</span>
                  </div>
                </div>

                <div className="properties-area-map">
                  {areas.slice(0, 5).map((area, index) => {
                    const value = taxonomyUrlValue(area);
                    return (
                      <button
                        type="button"
                        key={area._id || area.slug}
                        className={`properties-area-map__pin pin-${index + 1} ${currentArea === value ? 'is-active' : ''}`}
                        onClick={() => update('area', currentArea === value ? '' : value)}
                      >
                        {area.name}
                      </button>
                    );
                  })}
                </div>

                <button type="button" className="properties-side-card__wide-button" onClick={() => update('area', '')}>
                  Xem tất cả khu vực
                </button>
              </section>

              <section className="properties-side-card">
                <div className="properties-side-card__heading properties-side-card__heading--row">
                  <div>
                    <Bookmark size={18} />
                    <strong>Tìm kiếm đã lưu</strong>
                  </div>
                  {savedSearches.length ? (
                    <button type="button" onClick={() => setSavedSearches([])}>Xóa</button>
                  ) : null}
                </div>

                {savedSearches.length ? (
                  <div className="properties-saved-searches">
                    {savedSearches.map((saved) => (
                      <button
                        type="button"
                        key={saved.id}
                        onClick={() => setSearchParams(new URLSearchParams(saved.query))}
                      >
                        <span>{saved.label}</span>
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="properties-side-card__empty-copy">
                    Lưu bộ lọc hiện tại để quay lại nhanh trong lần truy cập sau.
                  </p>
                )}

                <button
                  type="button"
                  className="properties-side-card__wide-button"
                  disabled={!hasFilters}
                  onClick={saveCurrentSearch}
                >
                  <Plus size={15} />
                  Lưu tìm kiếm hiện tại
                </button>
              </section>

              <section className="properties-side-card properties-market-card">
                <div className="properties-side-card__heading">
                  <BarChart3 size={18} />
                  <div>
                    <strong>Thị trường Hòa Lạc</strong>
                    <span>Dữ liệu từ danh sách đang xem</span>
                  </div>
                </div>

                <dl>
                  <div>
                    <dt>Nguồn cung phù hợp</dt>
                    <dd>{total.toLocaleString('vi-VN')} tin</dd>
                  </div>
                  <div>
                    <dt>Đang hiển thị</dt>
                    <dd>{result.items.length} tin</dd>
                  </div>
                  <div>
                    <dt>Loại xuất hiện nhiều</dt>
                    <dd>{marketSummary.dominantType}</dd>
                  </div>
                  <div>
                    <dt>Bộ lọc đang dùng</dt>
                    <dd>{filterCount} tiêu chí</dd>
                  </div>
                </dl>
              </section>

              <section className="properties-side-cta">
                <div>
                  <Layers3 size={22} />
                  <span>Đăng tin bất động sản</span>
                  <strong>Tiếp cận người đang quan tâm tại Hòa Lạc</strong>
                </div>
                <Link to="/dang-bai/nha-dat">
                  Đăng tin ngay <ArrowRight size={16} />
                </Link>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </section>
  );
}
