import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const LIST_CACHE_FRESH_MS = 60_000;
const LIST_CACHE_MAX_AGE_MS = 10 * 60_000;
const LIST_CACHE_MAX_ENTRIES = 40;
const listCache = new WeakMap();
const listPrefetchInFlight = new WeakMap();

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

function defaultMeta(itemCount = 0) {
  return {
    page: 1,
    limit: itemCount || 12,
    total: itemCount,
    totalPages: 1,
  };
}

function cacheFor(fetcher) {
  let cache = listCache.get(fetcher);

  if (!cache) {
    cache = new Map();
    listCache.set(fetcher, cache);
  }

  return cache;
}

function prefetchFor(fetcher) {
  let cache = listPrefetchInFlight.get(fetcher);

  if (!cache) {
    cache = new Map();
    listPrefetchInFlight.set(fetcher, cache);
  }

  return cache;
}

function readCache(fetcher, key) {
  const cache = cacheFor(fetcher);
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.savedAt;

  if (age > LIST_CACHE_MAX_AGE_MS) {
    cache.delete(key);
    return null;
  }

  return {
    ...entry,
    age,
    shouldRevalidate:
      Boolean(entry.needsRevalidate) || age > LIST_CACHE_FRESH_MS,
  };
}

function writeCache(fetcher, key, response, options = {}) {
  const cache = cacheFor(fetcher);
  const items = Array.isArray(response?.items) ? response.items : [];

  cache.set(key, {
    savedAt: Date.now(),
    items,
    meta: response?.meta || defaultMeta(items.length),
    needsRevalidate: Boolean(options.needsRevalidate),
  });

  // Chặn cache tăng vô hạn khi người dùng thử rất nhiều tổ hợp bộ lọc.
  if (cache.size > LIST_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
}

/**
 * Đưa dữ liệu đã có sẵn (ví dụ home-feed) vào cache của trang danh sách.
 * Dữ liệu prime được render ngay nhưng luôn được refresh ngầm khi trang mở.
 */
export function primeListPageCache(fetcher, params = {}, response = {}) {
  if (typeof fetcher !== 'function') return false;

  const key = stableSerialize(params);
  if (readCache(fetcher, key)) return false;

  writeCache(fetcher, key, response, { needsRevalidate: true });
  return true;
}

/**
 * Warm cả JS-side list cache lẫn cache request của API trước khi người dùng
 * bấm sang tab. Request prefetch không có AbortSignal để có thể hoàn tất và
 * tái sử dụng cho lần điều hướng tiếp theo.
 */
export function prefetchListPage(fetcher, params = {}) {
  if (typeof fetcher !== 'function') return Promise.resolve(null);

  const key = stableSerialize(params);
  const cached = readCache(fetcher, key);

  if (cached && !cached.shouldRevalidate) {
    return Promise.resolve({
      items: cached.items,
      meta: cached.meta,
    });
  }

  const pendingByKey = prefetchFor(fetcher);
  const pending = pendingByKey.get(key);
  if (pending) return pending;

  const request = Promise.resolve()
    .then(() => fetcher(params))
    .then((response) => {
      writeCache(fetcher, key, response);
      return response;
    })
    .catch(() => null)
    .finally(() => {
      if (pendingByKey.get(key) === request) {
        pendingByKey.delete(key);
      }
    });

  pendingByKey.set(key, request);
  return request;
}

export function useListPage(fetcher, params = {}) {
  const initialKey = stableSerialize(params);
  const initialCached = readCache(fetcher, initialKey);

  const [items, setItems] = useState(() => initialCached?.items || []);
  const [meta, setMeta] = useState(() =>
    initialCached?.meta || defaultMeta(),
  );
  const [loading, setLoading] = useState(() => !initialCached);
  const [refreshing, setRefreshing] = useState(false);
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
    const hasCachedData = Boolean(cached);

    if (cached) {
      setItems(cached.items);
      setMeta(cached.meta);
      setError(null);
      setLoading(false);

      if (!cached.shouldRevalidate) {
        setRefreshing(false);
        return undefined;
      }
    }

    const controller = new AbortController();
    let active = true;

    async function load() {
      if (hasCachedData) {
        // Stale-while-revalidate: giữ nguyên nội dung cũ, tuyệt đối không đưa
        // trang quay lại trạng thái "Đang tải" chỉ vì refresh nền.
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!hasCachedData) setError(null);

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
        setMeta(response?.meta || defaultMeta(response?.items?.length || 0));
        setError(null);
      } catch (requestError) {
        if (
          requestError?.name === 'CanceledError' ||
          requestError?.code === 'ERR_CANCELED'
        ) {
          return;
        }

        if (!active) return;

        // Nếu đang có cache usable thì lỗi refresh nền không nên thay nội dung
        // bằng ErrorState. Người dùng vẫn xem được dữ liệu cũ và có thể retry.
        if (!hasCachedData) {
          setError(requestError);
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
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
    refreshing,
    error,
    reload,
  };
}
