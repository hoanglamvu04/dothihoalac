import { Mail, MapPin, Phone } from 'lucide-react';
import Seo from '../../components/common/Seo';
import PageHeader from '../../components/common/PageHeader';
import LeadForm from '../../components/forms/LeadForm';

export default function ContactPage() {
  return (
    <section className="page-section">
      <Seo title="Liên hệ" />
      <div className="container">
        <PageHeader eyebrow="Kết nối" title="Liên hệ Đô Thị Hòa Lạc" description="Gửi thông tin, đề xuất hợp tác hoặc yêu cầu quảng cáo tới Media Space." />
        <div className="contact-layout">
          <div className="contact-info"><h2>Thông tin liên hệ</h2><p><MapPin size={20} /> Hòa Lạc, Hà Nội</p><p><Mail size={20} /> contact@dothihoalac.vn</p><p><Phone size={20} /> Hotline cập nhật sau</p><h3>Phạm vi tiếp nhận</h3><ul><li>Góp ý về nội dung và cộng đồng.</li><li>Đề nghị hợp tác truyền thông.</li><li>Quảng cáo và bài tài trợ.</li><li>Kết nối dịch vụ trong hệ sinh thái XSpace.</li></ul></div>
          <div className="contact-form-card"><LeadForm presetType="partnership" assignedBrand="media_space" /></div>
        </div>
      </div>
    </section>
  );
}
