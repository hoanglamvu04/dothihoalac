import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { taxonomyApi } from '../api/taxonomy.api';

const TaxonomyContext = createContext(null);

export function TaxonomyProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [categoryResult, areaResult, tagResult] = await Promise.allSettled([
      taxonomyApi.categories(),
      taxonomyApi.areas(),
      taxonomyApi.tags(),
    ]);
    setCategories(categoryResult.status === 'fulfilled' ? categoryResult.value : []);
    setAreas(areaResult.status === 'fulfilled' ? areaResult.value : []);
    setTags(tagResult.status === 'fulfilled' ? tagResult.value : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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
