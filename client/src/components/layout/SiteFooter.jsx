import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Facebook,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  Send,
} from 'lucide-react';

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
        <section className="site-footer__brand" aria-label="Đô Thị Hòa Lạc">
          <Link to="/" className="site-footer__logo" aria-label="Đô Thị Hòa Lạc - Trang chủ">
            <img src="/Logo2.png" alt="Đô Thị Hòa Lạc" />
            <span>
              <strong>Đô Thị Hòa Lạc</strong>
              <small>Trung Tâm Phát Triển Đô Thị Hòa Lạc</small>
            </span>
          </Link>
          <p className="site-footer__description">Nền tảng thông tin, cộng đồng và dữ liệu địa phương dành cho người sống, làm việc, kinh doanh và đầu tư tại Hòa Lạc.</p>
          <div className="site-footer__scope" aria-label="Các nội dung chính">
            {compactHighlights.map((item) => { const Icon = item.icon; return <span key={item.label}><Icon size={14} aria-hidden="true" />{item.label}</span>; })}
          </div>
          <div className="site-footer__operator"><small>Đơn vị vận hành</small><strong>Media Space · Công ty Cổ phần XSpace Việt Nam</strong></div>
        </section>

        <nav className="site-footer__column" aria-label="Điều hướng nhanh">
          <h2>Điều hướng</h2>
          <div className="site-footer__links">{navigationLinks.map((item)=><Link key={item.to} to={item.to}><ArrowRight size={14}/><span>{item.label}</span></Link>)}</div>
        </nav>

        <nav className="site-footer__column" aria-label="Chuyên mục nổi bật">
          <h2>Chuyên mục</h2>
          <div className="site-footer__links site-footer__links--categories">{categoryLinks.map((item)=><Link key={item.to} to={item.to}><ArrowRight size={14}/><span>{item.label}</span></Link>)}</div>
        </nav>

        <section className="site-footer__column site-footer__contact-column">
          <h2>Liên hệ</h2>
          <div className="site-footer__contact-list">
            <div className="site-footer__contact-row"><span className="site-footer__contact-icon"><MapPin size={17}/></span><p><small>Khu vực hoạt động</small><strong>Hòa Lạc, Hà Nội</strong></p></div>
            <a className="site-footer__contact-row" href="tel:0966709790"><span className="site-footer__contact-icon"><Phone size={17}/></span><p><small>Hotline</small><strong>0966 709 790</strong></p></a>
            <a className="site-footer__contact-row" href="mailto:admin@xspace.vn"><span className="site-footer__contact-icon"><Mail size={17}/></span><p><small>Email</small><strong>admin@xspace.vn</strong></p></a>
          </div>
          <div className="site-footer__actions">
            <Link to="/gui-tin" className="site-footer__action site-footer__action--primary"><Send size={16}/>Gửi tin cho Ban biên tập</Link>
            <Link to="/lien-he" className="site-footer__action site-footer__action--secondary">Liên hệ trực tiếp<ArrowRight size={15}/></Link>
          </div>
        </section>
      </div>
      <div className="site-footer__bottom"><div className="container site-footer__bottom-inner"><p>© {currentYear} Đô Thị Hòa Lạc · Media Space / XSpace Việt Nam</p><nav className="site-footer__legal"><Link to="/gioi-thieu">Giới thiệu</Link><Link to="/dieu-khoan">Điều khoản</Link><Link to="/chinh-sach-quyen-rieng">Quyền riêng tư</Link><Link to="/quy-dinh-dang-bai">Quy định đăng bài</Link><a href="https://www.facebook.com/dothihoalac" target="_blank" rel="noreferrer"><Facebook size={16}/></a></nav></div></div>
    </footer>
  );
}
