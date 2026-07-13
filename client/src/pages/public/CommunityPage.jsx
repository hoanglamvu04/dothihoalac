import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Seo from '../../components/common/Seo';
import PageHeader from '../../components/common/PageHeader';
import CommunityCard from '../../components/content/CommunityCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import { communityApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { COMMUNITY_TYPES } from '../../utils/constants';

export default function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categoriesFor, areas } = useTaxonomy();
  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const result = useListPage(communityApi.list, params);
  const update = (key, value) => { const next = new URLSearchParams(searchParams); if (value) next.set(key, value); else next.delete(key); next.set('page', '1'); setSearchParams(next); };
  const setPage = (page) => { const next = new URLSearchParams(searchParams); next.set('page', page); setSearchParams(next); };

  return (
    <section className="page-section page-section--muted">
      <Seo title="Cộng đồng Hòa Lạc" description="Thảo luận, hỏi đáp, phản ánh và chia sẻ từ cộng đồng Hòa Lạc." />
      <div className="container container--narrow">
        <PageHeader eyebrow="Diễn đàn địa phương" title="Cộng đồng Đô Thị Hòa Lạc" description="Một bảng tin dành cho những người đang sống, làm việc và quan tâm đến Hòa Lạc." actions={<Link className="btn btn--accent btn--md" to="/dang-bai/cong-dong"><Plus size={18} /> Đăng bài</Link>} />
        <div className="filter-bar filter-bar--sticky">
          <select value={params.type || ''} onChange={(event) => update('type', event.target.value)}><option value="">Mọi loại bài</option>{Object.entries(COMMUNITY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={params.category || ''} onChange={(event) => update('category', event.target.value)}><option value="">Mọi chủ đề</option>{categoriesFor('community').map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
          <select value={params.area || ''} onChange={(event) => update('area', event.target.value)}><option value="">Mọi khu vực</option>{areas.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
          <select value={params.sort || ''} onChange={(event) => update('sort', event.target.value)}><option value="">Mới nhất</option><option value="popular">Nổi bật</option></select>
        </div>
        {result.loading ? <LoadingBlock /> : result.error ? <ErrorState error={result.error} onRetry={result.reload} /> : result.items.length ? <><div className="community-feed">{result.items.map((item) => <CommunityCard item={item} key={item._id} />)}</div><Pagination meta={result.meta} onPageChange={setPage} /></> : <EmptyState title="Chưa có bài phù hợp" actionLabel="Đăng bài cộng đồng" actionTo="/dang-bai/cong-dong" />}
      </div>
    </section>
  );
}
