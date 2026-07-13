import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Seo from '../../components/common/Seo';
import PageHeader from '../../components/common/PageHeader';
import JobCard from '../../components/content/JobCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import { jobApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { JOB_TYPES } from '../../utils/constants';

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { areas } = useTaxonomy();
  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const result = useListPage(jobApi.list, params);
  const update = (key, value) => { const next = new URLSearchParams(searchParams); if (value) next.set(key, value); else next.delete(key); next.set('page', '1'); setSearchParams(next); };
  const setPage = (page) => { const next = new URLSearchParams(searchParams); next.set('page', page); setSearchParams(next); };

  return (
    <section className="page-section page-section--muted">
      <Seo title="Việc làm Hòa Lạc" description="Tuyển dụng, tìm việc, thực tập và việc làm thời vụ tại Hòa Lạc." />
      <div className="container">
        <PageHeader eyebrow="Cơ hội nghề nghiệp" title="Việc làm tại Hòa Lạc" description="Kết nối doanh nghiệp, người lao động và sinh viên trong khu vực." actions={<Link className="btn btn--accent btn--md" to="/dang-bai/viec-lam"><Plus size={18} /> Đăng tuyển</Link>} />
        <div className="filter-bar">
          <select value={params.type || ''} onChange={(event) => update('type', event.target.value)}><option value="">Tất cả loại việc</option>{Object.entries(JOB_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={params.area || ''} onChange={(event) => update('area', event.target.value)}><option value="">Tất cả khu vực</option>{areas.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        </div>
        {result.loading ? <LoadingBlock /> : result.error ? <ErrorState error={result.error} onRetry={result.reload} /> : result.items.length ? <><div className="job-grid">{result.items.map((item) => <JobCard item={item} key={item._id} />)}</div><Pagination meta={result.meta} onPageChange={setPage} /></> : <EmptyState title="Chưa có việc làm phù hợp" actionLabel="Đăng tin tuyển dụng" actionTo="/dang-bai/viec-lam" />}
      </div>
    </section>
  );
}
