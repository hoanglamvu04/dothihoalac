import { Link } from 'react-router-dom';

import {
  ArrowUp,
  ChevronRight,
  Facebook,
  Mail,
  MapPin,
  Phone,
  UsersRound,
  Youtube,
} from 'lucide-react';

import './SiteFooter.css';
import './SiteFooter.mobile.css';

const navigationLinks = [
  { to: '/', label: 'Trang chủ' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/cong-dong', label: 'Cộng đồng' },
  { to: '/bat-dong-san', label: 'Bất động sản' },
  { to: '/viec-lam', label: 'Việc làm' },
  { to: '/gui-tin', label: 'Gửi thông tin' },
];

const facebookUrl = String(import.meta.env.VITE_FACEBOOK_URL || '').trim();
const youtubeUrl = String(import.meta.env.VITE_YOUTUBE_URL || '').trim();
const xspaceUrl = 'https://www.xspace.vn/';

function FooterSocialLinks({ className = '' }) {
  return (
    <div className={`site-footer__social ${className}`.trim()} aria-label="Kênh cộng đồng">
      {facebookUrl ? (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook Đô Thị Hòa Lạc"
          title="Facebook"
        >
          <Facebook size={19} />
        </a>
      ) : null}

      {youtubeUrl ? (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube Đô Thị Hòa Lạc"
          title="YouTube"
        >
          <Youtube size={19} />
        </a>
      ) : null}

      <a
        href={xspaceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="XSpace Việt Nam"
        title="XSpace Việt Nam"
      >
        <UsersRound size={19} />
      </a>
    </div>
  );
}

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__main">
        <div className="site-footer__decor" aria-hidden="true" />

        <div className="container site-footer__grid">
          <section className="site-footer__brand">
            <Link
              to="/"
              className="site-footer__logo"
              aria-label="Đô Thị Hòa Lạc - Trang chủ"
            >
              <img src="/Logo2.png" alt="Biểu tượng Đô Thị Hòa Lạc" />
              <span>
                <strong>Đô Thị Hòa Lạc</strong>
                <small>Trung tâm phát triển đô thị Hòa Lạc</small>
              </span>
            </Link>

            <p className="site-footer__description">
              Nền tảng tổng hợp thông tin, cộng đồng và dữ liệu địa phương dành
              cho người sống, làm việc và đầu tư tại Hòa Lạc.
            </p>

            <div className="site-footer__brand-divider" aria-hidden="true" />

            <p className="site-footer__operator">
              <span>Vận hành bởi</span>
              <a href={xspaceUrl} target="_blank" rel="noopener noreferrer">
                <strong>Công ty Cổ phần XSpace Việt Nam</strong>
              </a>
            </p>
          </section>

          <section className="site-footer__column site-footer__contact-column">
            <h3>Thông tin liên hệ</h3>
            <span className="site-footer__heading-rule" aria-hidden="true" />

            <div className="site-footer__contact-list">
              <div className="site-footer__contact-item">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <MapPin size={20} />
                </span>
                <div>
                  <strong>Khu vực</strong>
                  <span>Hòa Lạc, Hà Nội</span>
                </div>
              </div>

              <div className="site-footer__contact-item">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <Phone size={20} />
                </span>
                <div>
                  <strong>Hotline</strong>
                  <a href="tel:0966709790">0966 709 790</a>
                </div>
              </div>

              <div className="site-footer__contact-item">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <Mail size={20} />
                </span>
                <div>
                  <strong>Email</strong>
                  <a href="mailto:admin@xspace.vn">admin@xspace.vn</a>
                </div>
              </div>
            </div>
          </section>

          <nav className="site-footer__column site-footer__navigation" aria-label="Điều hướng footer">
            <h3>Điều hướng</h3>
            <span className="site-footer__heading-rule" aria-hidden="true" />

            <div className="site-footer__links site-footer__links--primary">
              {navigationLinks.map((item) => (
                <Link key={item.to} to={item.to}>
                  <span>{item.label}</span>
                  <ChevronRight size={17} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </nav>

          <section className="site-footer__column site-footer__connect">
            <h3>Kết nối với chúng tôi</h3>
            <span className="site-footer__heading-rule" aria-hidden="true" />

            <p>
              Cập nhật tin tức mới nhất về Hòa Lạc qua các kênh cộng đồng của chúng tôi.
            </p>

            <FooterSocialLinks className="site-footer__social--connect" />
          </section>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container site-footer__bottom-inner">
          <nav className="site-footer__bottom-links" aria-label="Chính sách footer">
            <Link to="/dieu-khoan">Điều khoản</Link>
            <Link to="/chinh-sach-quyen-rieng">Quyền riêng tư</Link>
            <Link to="/quy-dinh-dang-bai">Quy định đăng bài</Link>
          </nav>

          <p>
            © {currentYear} Đô Thị Hòa Lạc.{' '}
            <a href={xspaceUrl} target="_blank" rel="noopener noreferrer">
              Công ty Cổ phần XSpace Việt Nam
            </a>
          </p>

          <button
            type="button"
            className="site-footer__back-top"
            onClick={scrollToTop}
            aria-label="Lên đầu trang"
            title="Lên đầu trang"
          >
            <span className="site-footer__back-top-icon">
              <ArrowUp size={19} />
            </span>
            <span>Lên đầu trang</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
