import { Link } from 'react-router-dom';
import { Facebook, Mail, MapPin, Phone } from 'lucide-react';
import logoMark from '../../assets/logo-mark.svg';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <div className="brand brand--footer">
            <img src={logoMark} alt="" />
            <span><strong>Đô Thị Hòa Lạc</strong><small>Thuộc hệ sinh thái XSpace</small></span>
          </div>
          <p>Nền tảng tin tức, cộng đồng và dữ liệu địa phương dành cho người sống, làm việc và đầu tư tại Hòa Lạc.</p>
          <div className="footer-social"><a href="#facebook" aria-label="Facebook"><Facebook size={19} /></a></div>
        </div>
        <div>
          <h3>Khám phá</h3>
          <Link to="/tin-tuc">Tin tức</Link>
          <Link to="/cong-dong">Cộng đồng</Link>
          <Link to="/nha-dat">Bất động sản</Link>
          <Link to="/viec-lam">Việc làm</Link>
        </div>
        <div>
          <h3>Hỗ trợ</h3>
          <Link to="/gioi-thieu">Giới thiệu</Link>
          <Link to="/lien-he">Liên hệ</Link>
          <Link to="/dieu-khoan">Điều khoản sử dụng</Link>
          <Link to="/chinh-sach-quyen-rieng">Quyền riêng tư</Link>
          <Link to="/quy-dinh-dang-bai">Quy định đăng bài</Link>
        </div>
        <div>
          <h3>Liên hệ</h3>
          <p><MapPin size={17} /> Hòa Lạc, Hà Nội</p>
          <p><Mail size={17} /> contact@dothihoalac.vn</p>
          <p><Phone size={17} /> Hotline cập nhật sau</p>
        </div>
      </div>
      <div className="site-footer__bottom">
        <div className="container"><span>© {new Date().getFullYear()} Đô Thị Hòa Lạc.</span><span>Media Space · XSpace</span></div>
      </div>
    </footer>
  );
}
