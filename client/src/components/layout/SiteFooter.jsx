import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Building2, Facebook, Mail, MapPin, MessageCircle, Newspaper, Phone, Send } from 'lucide-react';
import './SiteFooter.css';

const navigationLinks = [
  { to: '/', label: 'Trang chủ' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/cong-dong', label: 'Cộng đồng' },
  { to: '/bat-dong-san', label: 'Bất động sản' },
  { to: '/viec-lam', label: 'Việc làm' },
  { to: '/gui-tin', label: 'Gửi thông tin' },
];

const categoryLinks = [
  { to: '/tin-tuc?category=quy-hoach', label: 'Quy hoạch' },
  { to: '/tin-tuc?category=ha-tang-giao-thong', label: 'Hạ tầng' },
  { to: '/tin-tuc?category=du-an-dtxd', label: 'Dự án ĐTXD' },
  { to: '/tin-tuc?category=bds-hoa-lac', label: 'BĐS Hòa Lạc' },
  { to: '/tin-tuc?category=chinh-sach', label: 'Chính sách' },
  { to: '/tin-tuc?category=doi-song-dan-cu', label: 'Đời sống dân cư' },
];

const compactHighlights = [
  { icon: Newspaper, label: 'Tin tức' },
  { icon: MessageCircle, label: 'Cộng đồng' },
  { icon: Building2, label: 'Bất động sản' },
  { icon: BriefcaseBusiness, label: 'Việc làm' },
];

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container site-footer__main">
        <section className="site-footer__contact-column">
          <h2>Liên hệ</h2>
          <div className="site-footer__contact-list">
            <div className="site-footer__contact-row"><span><MapPin size={17}/></span><p><small>Khu vực hoạt động</small><strong>Hòa Lạc, Hà Nội</strong></p></div>
            <a className="site-footer__contact-row" href="tel:0966709790"><span><Phone size={17}/></span><p><small>Hotline</small><strong>0966 709 790</strong></p></a>
            <a className="site-footer__contact-row" href="mailto:admin@xspace.vn"><span><Mail size={17}/></span><p><small>Email</small><strong>admin@xspace.vn</strong></p></a>
          </div>
        </section>
      </div>
    </footer>
  );
}
