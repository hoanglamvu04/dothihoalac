import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

export function useListPage(fetcher, params = {}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
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
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
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

    load();

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