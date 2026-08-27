import { Link } from 'react-router-dom';

import {
  ArrowUp,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Facebook,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  Send,
  ShieldCheck,
  UsersRound,
  Youtube,
} from 'lucide-react';

const featureLinks = [
  { to: '/tin-tuc', label: 'Tin tức', icon: Newspaper },
  { to: '/cong-dong', label: 'Cộng đồng', icon: MessageCircle },
  { to: '/nha-dat', label: 'Bất động sản', icon: Building2 },
  { to: '/viec-lam', label: 'Việc làm', icon: BriefcaseBusiness },
];

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
  { to: '/nha-dat', label: 'BĐS Hòa Lạc' },
  { to: '/tin-tuc?category=chinh-sach', label: 'Chính sách' },
  { to: '/tin-tuc?category=doi-song-dan-cu', label: 'Đời sống dân cư' },
];

const footerFineTuneStyles = `
  .site-footer__top {
    padding-bottom: 26px;
  }

  .site-footer__cta-formats {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: -5px;
  }

  .site-footer__cta-formats-label {
    margin-right: 2px;
    color: rgba(229, 239, 233, 0.7);
    font-size: 10px;
    font-weight: 650;
    letter-spacing: 0.02em;
  }

  .site-footer__cta-format {
    display: inline-flex;
    align-items: center;
    min-height: 25px;
    padding: 0 9px;
    gap: 5px;
    border: 1px solid rgba(96, 230, 139, 0.22);
    border-radius: 999px;
    color: rgba(248, 252, 249, 0.9);
    background: rgba(4, 72, 44, 0.28);
    font-size: 9.5px;
    font-weight: 720;
    line-height: 1;
  }

  .site-footer__cta-format svg {
    width: 12px;
    height: 12px;
    color: var(--footer-green);
  }

  @media (max-width: 720px) {
    .site-footer__top {
      padding-bottom: 18px;
    }

    .site-footer__cta-formats {
      justify-content: flex-start;
    }
  }

  @media (min-width: 1321px) {
    .site-footer__cta h2 { font-size: clamp(20px, 1.55vw, 25px); }
    .site-footer__cta p { font-size: 11.5px; }
    .site-footer__cta-button { font-size: 12px; }
    .site-footer__cta-note { font-size: 10px; }
    .site-footer__cta-icon svg { width: 22px; height: 22px; }
    .site-footer__cta-button svg { width: 15px; height: 15px; }
    .site-footer__cta-note svg { width: 13px; height: 13px; }

    .site-footer__logo strong { font-size: 21px; }
    .site-footer__logo small { font-size: 8.5px; }
    .site-footer__description { font-size: 11.5px; }

    .site-footer__feature-links > a { font-size: 10px; }
    .site-footer__feature-links > a svg { width: 12px; height: 12px; }

    .site-footer__operator small { font-size: 8.5px; }
    .site-footer__operator strong { font-size: 11px; }
    .site-footer__operator-icon svg { width: 14px; height: 14px; }

    .site-footer__column h3 { font-size: 12px; }
    .site-footer .site-footer__links > a { font-size: 11px; }
    .site-footer .site-footer__links > a svg {
      flex-basis: 12px !important;
      width: 12px !important;
      height: 12px !important;
    }

    .site-footer .site-footer__contact-row small { font-size: 9px; }
    .site-footer .site-footer__contact-row strong { font-size: 11px; }
    .site-footer__contact-icon svg { width: 15px; height: 15px; }

    .site-footer .site-footer__social > a svg { width: 15px; height: 15px; }

    .site-footer__bottom p,
    .site-footer__bottom-links a { font-size: 10px; }
    .site-footer__back-top svg { width: 14px; height: 14px; }
  }
`;

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="site-footer">
      <style>{footerFineTuneStyles}</style>

      <div className="site-footer__top">
        <div className="container">
          <section className="site-footer__cta">
            <div className="site-footer__cta-copy">
              <span className="site-footer__cta-icon" aria-hidden="true">
                <Send size={30} />
              </span>

              <div className="site-footer__cta-text">
                <h2>
                  Cùng xây dựng Đô Thị Hòa Lạc
                  <span>văn minh, kết nối và phát triển bền vững</span>
                </h2>

                <p>
                  Gửi thông tin, đề xuất hoặc phản ánh của bạn cho Ban biên tập.
                  <br />
                  Có thể đính kèm hình ảnh, PDF, DOC hoặc DOCX để đối chiếu.
                </p>
              </div>
            </div>

            <div className="site-footer__cta-action">
              <Link to="/gui-tin" className="site-footer__cta-button">
                <Send size={20} />
                <span>Gửi thông tin cho Ban biên tập</span>
                <ChevronRight size={20} />
              </Link>

              <div
                className="site-footer__cta-formats"
                aria-label="Định dạng tài liệu được hỗ trợ"
              >
                <span className="site-footer__cta-formats-label">
                  Tài liệu hỗ trợ
                </span>

                <span className="site-footer__cta-format">
                  <FileText size={13} />
                  PDF
                </span>

                <span className="site-footer__cta-format">
                  <FileText size={13} />
                  DOC
                </span>

                <span className="site-footer__cta-format">
                  <FileText size={13} />
                  DOCX
                </span>
              </div>

              <div className="site-footer__cta-note">
                <ShieldCheck size={18} />
                <span>Thông tin của bạn được bảo mật và tôn trọng</span>
              </div>
            </div>
          </section>
        </div>
      </div>

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
              sống, làm việc, kinh doanh và đầu tư tại Hòa Lạc.
            </p>

            <div className="site-footer__feature-links" aria-label="Chuyên mục nổi bật">
              {featureLinks.map((item) => {
                const ItemIcon = item.icon;

                return (
                  <Link key={item.to} to={item.to}>
                    <ItemIcon size={17} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="site-footer__operator">
              <span className="site-footer__operator-icon" aria-hidden="true">
                <Building2 size={19} />
              </span>
              <div>
                <small>Đơn vị vận hành</small>
                <strong>Công ty Cổ phần XSpace Việt Nam</strong>
              </div>
            </div>
          </section>

          <nav className="site-footer__column" aria-label="Điều hướng footer">
            <h3>Điều hướng</h3>
            <div className="site-footer__links">
              {navigationLinks.map((item) => (
                <Link key={item.to} to={item.to}>
                  <ChevronRight size={17} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <nav className="site-footer__column" aria-label="Chuyên mục footer">
            <h3>Chuyên mục</h3>
            <div className="site-footer__links">
              {categoryLinks.map((item) => (
                <Link key={`${item.to}-${item.label}`} to={item.to}>
                  <ChevronRight size={17} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <section className="site-footer__column site-footer__contact-column">
            <h3>Liên hệ</h3>

            <div className="site-footer__contact">
              <div className="site-footer__contact-row">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <MapPin size={21} />
                </span>
                <p>
                  <small>Khu vực hoạt động</small>
                  <strong>Hòa Lạc, Hà Nội</strong>
                </p>
              </div>

              <a className="site-footer__contact-row" href="tel:0966709790">
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <Phone size={21} />
                </span>
                <p>
                  <small>Hotline</small>
                  <strong>0966 709 790</strong>
                </p>
              </a>

              <a
                className="site-footer__contact-row"
                href="mailto:dothihoalac@xspace.vn"
              >
                <span className="site-footer__contact-icon" aria-hidden="true">
                  <Mail size={21} />
                </span>
                <p>
                  <small>Email</small>
                  <strong>dothihoalac@xspace.vn</strong>
                </p>
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
                <Facebook size={20} />
              </a>

              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube Đô Thị Hòa Lạc"
                title="YouTube"
              >
                <Youtube size={20} />
              </a>

              <Link
                to="/cong-dong"
                aria-label="Cộng đồng Đô Thị Hòa Lạc"
                title="Cộng đồng"
              >
                <UsersRound size={20} />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container site-footer__bottom-inner">
          <p>
            © {currentYear} Đô Thị Hòa Lạc - Công ty Cổ phần XSpace Việt Nam
          </p>

          <nav className="site-footer__bottom-links" aria-label="Chính sách footer">
            <Link to="/gioi-thieu">Giới thiệu</Link>
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
            <ArrowUp size={19} />
          </button>
        </div>
      </div>
    </footer>
  );
}
