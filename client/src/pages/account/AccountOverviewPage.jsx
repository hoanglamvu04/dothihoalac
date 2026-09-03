import { Link, useOutletContext } from 'react-router-dom';
import {
  Activity,
  Bell,
  Bookmark,
  CheckCircle2,
  FileText,
  Files,
  Home,
  Lock,
  MapPin,
  Pencil,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import { useAuth } from '../../context/AuthContext';

import './AccountOverviewV2.css';

function getAreaName(profile) {
  if (!profile?.areaId) return 'Chưa chọn';
  if (typeof profile.areaId === 'object') return profile.areaId?.name || 'Chưa chọn';
  return profile?.areaName || 'Chưa chọn';
}

function InfoField({ label, value, icon: Icon }) {
  return (
    <div className="account-overview-v2__field">
      <span className="account-overview-v2__field-icon">
        <Icon size={17} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value || 'Chưa cập nhật'}</strong>
      </div>
    </div>
  );
}

export default function AccountOverviewPage() {
  const { user } = useAuth();
  const { accountProfile } = useOutletContext();

  const completedFields = [
    accountProfile?.displayName,
    accountProfile?.fullName,
    accountProfile?.occupation,
    accountProfile?.areaId,
    accountProfile?.bio,
    accountProfile?.avatarMediaId,
    accountProfile?.coverMediaId,
  ].filter(Boolean).length;

  const completion = Math.round((completedFields / 7) * 100);
  const displayName = accountProfile?.displayName || user?.displayName || user?.username;
  const publicProfile = accountProfile?.publicProfile !== false;
  const areaName = getAreaName(accountProfile);

  return (
    <div className="account-overview-v2">
      <Seo title="Tổng quan tài khoản" />

      <div className="account-overview-v2__topline">
        <div>
          <span>Tổng quan tài khoản</span>
          <h2>Thông tin và hoạt động của bạn</h2>
        </div>
        <Link to="/tai-khoan/ho-so" className="account-overview-v2__edit">
          <Pencil size={16} />
          Chỉnh sửa
        </Link>
      </div>

      <nav className="account-overview-v2__tabs" aria-label="Lối tắt tài khoản">
        <Link to="/tai-khoan/noi-dung">
          <FileText size={16} />
          Bài đăng
        </Link>
        <Link to="/tai-khoan/tin-nha-dat">
          <Home size={16} />
          Tin BĐS
        </Link>
        <Link to="/tai-khoan/da-luu">
          <Bookmark size={16} />
          Đã lưu
        </Link>
        <Link to="/tai-khoan/thong-bao">
          <Bell size={16} />
          Thông báo
        </Link>
      </nav>

      <section className="account-overview-v2__section">
        <div className="account-overview-v2__section-heading">
          <div>
            <h3>Tổng quan tài khoản</h3>
            <p>Các trạng thái quan trọng nhất của tài khoản.</p>
          </div>
        </div>

        <div className="account-overview-v2__highlight-grid">
          <article>
            <span><UserRound size={20} /></span>
            <div>
              <small>Hoàn thiện hồ sơ</small>
              <strong>{completion}%</strong>
              <div className="account-overview-v2__completion" aria-label={`Hoàn thiện hồ sơ ${completion}%`}>
                <span style={{ width: `${completion}%` }} />
              </div>
              <p>{completion >= 80 ? 'Hồ sơ của bạn đã khá đầy đủ.' : 'Bổ sung thêm thông tin để hồ sơ rõ ràng hơn.'}</p>
            </div>
          </article>

          <article>
            <span><ShieldCheck size={20} /></span>
            <div>
              <small>Xác thực</small>
              <strong>{user?.emailVerifiedAt ? 'Đã xác thực' : 'Chưa hoàn tất'}</strong>
              <p>{user?.emailVerifiedAt ? 'Email đang được bảo vệ và xác thực.' : 'Nên xác thực email để tăng độ an toàn.'}</p>
            </div>
          </article>

          <article>
            <span><CheckCircle2 size={20} /></span>
            <div>
              <small>Quyền riêng tư</small>
              <strong>{publicProfile ? 'Công khai' : 'Riêng tư'}</strong>
              <p>{publicProfile ? 'Người khác có thể xem hồ sơ công khai.' : 'Chỉ bạn quản lý được thông tin hồ sơ.'}</p>
            </div>
          </article>
        </div>
      </section>

      <section className="account-overview-v2__section account-overview-v2__account-info">
        <div className="account-overview-v2__section-heading">
          <div>
            <h3>Thông tin tài khoản</h3>
            <p>Các trường chính đang được sử dụng trong hồ sơ của bạn.</p>
          </div>
          <Link to="/tai-khoan/ho-so">Cập nhật thông tin</Link>
        </div>

        <div className="account-overview-v2__info-grid">
          <InfoField label="Tên hiển thị" value={displayName} icon={UserRound} />
          <InfoField label="Email" value={user?.email} icon={ShieldCheck} />
          <InfoField label="Tên đăng nhập" value={`@${user?.username || 'chua-cap-nhat'}`} icon={UserRound} />
          <InfoField label="Nghề nghiệp" value={accountProfile?.occupation || 'Chưa cập nhật'} icon={FileText} />
          <InfoField label="Mật khẩu" value="••••••••" icon={Lock} />
          <InfoField label="Khu vực" value={areaName} icon={MapPin} />
        </div>
      </section>

      <section className="account-overview-v2__quick" aria-label="Truy cập nhanh">
        <Link to="/tai-khoan/ho-so">
          <UserRound size={19} />
          <span>
            <strong>Thông tin tài khoản</strong>
            <small>Cập nhật hồ sơ và thông tin hiển thị.</small>
          </span>
        </Link>
        <Link to="/tai-khoan/bao-mat">
          <ShieldCheck size={19} />
          <span>
            <strong>Bảo mật tài khoản</strong>
            <small>Mật khẩu, email và số điện thoại.</small>
          </span>
        </Link>
        <Link to="/tai-khoan/noi-dung">
          <Files size={19} />
          <span>
            <strong>Bài đăng của tôi</strong>
            <small>Quản lý bài cộng đồng, BĐS và việc làm.</small>
          </span>
        </Link>
        <Link to="/tai-khoan/da-luu">
          <Bookmark size={19} />
          <span>
            <strong>Tin đã lưu</strong>
            <small>Xem lại những nội dung bạn đã đánh dấu.</small>
          </span>
        </Link>
        <Link to="/tai-khoan/hoat-dong">
          <Activity size={19} />
          <span>
            <strong>Nhật ký hoạt động</strong>
            <small>Tìm kiếm, bình luận và nội dung đã thích.</small>
          </span>
        </Link>
        <Link to="/tai-khoan/thong-bao">
          <Bell size={19} />
          <span>
            <strong>Cài đặt & thông báo</strong>
            <small>Theo dõi các cập nhật mới nhất của tài khoản.</small>
          </span>
        </Link>
      </section>
    </div>
  );
}
