import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import Seo from '../../components/common/Seo';
import PageHeader from '../../components/common/PageHeader';
import SectionHeader from '../../components/common/SectionHeader';
import ArticleCard from '../../components/content/ArticleCard';
import CommunityCard from '../../components/content/CommunityCard';
import PropertyCard from '../../components/content/PropertyCard';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { articleApi, communityApi, propertyApi } from '../../api/content.api';

export default function AreaPage() {
  const { slug } = useParams();
  const { areaBySlug, loading: taxonomyLoading } = useTaxonomy();
  const area = areaBySlug(slug);
  const [data, setData] = useState({ articles: [], community: [], properties: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!area?._id) return;
    setLoading(true);
    Promise.allSettled([
      articleApi.list({ area: area._id, limit: 6 }),
      communityApi.list({ area: area._id, limit: 5 }),
      propertyApi.list({ area: area._id, limit: 4 }),
    ]).then(([a, c, p]) => setData({ articles: a.status === 'fulfilled' ? a.value.items : [], community: c.status === 'fulfilled' ? c.value.items : [], properties: p.status === 'fulfilled' ? p.value.items : [] })).finally(() => setLoading(false));
  }, [area?._id]);

  if (taxonomyLoading || loading) return <PageLoadingOrBlock />;
  if (!area) return <section className="page-section"><div className="container"><EmptyState title="Không tìm thấy khu vực" /></div></section>;
  return (
    <section className="page-section">
      <Seo title={area.name} description={area.description} />
      <div className="container">
        <PageHeader eyebrow="Khu vực" title={area.name} description={area.description || 'Tin tức, cộng đồng và bất động sản tại khu vực này.'} actions={<span className="area-type"><MapPin size={18} /> {area.areaType}</span>} />
        <SectionHeader title="Tin tức mới" to={`/tin-tuc?area=${area._id}`} />
        {data.articles.length ? <div className="article-grid">{data.articles.map((item) => <ArticleCard key={item._id} item={item} />)}</div> : <EmptyState title="Chưa có tin tức" />}
        <SectionHeader title="Cộng đồng khu vực" to={`/cong-dong?area=${area._id}`} />
        {data.community.length ? <div className="community-feed">{data.community.map((item) => <CommunityCard key={item._id} item={item} />)}</div> : <EmptyState title="Chưa có bài cộng đồng" />}
        <SectionHeader title="Bất động sản" to={`/nha-dat?area=${area._id}`} />
        {data.properties.length ? <div className="property-grid">{data.properties.map((item) => <PropertyCard key={item._id} item={item} />)}</div> : <EmptyState title="Chưa có tin nhà đất" />}
      </div>
    </section>
  );
}

function PageLoadingOrBlock() { return <section className="page-section"><div className="container"><LoadingBlock /></div></section>; }
