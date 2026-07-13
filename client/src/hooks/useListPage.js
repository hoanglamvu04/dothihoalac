import { useCallback, useEffect, useState } from 'react';

export function useListPage(loader, params) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loader(params);
      setItems(result.items || []);
      setMeta(result.meta || { page: 1, limit: 12, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [loader, params]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, setItems, meta, loading, error, reload: load };
}
