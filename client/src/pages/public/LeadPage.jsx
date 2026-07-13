import { useSearchParams } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import PageHeader from '../../components/common/PageHeader';
import LeadForm from '../../components/forms/LeadForm';

export default function LeadPage({ type: fixedType }) {
  const [params] = useSearchParams();
  const type = fixedType || params.get('type') || 'architecture_design';
  const source = params.get('source') || null;
  const isMely = ['homestay_search', 'villa_booking', 'event_booking'].includes(type);
  return (
    <section className="page-section page-section--muted">
      <Seo title="Yêu cầu tư vấn" />
      <div className="container container--narrow">
        <PageHeader eyebrow="Kết nối nhu cầu" title={isMely ? 'Tìm không gian nghỉ dưỡng phù hợp' : 'Tư vấn kiến trúc và xây dựng tại Hòa Lạc'} description={isMely ? 'Mely Space tiếp nhận nhu cầu tìm villa, homestay và không gian sự kiện.' : 'Kiến Trúc Hòa Lạc tiếp nhận nhu cầu thiết kế, thi công, cải tạo và dự toán.'} />
        <div className="form-card"><LeadForm presetType={type} assignedBrand={isMely ? 'mely_space' : 'kientruchoalac'} sourceContentId={source} /></div>
      </div>
    </section>
  );
}
