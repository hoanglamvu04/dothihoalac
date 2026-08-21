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

import logoMark from '../../assets/logo-mark.svg';
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
          <Link
            to="/"
            className="dthl-brand site-footer__logo"
            aria-label="Đô Thị Hòa Lạc - Trang chủ"
          >
            <span className="dthl-brand__mark site-footer__logo-mark">
              <img src={logoMark} alt="" aria-hidden="true" />
            </span>
            <span className="dthl-brand__content site-footer__logo-copy">
              <strong>Đô Thị Hòa Lạc</strong>
              <small>Trung Tâm Phát Triển Đô Thị Hòa Lạc</small>
            </span>
          </Link>

          <p className="site-footer__description">
            Nền tảng thông tin, cộng đồng và dữ liệu địa phương dành cho người sống,
            làm việc, kinh doanh và đầu tư tại Hòa Lạc.
          </p>

          <div className="site-footer__scope" aria-label="Các nội dung chính">
            {compactHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <span key={item.label}>
                  <Icon size={14} aria-hidden="true" />
                  {item.label}
                </span>
              );
            })}
          </div>

          <div className="site-footer__operator">
            <small>Đơn vị vận hành</small>
            <strong>Công ty Cổ phần XSpace Việt Nam</strong>
          </div>
        </section>

        <nav className="site-footer__column" aria-label="Điều hướng nhanh">
          <h2>Điều hướng</h2>
          <div className="site-footer__links">
            {navigationLinks.map((item) => (
              <Link key={item.to} to={item.to}>
                <ArrowRight size={14} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <nav className="site-footer__column" aria-label="Chuyên mục nổi bật">
          <h2>Chuyên mục</h2>
          <div className="site-footer__links site-footer__links--categories">
            {categoryLinks.map((item) => (
              <Link key={item.to} to={item.to}>
                <ArrowRight size={14} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <section className="site-footer__column site-footer__contact-column">
          <h2>Liên hệ</h2>

          <div className="site-footer__contact-list">
            <div className="site-footer__contact-row">
              <span className="site-footer__contact-icon"><MapPin size={17} /></span>
              <p>
                <small>Khu vực hoạt động</small>
                <strong>Hòa Lạc, Hà Nội</strong>
              </p>
            </div>

            <a className="site-footer__contact-row" href="tel:0966709790">
              <span className="site-footer__contact-icon"><Phone size={17} /></span>
              <p>
                <small>Hotline</small>
                <strong>0966 709 790</strong>
              </p>
            </a>

            <a className="site-footer__contact-row" href="mailto:contact@dothihoalac.vn">
              <span className="site-footer__contact-icon"><Mail size={17} /></span>
              <p>
                <small>Email</small>
                <strong>contact@dothihoalac.vn</strong>
              </p>
            </a>
          </div>

          <div className="site-footer__actions">
            <Link to="/gui-tin" className="site-footer__action site-footer__action--primary">
              <Send size={16} aria-hidden="true" />
              <span>Gửi tin cho Ban biên tập</span>
            </Link>
            <Link to="/lien-he" className="site-footer__action site-footer__action--secondary">
              <span>Liên hệ trực tiếp</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <div className="site-footer__bottom">
        <div className="container site-footer__bottom-inner">
          <p>© {currentYear} Đô Thị Hòa Lạc · Công ty Cổ phần XSpace Việt Nam</p>

          <nav className="site-footer__legal" aria-label="Thông tin pháp lý">
            <Link to="/gioi-thieu">Giới thiệu</Link>
            <Link to="/dieu-khoan">Điều khoản</Link>
            <Link to="/chinh-sach-quyen-rieng">Quyền riêng tư</Link>
            <Link to="/quy-dinh-dang-bai">Quy định đăng bài</Link>
            <a
              href="https://www.facebook.com/dothihoalac"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook Đô Thị Hòa Lạc"
              title="Facebook"
            >
              <Facebook size={16} />
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
