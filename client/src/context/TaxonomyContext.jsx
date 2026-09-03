import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { taxonomyApi } from '../api/taxonomy.api';

const TaxonomyContext = createContext(null);
const TAXONOMY_CACHE_KEY = 'dthl:taxonomy-cache:v2';
const TAXONOMY_INVALIDATION_KEY = 'dthl:taxonomy-invalidated-at';
const TAXONOMY_CHANGED_EVENT = 'dthl:taxonomy-changed';
const TAXONOMY_CACHE_TTL_MS = 10 * 60 * 1000;

function activeOnly(items) {
  return Array.isArray(items)
    ? items.filter((item) => item?.isActive !== false)
    : [];
}

function readCache() {
  if (typeof window === 'undefined') return null;

  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(TAXONOMY_CACHE_KEY) || 'null',
    );

    if (
      !parsed ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.areas) ||
      !Array.isArray(parsed.tags) ||
      !Number.isFinite(Number(parsed.savedAt))
    ) {
      return null;
    }

    if (Date.now() - Number(parsed.savedAt) > TAXONOMY_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(TAXONOMY_CACHE_KEY);
      return null;
    }

    return {
      ...parsed,
      categories: activeOnly(parsed.categories),
      areas: activeOnly(parsed.areas),
      tags: activeOnly(parsed.tags),
    };
  } catch {
    return null;
  }
}

function writeCache(categories, areas, tags) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      TAXONOMY_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        categories: activeOnly(categories),
        areas: activeOnly(areas),
        tags: activeOnly(tags),
      }),
    );
  } catch {
    // Storage có thể bị trình duyệt chặn; taxonomy vẫn hoạt động từ API.
  }
}

export function invalidateTaxonomyCache() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(TAXONOMY_CACHE_KEY);
    window.localStorage.setItem(TAXONOMY_INVALIDATION_KEY, String(Date.now()));
  } catch {
    // Không chặn thao tác admin nếu storage không khả dụng.
  }

  window.dispatchEvent(new CustomEvent(TAXONOMY_CHANGED_EVENT));
}

export function TaxonomyProvider({ children }) {
  const [cached] = useState(readCache);
  const [categories, setCategories] = useState(() => cached?.categories || []);
  const [areas, setAreas] = useState(() => cached?.areas || []);
  const [tags, setTags] = useState(() => cached?.tags || []);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(() => Boolean(cached));
  const requestRef = useRef(null);

  const reload = useCallback(async ({ fresh = false } = {}) => {
    if (requestRef.current) return requestRef.current;

    setLoading(true);

    const request = (async () => {
      const result = await taxonomyApi.bootstrap(
        fresh ? { params: { _taxonomyRefresh: Date.now() } } : {},
      );
      const nextCategories = activeOnly(result?.categories);
      const nextAreas = activeOnly(result?.areas);
      const nextTags = activeOnly(result?.tags);

      setCategories(nextCategories);
      setAreas(nextAreas);
      setTags(nextTags);
      writeCache(nextCategories, nextAreas, nextTags);

      return {
        categories: nextCategories,
        areas: nextAreas,
        tags: nextTags,
      };
    })();

    requestRef.current = request;

    try {
      return await request;
    } finally {
      if (requestRef.current === request) requestRef.current = null;
      setInitialized(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      try {
        window.sessionStorage.removeItem(TAXONOMY_CACHE_KEY);
      } catch {
        // Ignore storage failures and still refresh from API.
      }
      void reload({ fresh: true });
    };

    const handleStorage = (event) => {
      if (event.key === TAXONOMY_INVALIDATION_KEY) refresh();
    };

    window.addEventListener(TAXONOMY_CHANGED_EVENT, refresh);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(TAXONOMY_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [reload]);

  const categoriesFor = useCallback(
    (scope) =>
      categories.filter(
        (item) =>
          item.isActive !== false &&
          (item.contentScope === 'all' || item.contentScope === scope),
      ),
    [categories],
  );

  const areaBySlug = useCallback(
    (slug) => areas.find((item) => item.isActive !== false && item.slug === slug),
    [areas],
  );

  const value = useMemo(
    () => ({
      categories,
      areas,
      tags,
      loading,
      initialized,
      reload,
      categoriesFor,
      areaBySlug,
    }),
    [categories, areas, tags, loading, initialized, reload, categoriesFor, areaBySlug],
  );

  return (
    <TaxonomyContext.Provider value={value}>
      {children}
    </TaxonomyContext.Provider>
  );
}

export function useTaxonomy() {
  const context = useContext(TaxonomyContext);
  if (!context) throw new Error('useTaxonomy must be used inside TaxonomyProvider');

  useEffect(() => {
    if (!context.initialized && !context.loading) {
      void context.reload();
    }
  }, [context.initialized, context.loading, context.reload]);

  return context;
}
