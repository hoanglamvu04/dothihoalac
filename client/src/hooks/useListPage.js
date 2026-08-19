import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const LIST_CACHE_TTL_MS = 20_000;
const listCache = new WeakMap();

function stableSerialize(value) {
  const entries = Object.entries(value || {})
    .filter(([, item]) => {
      return (
        item !== undefined &&
        item !== null &&
        item !== ''
      );
    })
    .sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify(
    Object.fromEntries(entries),
  );
}

function cacheFor(fetcher) {
  let cache = listCache.get(fetcher);

  if (!cache) {
    cache = new Map();
    listCache.set(fetcher, cache);
  }

  return cache;
}

function readCache(fetcher, key) {
  const entry = cacheFor(fetcher).get(key);
  if (!entry) return null;

  if (Date.now() - entry.savedAt > LIST_CACHE_TTL_MS) {
    cacheFor(fetcher).delete(key);
    return null;
  }

  return entry;
}

function writeCache(fetcher, key, response) {
  const cache = cacheFor(fetcher);

  cache.set(key, {
    savedAt: Date.now(),
    items: response?.items || [],
    meta:
      response?.meta || {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 1,
      },
  });

  // Chặn cache tăng vô hạn khi người dùng thử rất nhiều tổ hợp bộ lọc.
  if (cache.size > 40) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
}

export function useListPage(fetcher, params = {}) {
  const initialKey = stableSerialize(params);
  const initialCached = readCache(fetcher, initialKey);

  const [items, setItems] = useState(() => initialCached?.items || []);
  const [meta, setMeta] = useState(() =>
    initialCached?.meta || {
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 1,
    },
  );
  const [loading, setLoading] = useState(() => !initialCached);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const requestKey = useMemo(
    () => stableSerialize(params),
    [params],
  );

  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const reload = useCallback(() => {
    cacheFor(fetcher).delete(requestKey);
    setReloadToken((value) => value + 1);
  }, [fetcher, requestKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleContentChanged = () => reload();
    window.addEventListener('dthl:content-changed', handleContentChanged);

    return () => {
      window.removeEventListener('dthl:content-changed', handleContentChanged);
    };
  }, [reload]);

  useEffect(() => {
    const cached = readCache(fetcher, requestKey);

    if (cached) {
      setItems(cached.items);
      setMeta(cached.meta);
      setError(null);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetcher(
          paramsRef.current,
          {
            signal: controller.signal,
          },
        );

        if (!active) return;

        writeCache(fetcher, requestKey, response);
        setItems(response?.items || []);
        setMeta(
          response?.meta || {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 1,
          },
        );
      } catch (requestError) {
        if (
          requestError?.name === 'CanceledError' ||
          requestError?.code === 'ERR_CANCELED'
        ) {
          return;
        }

        if (!active) return;

        setError(requestError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetcher, requestKey, reloadToken]);

  return {
    items,
    meta,
    loading,
    error,
    reload,
  };
}
