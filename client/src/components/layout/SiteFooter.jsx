import { Link } from 'react-router-dom';

import {
  ArrowRight,
  Building2,
  ExternalLink,
  Facebook,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  PhoneCall,
  Send,
} from 'lucide-react';

import './SiteFooter.css';

const navigationLinks = [
  {
    to: '/tin-tuc',
    label: 'Tin tức',
    icon: Newspaper,
  },
  {
    to: '/cong-dong',
    label: 'Cộng đồng',
    icon: MessageCircle,
  },
  {
    to: '/nha-dat',
    label: 'Bất động sản',
    icon: Building2,
  },
  {
    to: '/viec-lam',
    label: 'Việc làm',
    icon: ArrowRight,
  },
  {
    to: '/gioi-thieu',
    label: 'Giới thiệu',
    icon: ArrowRight,
  },
];

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__grid">
          <section className="site-footer__brand">
            <Link
              to="/"
              className="site-footer__logo"
              aria-label="Đô Thị Hòa Lạc - Trang chủ"
            >
              <img
                src="/Logo2.png"
                alt="Biểu tượng Đô Thị Hòa Lạc"
              />

              <span>
                <strong>Đô Thị Hòa Lạc</strong>
                <small>TRUNG TÂM PHÁT TRIỂN ĐÔ THỊ HÒA LẠC</small>
              </span>
            </Link>

            <p className="site-footer__description">
              Nền tảng tin tức, cộng đồng và dữ liệu địa phương dành cho người đang sống,
              làm việc, kinh doanh và đầu tư tại khu vực Hòa Lạc.
            </p>

            <div className="site-footer__operator">
              <span>Đơn vị vận hành</span>
              <strong>MEDIA SPACE · CÔNG TY CỔ PHẦN XSPACE VIỆT NAM</strong>
            </div>
          </section>

          <section className="site-footer__column site-footer__contact-column">
            <h3>Thông tin liên hệ</h3>

            <div className="site-footer__contact-list">
              <div className="site-footer__contact-item">
                <span className="site-footer__contact-icon">
                  <MapPin size={18} />
                </span>
                <div>
                  <strong>Khu vực hoạt động</strong>
                  <span>Hòa Lạc, Hà Nội</span>
                </div>
              </div>

              <a className="site-footer__contact-item" href="tel:0966709790">
                <span className="site-footer__contact-icon">
                  <Phone size={18} />
                </span>
                <div>
                  <strong>Hotline</strong>
                  <span>0966 709 790</span>
                </div>
              </a>

              <a className="site-footer__contact-item" href="mailto:contact@dothihoalac.vn">
                <span className="site-footer__contact-icon">
                  <Mail size={18} />
                </span>
                <div>
                  <strong>Email</strong>
                  <span>contact@dothihoalac.vn</span>
                </div>
              </a>
            </div>
          </section>

          <nav className="site-footer__column" aria-label="Điều hướng footer">
            <h3>Điều hướng</h3>

            <div className="site-footer__nav-list">
              {navigationLinks.map((item) => {
                const ItemIcon = item.icon;

                return (
                  <Link key={item.to} to={item.to}>
                    <ItemIcon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <section className="site-footer__column site-footer__quick-column">
            <h3>Kết nối nhanh</h3>

            <div className="site-footer__quick-links">
              <Link to="/gui-tin">
                <span>Gửi tin cho Ban biên tập</span>
                <Send size={16} />
              </Link>

              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
              >
                <span>Facebook</span>
                <Facebook size={16} />
              </a>

              <Link className="is-primary" to="/lien-he">
                <span>Liên hệ trực tiếp</span>
                <ExternalLink size={16} />
              </Link>
            </div>
          </section>
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__copyright">
            © {currentYear} Media Space · Công ty Cổ phần XSPACE Việt Nam · Đô Thị Hòa Lạc
          </div>

          <div className="site-footer__bottom-right">
            <span>Hòa Lạc · Hà Nội</span>
            <Link to="/">www.dothihoalac.vn</Link>
          </div>
        </div>
      </div>

      <a
        className="site-footer__call-float"
        href="tel:0966709790"
        aria-label="Gọi hotline Đô Thị Hòa Lạc"
        title="Gọi 0966 709 790"
      >
        <PhoneCall size={27} />
      </a>
    </footer>
  );
}
