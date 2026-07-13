import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Home,
  Landmark,
  MapPinned,
  MessageSquareText,
  Search,
  Trees,
} from 'lucide-react';
import Seo from '../../components/common/Seo';
import SectionHeader from '../../components/common/SectionHeader';
import ArticleCard from '../../components/content/ArticleCard';
import CommunityCard from '../../components/content/CommunityCard';
import PropertyCard from '../../components/content/PropertyCard';
import JobCard from '../../components/content/JobCard';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { articleApi, communityApi, jobApi, propertyApi } from '../../api/content.api';
import { useTaxonomy } from '../../context/TaxonomyContext';
import LeadForm from '../../components/forms/LeadForm';

const topics = [
  { icon: Landmark, title: 'Quy hoạch Hòa Lạc', text: 'Quy hoạch chung, phân khu, dự án và văn bản mới.', to: '/tin-tuc?category=quy-hoach' },
  { icon: Building2, title: 'Nhà đất địa phương', text: 'Tin bán, cho thuê và dữ liệu thị trường Hòa Lạc.', to: '/nha-dat' },
  { icon: MessageSquareText, title: 'Cộng đồng cư dân', text: 'Hỏi đáp, phản ánh và chia sẻ cuộc sống địa phương.', to: '/cong-dong' },
  { icon: Trees, title: 'Nghỉ dưỡng Hòa Lạc', text: 'Khám phá villa, homestay và trải nghiệm cuối tuần.', to: '/tu-van?type=homestay_search' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { areas } = useTaxonomy();
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ articles: [], community: [], properties: [], jobs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [articles, community, properties, jobs] = await Promise.allSettled([
        articleApi.list({ limit: 7 }),
        communityApi.list({ limit: 5, sort: 'popular' }),
        propertyApi.list({ limit: 4 }),
        jobApi.list({ limit: 4 }),
      ]);
      if (!active) return;
      setData({
        articles: articles.status === 'fulfilled' ? articles.value.items : [],
        community: community.status === 'fulfilled' ? community.value.items : [],
        properties: properties.status === 'fulfilled' ? properties.value.items : [],
        jobs: jobs.status === 'fulfilled' ? jobs.value.items : [],
      });
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const search = (event) => {
    event.preventDefault();
    if (query.trim()) navigate(`/tim-kiem?q=${encodeURIComponent(query.trim())}&type=all`);
  };

  const [hero, ...secondary] = data.articles;

  return (
    <>
      <Seo title="Tin tức, cộng đồng và nhà đất Hòa Lạc" description="Đô Thị Hòa Lạc cung cấp tin quy hoạch, hạ tầng, bất động sản, việc làm và kết nối cộng đồng Hòa Lạc." />
      <section className="home-hero">
        <div className="container home-hero__inner">
          <div className="home-hero__copy">
            <span className="hero-kicker"><MapPinned size={17} /> Dữ liệu địa phương · Cộng đồng thật</span>
            <h1>Hiểu Hòa Lạc hôm nay.<br /><em>Đón đúng cơ hội ngày mai.</em></h1>
            <p>Tin tức, quy hoạch, hạ tầng, nhà đất và đời sống được tổ chức trên một nền tảng dành riêng cho Hòa Lạc.</p>
            <form className="hero-search" onSubmit={search}>
              <Search size={21} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bạn đang quan tâm điều gì tại Hòa Lạc?" />
              <button type="submit">Tìm kiếm</button>
            </form>
            <div className="hero-links">
              <span>Tìm nhanh:</span>
              <Link to="/tin-tuc?category=quy-hoach">Quy hoạch</Link>
              <Link to="/nha-dat?transactionType=sale">Đất bán</Link>
              <Link to="/cong-dong?type=question">Hỏi đáp</Link>
              <Link to="/viec-lam">Việc làm</Link>
            </div>
          </div>
          <div className="home-hero__panel">
            <div className="hero-stat"><strong>{areas.length || '20+'}</strong><span>Khu vực được theo dõi</span></div>
            <div className="hero-stat"><strong>04</strong><span>Trụ cột nội dung cốt lõi</span></div>
            <div className="hero-mini-card"><Home size={22} /><div><strong>Có đất cần xây?</strong><span>Nhận tư vấn kiến trúc phù hợp địa hình Hòa Lạc.</span></div><Link to="/tu-van?type=architecture_design"><ArrowRight size={18} /></Link></div>
            <div className="hero-mini-card"><CalendarDays size={22} /><div><strong>Tìm villa cuối tuần?</strong><span>Kết nối lựa chọn lưu trú phù hợp qua Mely Space.</span></div><Link to="/tu-van?type=homestay_search"><ArrowRight size={18} /></Link></div>
          </div>
        </div>
      </section>

      <section className="topic-strip">
        <div className="container topic-strip__grid">
          {topics.map(({ icon: Icon, ...topic }) => <Link to={topic.to} key={topic.title}><Icon size={25} /><div><strong>{topic.title}</strong><span>{topic.text}</span></div><ArrowRight size={18} /></Link>)}
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <SectionHeader eyebrow="Tin tức địa phương" title="Chuyển động Hòa Lạc" description="Những thông tin đáng chú ý về quy hoạch, hạ tầng, kinh tế và đời sống." to="/tin-tuc" />
          {loading ? <LoadingBlock /> : data.articles.length ? <div className="featured-news-layout"><ArticleCard item={hero} featured /><div className="news-side-grid">{secondary.slice(0, 4).map((item) => <ArticleCard item={item} key={item._id} />)}</div></div> : <EmptyState title="Chưa có tin tức" actionLabel="Gửi tin cho Ban biên tập" actionTo="/gui-tin" />}
        </div>
      </section>

      <section className="page-section page-section--muted">
        <div className="container">
          <SectionHeader eyebrow="Bảng tin cư dân" title="Cộng đồng đang nói gì?" description="Ý kiến, câu hỏi và câu chuyện từ những người đang sống tại Hòa Lạc." to="/cong-dong" />
          {loading ? <LoadingBlock /> : data.community.length ? <div className="community-home-grid">{data.community.map((item) => <CommunityCard item={item} key={item._id} />)}</div> : <EmptyState title="Cộng đồng chưa có bài mới" actionLabel="Đăng bài đầu tiên" actionTo="/dang-bai/cong-dong" />}
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <SectionHeader eyebrow="Thị trường địa phương" title="Bất động sản mới đăng" description="Tin mua bán và cho thuê có cấu trúc, dễ lọc và rõ người đăng." to="/nha-dat" />
          {loading ? <LoadingBlock /> : data.properties.length ? <div className="property-grid">{data.properties.map((item) => <PropertyCard item={item} key={item._id} />)}</div> : <EmptyState title="Chưa có tin bất động sản" actionLabel="Đăng tin nhà đất" actionTo="/dang-bai/nha-dat" />}
        </div>
      </section>

      <section className="ecosystem-cta">
        <div className="container ecosystem-cta__grid">
          <div className="ecosystem-cta__copy"><span>Hệ sinh thái XSpace</span><h2>Từ thông tin địa phương đến giải pháp thực tế</h2><p>Khi bạn có nhu cầu thiết kế, xây dựng, cải tạo hoặc tìm không gian nghỉ dưỡng, Đô Thị Hòa Lạc sẽ chuyển yêu cầu tới đúng đơn vị phụ trách.</p><ul><li>Kiến Trúc Hòa Lạc: thiết kế, thi công và cải tạo.</li><li>Mely Space: villa, homestay và không gian sự kiện.</li><li>Thông tin chỉ được chuyển khi bạn chủ động đồng ý.</li></ul></div>
          <div className="ecosystem-cta__form"><LeadForm compact /></div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <SectionHeader eyebrow="Cơ hội tại Hòa Lạc" title="Việc làm mới" to="/viec-lam" />
          {loading ? <LoadingBlock /> : data.jobs.length ? <div className="job-grid">{data.jobs.map((item) => <JobCard item={item} key={item._id} />)}</div> : <EmptyState title="Chưa có tin việc làm" actionLabel="Đăng tin tuyển dụng" actionTo="/dang-bai/viec-lam" />}
        </div>
      </section>
    </>
  );
}
