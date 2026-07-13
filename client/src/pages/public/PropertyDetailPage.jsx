import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bath, BedDouble, Compass, MapPin, Maximize2, Phone, Ruler, ShieldCheck } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import ContentImage from '../../components/content/ContentImage';
import ArticleBody from '../../components/content/ArticleBody';
import ReactionBar from '../../components/content/ReactionBar';
import CommentsSection from '../../components/content/CommentsSection';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';
import Button from '../../components/common/Button';
import LeadForm from '../../components/forms/LeadForm';
import { propertyApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { DIRECTIONS, LEGAL_STATUS, OWNER_TYPES, PROPERTY_TYPES, TRANSACTION_TYPES } from '../../utils/constants';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

export default function PropertyDetailPage() {
  const { slug } = useParams();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [phoneVisible, setPhoneVisible] = useState(false);
  useEffect(() => { propertyApi.detail(slug).then(setItem).catch(setError); }, [slug]);
  if (!item && !error) return <PageLoading />;
  if (error) return <section className="page-section"><div className="container"><ErrorState error={error} /></div></section>;
  const p = item.property || {};
  const revealPhone = async () => {
    try { await propertyApi.contact(item._id, 'reveal_phone'); } catch (err) { toast.error(apiErrorMessage(err)); }
    setPhoneVisible(true);
  };

  return (
    <section className="page-section property-detail-page">
      <Seo title={item.title} description={item.summary} />
      <div className="container">
        <div className="property-detail__header">
          <div><div className="content-card__labels"><Badge tone="accent">{TRANSACTION_TYPES[p.transactionType]}</Badge><Badge tone="dark">{OWNER_TYPES[p.ownerType]}</Badge></div><h1>{item.title}</h1><p><MapPin size={18} /> {p.addressText || item.primaryAreaId?.name}</p></div>
          <div className="property-price"><strong>{formatCurrency(p.price, p.priceUnit)}</strong><span>Đăng {formatDate(item.publishedAt)}</span></div>
        </div>
        <div className="property-detail__gallery"><ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="hero" /></div>
        <div className="property-detail__layout">
          <article className="property-detail__main">
            <div className="property-facts-grid">
              <div><Maximize2 size={22} /><span>Diện tích đất</span><strong>{formatNumber(p.landArea)} m²</strong></div>
              <div><Ruler size={22} /><span>Diện tích sử dụng</span><strong>{p.usableArea ? `${formatNumber(p.usableArea)} m²` : 'Chưa cập nhật'}</strong></div>
              <div><BedDouble size={22} /><span>Phòng ngủ</span><strong>{p.bedrooms ?? '—'}</strong></div>
              <div><Bath size={22} /><span>Phòng tắm</span><strong>{p.bathrooms ?? '—'}</strong></div>
              <div><Compass size={22} /><span>Hướng</span><strong>{DIRECTIONS[p.direction] || 'Chưa rõ'}</strong></div>
              <div><ShieldCheck size={22} /><span>Pháp lý</span><strong>{LEGAL_STATUS[p.legalStatus] || 'Chưa rõ'}</strong></div>
            </div>
            <h2>Thông tin mô tả</h2><ArticleBody html={item.body?.bodyHtml} />
            <div className="property-spec-table">
              <div><span>Loại bất động sản</span><strong>{PROPERTY_TYPES[p.propertyType]}</strong></div>
              <div><span>Mặt tiền</span><strong>{p.frontage ? `${p.frontage} m` : 'Chưa cập nhật'}</strong></div>
              <div><span>Đường vào</span><strong>{p.roadWidth ? `${p.roadWidth} m` : 'Chưa cập nhật'}</strong></div>
              <div><span>Ngày hết hạn</span><strong>{formatDate(p.expiresAt)}</strong></div>
            </div>
            {p.featureIds?.length ? <div className="feature-list">{p.featureIds.map((feature) => <span key={feature._id}>{feature.name}</span>)}</div> : null}
            <ReactionBar content={item} />
            <CommentsSection contentId={item._id} allowComments={item.allowComments} />
          </article>
          <aside className="property-contact-card">
            <h3>Liên hệ người đăng</h3><strong>{p.contactName}</strong><span>{OWNER_TYPES[p.ownerType]}</span>
            {phoneVisible ? <a className="property-phone" href={`tel:${p.contactPhone}`}><Phone size={19} /> {p.contactPhone}</a> : <Button onClick={revealPhone}><Phone size={18} /> Hiện số điện thoại</Button>}
            {p.contactEmail ? <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a> : null}
            <small>Hãy kiểm tra pháp lý và thông tin thực tế trước khi giao dịch.</small>
            <hr />
            <h3>Cần xây dựng trên khu đất này?</h3><p>Kiến Trúc Hòa Lạc có thể tư vấn phương án thiết kế và dự toán sơ bộ.</p><Link className="btn btn--accent btn--md" to={`/tu-van?type=architecture_design&source=${item._id}`}>Nhận tư vấn xây dựng</Link>
            <LeadForm compact sourceContentId={item._id} />
          </aside>
        </div>
      </div>
    </section>
  );
}
