import { Link } from 'react-router-dom';

import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Facebook,
  FilePenLine,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';

import './SiteFooter.css';

const exploreLinks = [
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
    icon: BriefcaseBusiness,
  },
];

const supportLinks = [
  {
    to: '/gioi-thieu',
    label: 'Giới thiệu',
  },
  {
    to: '/lien-he',
    label: 'Liên hệ',
  },
  {
    to: '/dieu-khoan',
    label: 'Điều khoản sử dụng',
  },
  {
    to: '/chinh-sach-quyen-rieng',
    label: 'Chính sách quyền riêng tư',
  },
  {
    to: '/quy-dinh-dang-bai',
    label: 'Quy định đăng bài',
  },
];

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div className="container">
          <section className="site-footer__cta">
            <div className="site-footer__cta-content">
              <span className="site-footer__cta-icon">
                <FilePenLine size={25} />
              </span>

              <div>
                <small>Đóng góp cho cộng đồng</small>

                <h2>
                  Chia sẻ thông tin hữu ích về Hòa Lạc
                </h2>

                <p>
                  Đăng bài cộng đồng, tin nhà đất, việc làm
                  hoặc gửi nguồn tin địa phương tới Ban biên tập.
                </p>
              </div>
            </div>

            <div className="site-footer__cta-actions">
              <Link
                className="site-footer__cta-primary"
                to="/dang-bai"
              >
                <FilePenLine size={17} />
                Đăng nội dung
              </Link>

              <Link
                className="site-footer__cta-secondary"
                to="/gui-tin"
              >
                <Send size={17} />
                Gửi tin
              </Link>
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
              <img
                src="/Logo2.png"
                alt="Biểu tượng Đô Thị Hòa Lạc"
              />

              <span>
                <strong>Đô Thị Hòa Lạc</strong>
                <small>Trung Tâm Phát Triển Đô Thị Hòa Lạc</small>
              </span>
            </Link>

            <p className="site-footer__description">
              Nền tảng tin tức, cộng đồng và dữ liệu địa phương
              dành cho người đang sống, làm việc, kinh doanh và
              đầu tư tại khu vực Hòa Lạc.
            </p>

            <div className="site-footer__trust">
              <ShieldCheck size={18} />

              <span>
                Nội dung được phân loại và kiểm duyệt trước khi
                hiển thị công khai.
              </span>
            </div>

            <div className="site-footer__social">
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook Đô Thị Hòa Lạc"
                title="Facebook"
              >
                <Facebook size={19} />
              </a>

              <a
                href="mailto:contact@dothihoalac.vn"
                aria-label="Gửi email tới Đô Thị Hòa Lạc"
                title="Email"
              >
                <Mail size={19} />
              </a>
            </div>
          </section>

          <nav
            className="site-footer__column"
            aria-label="Khám phá"
          >
            <h3>Khám phá</h3>

            <div className="site-footer__links">
              {exploreLinks.map((item) => {
                const ItemIcon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                  >
                    <ItemIcon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <nav
            className="site-footer__column"
            aria-label="Hỗ trợ"
          >
            <h3>Thông tin và hỗ trợ</h3>

            <div className="site-footer__links">
              {supportLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                >
                  <ArrowRight size={15} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <section className="site-footer__column">
            <h3>Liên hệ</h3>

            <div className="site-footer__contact">
              <div>
                <span>
                  <MapPin size={18} />
                </span>

                <p>
                  <small>Khu vực hoạt động</small>
                  <strong>Hòa Lạc, Hà Nội</strong>
                </p>
              </div>

              <a href="mailto:contact@dothihoalac.vn">
                <span>
                  <Mail size={18} />
                </span>

                <p>
                  <small>Email</small>
                  <strong>
                    contact@dothihoalac.vn
                  </strong>
                </p>
              </a>

              <a href="tel:0966709790">
                <span>
                  <Phone size={18} />
                </span>

                <p>
                  <small>Hotline</small>
                  <strong>0966 709 790</strong>
                </p>
              </a>
            </div>

            <Link
              to="/lien-he"
              className="site-footer__contact-button"
            >
              Liên hệ với chúng tôi
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container site-footer__bottom-inner">
          <div>
            <span>
              © {currentYear} Đô Thị Hòa Lạc.
            </span>

            <span>
              Nội dung thuộc Media Space · XSpace
            </span>
          </div>

          <div className="site-footer__bottom-links">
            <Link to="/dieu-khoan">
              Điều khoản
            </Link>

            <Link to="/chinh-sach-quyen-rieng">
              Quyền riêng tư
            </Link>

            <Link to="/quy-dinh-dang-bai">
              Quy định đăng bài
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}