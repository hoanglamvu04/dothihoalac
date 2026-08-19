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
const TAXONOMY_CACHE_KEY = 'dthl:taxonomy-cache:v1';
const TAXONOMY_CACHE_TTL_MS = 10 * 60 * 1000;

function readCache() {
  if (typeof window === 'undefined') return null;

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(TAXONOMY_CACHE_KEY) || 'null');

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

    return parsed;
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
        categories,
        areas,
        tags,
      }),
    );
  } catch {
    // Storage có thể bị trình duyệt chặn; taxonomy vẫn hoạt động từ API.
  }
}

export function TaxonomyProvider({ children }) {
  const initialCacheRef = useRef(null);

  if (initialCacheRef.current === null) {
    initialCacheRef.current = readCache() || false;
  }

  const cached = initialCacheRef.current || null;

  const [categories, setCategories] = useState(() => cached?.categories || []);
  const [areas, setAreas] = useState(() => cached?.areas || []);
  const [tags, setTags] = useState(() => cached?.tags || []);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(() => Boolean(cached));
  const requestRef = useRef(null);

  const reload = useCallback(async () => {
    if (requestRef.current) {
      return requestRef.current;
    }

    setLoading(true);

    const request = (async () => {
      const [categoryResult, areaResult, tagResult] = await Promise.allSettled([
        taxonomyApi.categories(),
        taxonomyApi.areas(),
        taxonomyApi.tags(),
      ]);

      const nextCategories =
        categoryResult.status === 'fulfilled' ? categoryResult.value : [];
      const nextAreas = areaResult.status === 'fulfilled' ? areaResult.value : [];
      const nextTags = tagResult.status === 'fulfilled' ? tagResult.value : [];

      setCategories(nextCategories);
      setAreas(nextAreas);
      setTags(nextTags);

      if (
        categoryResult.status === 'fulfilled' &&
        areaResult.status === 'fulfilled' &&
        tagResult.status === 'fulfilled'
      ) {
        writeCache(nextCategories, nextAreas, nextTags);
      }

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
      if (requestRef.current === request) {
        requestRef.current = null;
      }
      setInitialized(true);
      setLoading(false);
    }
  }, []);

  const categoriesFor = useCallback(
    (scope) =>
      categories.filter(
        (item) => item.contentScope === 'all' || item.contentScope === scope,
      ),
    [categories],
  );

  const areaBySlug = useCallback(
    (slug) => areas.find((item) => item.slug === slug),
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
    [
      categories,
      areas,
      tags,
      loading,
      initialized,
      reload,
      categoriesFor,
      areaBySlug,
    ],
  );

  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>;
}

export function useTaxonomy() {
  const context = useContext(TaxonomyContext);
  if (!context) throw new Error('useTaxonomy must be used inside TaxonomyProvider');

  useEffect(() => {
    // Chỉ tải taxonomy khi trang/component thực sự sử dụng nó. Trang chủ và
    // các route không cần bộ lọc vì thế không còn tạo 3 request ngay cold-load.
    if (!context.initialized && !context.loading) {
      void context.reload();
    }
  }, [context.initialized, context.loading, context.reload]);

  return context;
}
