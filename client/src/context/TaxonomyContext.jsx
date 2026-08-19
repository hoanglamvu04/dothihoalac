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
  // Lazy state initializer chỉ đọc sessionStorage đúng một lần cho lifecycle
  // của provider và không vi phạm quy tắc React 19 về đọc ref trong render.
  const [cached] = useState(() => readCache());

  const [categories, setCategories] = useState(() => cached?.categories || []);
  const [areas, setAreas] = useState(() => cached?.areas || []);
  const [tags, setTags] = useState(() => cached?.tags || []);
  const [loading, setLoading] = useState(() => !cached);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Taxonomy thay đổi chậm. Nếu phiên hiện tại đã có cache hợp lệ thì dùng
    // ngay thay vì tạo thêm 3 request ở mỗi lần reload trang.
    if (!cached) {
      void reload();
    }
  }, [cached, reload]);

  const value = useMemo(
    () => ({
      categories,
      areas,
      tags,
      loading,
      reload,
      categoriesFor: (scope) =>
        categories.filter((item) => item.contentScope === 'all' || item.contentScope === scope),
      areaBySlug: (slug) => areas.find((item) => item.slug === slug),
    }),
    [categories, areas, tags, loading, reload],
  );

  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>;
}

export function useTaxonomy() {
  const context = useContext(TaxonomyContext);
  if (!context) throw new Error('useTaxonomy must be used inside TaxonomyProvider');
  return context;
}
