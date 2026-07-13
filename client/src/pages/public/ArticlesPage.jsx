import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import PageHeader from '../../components/common/PageHeader';
import ArticleCard from '../../components/content/ArticleCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import { articleApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categoriesFor, areas } = useTaxonomy();
  const articleCategories = categoriesFor('article');
  const rawParams = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const params = useMemo(() => {
    const category = rawParams.category;
    const matched = articleCategories.find((item) => item.slug === category);
    return { ...rawParams, category: matched?._id || category };
  }, [rawParams, articleCategories]);
  const result = useListPage(articleApi.list, params);
  const update = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };
  const setPage = (page) => { const next = new URLSearchParams(searchParams); next.set('page', page); setSearchParams(next); };

  return (
    <section className="page-section">
      <Seo title="Tin tức Hòa Lạc" description="Tin quy hoạch, hạ tầng, bất động sản, đời sống và chính sách tại Hòa Lạc." />
      <div className="container">
        <PageHeader eyebrow="Tin tức" title="Chuyển động Đô Thị Hòa Lạc" description="Thông tin được biên tập theo chuyên mục và khu vực để bạn dễ theo dõi." />
        <div className="filter-bar">
          <select value={params.category || ''} onChange={(event) => update('category', event.target.value)}><option value="">Tất cả chuyên mục</option>{articleCategories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
          <select value={params.area || ''} onChange={(event) => update('area', event.target.value)}><option value="">Tất cả khu vực</option>{areas.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
          <select value={params.sort || ''} onChange={(event) => update('sort', event.target.value)}><option value="">Mới nhất</option><option value="popular">Đọc nhiều</option></select>
          <input value={params.q || ''} onChange={(event) => update('q', event.target.value)} placeholder="Tìm trong tin tức..." />
        </div>
        {result.loading ? <LoadingBlock /> : result.error ? <ErrorState error={result.error} onRetry={result.reload} /> : result.items.length ? <><div className="article-grid">{result.items.map((item) => <ArticleCard item={item} key={item._id} />)}</div><Pagination meta={result.meta} onPageChange={setPage} /></> : <EmptyState title="Không tìm thấy bài viết" description="Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." />}
      </div>
    </section>
  );
}
