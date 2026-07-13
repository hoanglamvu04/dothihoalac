import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Seo from '../../components/common/Seo';
import PageHeader from '../../components/common/PageHeader';
import PropertyCard from '../../components/content/PropertyCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import { propertyApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { LEGAL_STATUS, OWNER_TYPES, PROPERTY_TYPES, TRANSACTION_TYPES } from '../../utils/constants';

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { areas } = useTaxonomy();
  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const result = useListPage(propertyApi.list, params);
  const update = (key, value) => { const next = new URLSearchParams(searchParams); if (value) next.set(key, value); else next.delete(key); next.set('page', '1'); setSearchParams(next); };
  const setPage = (page) => { const next = new URLSearchParams(searchParams); next.set('page', page); setSearchParams(next); };

  return (
    <section className="page-section">
      <Seo title="Bất động sản Hòa Lạc" description="Tin mua bán, cho thuê nhà đất Hòa Lạc với bộ lọc giá, diện tích, pháp lý và khu vực." />
      <div className="container">
        <PageHeader eyebrow="Nhà đất" title="Bất động sản Hòa Lạc" description="Tìm kiếm tin đăng theo dữ liệu rõ ràng, khu vực cụ thể và loại người đăng." actions={<Link className="btn btn--accent btn--md" to="/dang-bai/nha-dat"><Plus size={18} /> Đăng tin</Link>} />
        <div className="property-filters">
          <select value={params.transactionType || ''} onChange={(event) => update('transactionType', event.target.value)}><option value="">Nhu cầu</option>{Object.entries(TRANSACTION_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={params.propertyType || ''} onChange={(event) => update('propertyType', event.target.value)}><option value="">Loại bất động sản</option>{Object.entries(PROPERTY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={params.area || ''} onChange={(event) => update('area', event.target.value)}><option value="">Khu vực</option>{areas.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
          <select value={params.ownerType || ''} onChange={(event) => update('ownerType', event.target.value)}><option value="">Người đăng</option>{Object.entries(OWNER_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={params.legalStatus || ''} onChange={(event) => update('legalStatus', event.target.value)}><option value="">Pháp lý</option>{Object.entries(LEGAL_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input type="number" value={params.minPrice || ''} onChange={(event) => update('minPrice', event.target.value)} placeholder="Giá từ" />
          <input type="number" value={params.maxPrice || ''} onChange={(event) => update('maxPrice', event.target.value)} placeholder="Giá đến" />
          <input type="number" value={params.minArea || ''} onChange={(event) => update('minArea', event.target.value)} placeholder="Diện tích từ" />
          <input type="number" value={params.maxArea || ''} onChange={(event) => update('maxArea', event.target.value)} placeholder="Diện tích đến" />
          <select value={params.sort || ''} onChange={(event) => update('sort', event.target.value)}><option value="">Mới nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option></select>
          <button type="button" onClick={() => setSearchParams({})}>Xóa bộ lọc</button>
        </div>
        <div className="result-summary"><strong>{result.meta.total || 0}</strong> tin phù hợp</div>
        {result.loading ? <LoadingBlock /> : result.error ? <ErrorState error={result.error} onRetry={result.reload} /> : result.items.length ? <><div className="property-grid">{result.items.map((item) => <PropertyCard item={item} key={item._id} />)}</div><Pagination meta={result.meta} onPageChange={setPage} /></> : <EmptyState title="Không có tin phù hợp" description="Hãy thay đổi khoảng giá, diện tích hoặc khu vực." actionLabel="Đăng tin nhà đất" actionTo="/dang-bai/nha-dat" />}
      </div>
    </section>
  );
}
