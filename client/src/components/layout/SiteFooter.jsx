import { Link } from 'react-router-dom';

import {
  ArrowUp,
  Building2,
  Facebook,
  Mail,
  MapPin,
  Phone,
  UsersRound,
  Youtube,
} from 'lucide-react';

const navigationLinks = [
  { to: '/', label: 'Trang chủ' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/cong-dong', label: 'Cộng đồng' },
  { to: '/nha-dat', label: 'Bất động sản' },
  { to: '/viec-lam', label: 'Việc làm' },
  { to: '/gui-tin', label: 'Gửi thông tin' },
];

const categoryLinks = [
  { to: '/tin-tuc?category=quy-hoach', label: 'Quy hoạch' },
  { to: '/tin-tuc?category=ha-tang', label: 'Hạ tầng' },
  { to: '/tin-tuc?category=du-an-dtxd', label: 'Dự án ĐTXD' },
  { to: '/tin-tuc?category=chinh-sach', label: 'Chính sách' },
];

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__main">
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
              Nền tảng thông tin, cộng đồng và dữ liệu địa phương dành cho người
              sống, làm việc và đầu tư tại Hòa Lạc.
            </p>

            <div className="site-footer__operator">
              <span className="site-footer__operator-icon" aria-hidden="true">
                <Building2 size={16} />
              </span>
              <p>
                <small>Đơn vị vận hành</small>
                <strong>Công ty Cổ phần XSpace Việt Nam</strong>
              </p>
            </div>
          </section>

          <nav className="site-footer__column" aria-label="Điều hướng footer">
            <h3>Điều hướng</h3>
            <div className="site-footer__links site-footer__links--primary">
              {navigationLinks.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <nav className="site-footer__column" aria-label="Chuyên mục footer">
            <h3>Chuyên mục</h3>
            <div className="site-footer__links">
              {categoryLinks.map((item) => (
                <Link key={`${item.to}-${item.label}`} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <section className="site-footer__column site-footer__contact-column">
            <h3>Liên hệ</h3>

            <div className="site-footer__contact">
              <div className="site-footer__contact-row">
                <MapPin size={17} aria-hidden="true" />
                <span>Hòa Lạc, Hà Nội</span>
              </div>

              <a className="site-footer__contact-row" href="tel:0966709790">
                <Phone size={17} aria-hidden="true" />
                <span>0966 709 790</span>
              </a>

              <a
                className="site-footer__contact-row"
                href="mailto:dothihoalac@xspace.vn"
              >
                <Mail size={17} aria-hidden="true" />
                <span>dothihoalac@xspace.vn</span>
              </a>
            </div>

            <div className="site-footer__social" aria-label="Kênh cộng đồng">
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook Đô Thị Hòa Lạc"
                title="Facebook"
              >
                <Facebook size={17} />
              </a>

              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube Đô Thị Hòa Lạc"
                title="YouTube"
              >
                <Youtube size={17} />
              </a>

              <Link
                to="/cong-dong"
                aria-label="Cộng đồng Đô Thị Hòa Lạc"
                title="Cộng đồng"
              >
                <UsersRound size={17} />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container site-footer__bottom-inner">
          <p>
            © {currentYear} Đô Thị Hòa Lạc · Công ty Cổ phần XSpace Việt Nam
          </p>

          <nav className="site-footer__bottom-links" aria-label="Chính sách footer">
            <Link to="/dieu-khoan">Điều khoản</Link>
            <Link to="/chinh-sach-quyen-rieng">Quyền riêng tư</Link>
            <Link to="/quy-dinh-dang-bai">Quy định đăng bài</Link>
          </nav>

          <button
            type="button"
            className="site-footer__back-top"
            onClick={scrollToTop}
            aria-label="Lên đầu trang"
            title="Lên đầu trang"
          >
            <ArrowUp size={17} />
          </button>
        </div>
      </div>
    </footer>
  );
}
