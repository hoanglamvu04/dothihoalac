import { Link, useOutletContext } from 'react-router-dom';
import {
  Activity,
  Bell,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Files,
  Home,
  Lock,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import { useAuth } from '../../context/AuthContext';

import './AccountOverviewV2.css';
import './AccountOverview.mobile.css';
import '../../components/account/AccountProfileShell.mobile.css';

function getAreaName(profile) {
  if (!profile?.areaId) return 'Chưa chọn';
  if (typeof profile.areaId === 'object') return profile.areaId?.name || 'Chưa chọn';
  return profile?.areaName || 'Chưa chọn';
}

function getMembership(createdAt) {
  if (!createdAt) {
    return {
      since: 'Chưa rõ',
      age: 'Chưa xác định',
    };
  }

  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) {
    return {
      since: 'Chưa rõ',
      age: 'Chưa xác định',
    };
  }

  const now = new Date();
  const totalMonths = Math.max(
    0,
    (now.getFullYear() - created.getFullYear()) * 12 +
      now.getMonth() -
      created.getMonth(),
  );

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const age = years
    ? `${years} năm${months ? ` ${months} tháng` : ''}`
    : `${Math.max(totalMonths, 1)} tháng hoạt động`;

  return {
    since: `Tháng ${String(created.getMonth() + 1).padStart(2, '0')}, ${created.getFullYear()}`,
    age,
  };
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
  const membership = getMembership(user?.createdAt);
  const verified = Boolean(user?.emailVerifiedAt);

  return (
    <div className="account-overview-v2">
      <Seo title="Tổng quan tài khoản" />

      <div className="account-overview-mobile">
        <section className="account-overview-mobile__status-grid" aria-label="Trạng thái tài khoản">
          <Link to="/tai-khoan/bao-mat" className="account-overview-mobile__status">
            <span className="account-overview-mobile__status-icon is-green">
              <ShieldCheck size={22} />
            </span>
            <strong>{verified ? 'Đã xác thực' : 'Chưa xác thực'}</strong>
            <small>
              {verified ? 'Email đã được bảo vệ và xác thực.' : 'Xác thực email để tăng độ an toàn.'}
            </small>
            <ChevronRight className="account-overview-mobile__status-arrow" size={18} />
          </Link>

          <Link to="/tai-khoan/ho-so" className="account-overview-mobile__status">
            <span className="account-overview-mobile__status-icon is-blue">
              <Lock size={22} />
            </span>
            <strong>Quyền riêng tư</strong>
            <small>
              {publicProfile ? 'Hồ sơ đang hiển thị công khai.' : 'Chỉ bạn quản lý được thông tin hồ sơ.'}
            </small>
            <ChevronRight className="account-overview-mobile__status-arrow" size={18} />
          </Link>

          <Link to="/tai-khoan/hoat-dong" className="account-overview-mobile__status">
            <span className="account-overview-mobile__status-icon is-green">
              <CalendarDays size={22} />
            </span>
            <strong>Thành viên từ</strong>
            <b>{membership.since}</b>
            <small>{membership.age}</small>
            <ChevronRight className="account-overview-mobile__status-arrow" size={18} />
          </Link>
        </section>

        <section className="account-overview-mobile__actions" aria-label="Lối tắt">
          <Link to="/dang-bai" className="account-overview-mobile__action is-create">
            <span><Plus size={24} /></span>
            <div>
              <strong>Bài mới</strong>
              <small>Chia sẻ với cộng đồng</small>
            </div>
            <ChevronRight size={20} />
          </Link>

          <Link to="/tai-khoan/noi-dung" className="account-overview-mobile__action is-posts">
            <span><FileText size={22} /></span>
            <div>
              <strong>Bài đăng</strong>
              <small>Quản lý nội dung của bạn</small>
            </div>
            <ChevronRight size={20} />
          </Link>

          <Link to="/tai-khoan/da-luu" className="account-overview-mobile__action is-saved">
            <span><Bookmark size={22} /></span>
            <div>
              <strong>Đã lưu</strong>
              <small>Xem lại nội dung đã lưu</small>
            </div>
            <ChevronRight size={20} />
          </Link>

          <Link to="/tai-khoan/thong-bao" className="account-overview-mobile__action is-notification">
            <span><Bell size={22} /></span>
            <div>
              <strong>Thông báo</strong>
              <small>Cập nhật mới nhất</small>
            </div>
            <ChevronRight size={20} />
          </Link>
        </section>

        <section className="account-overview-mobile__community">
          <div className="account-overview-mobile__community-copy">
            <small>CỘNG ĐỒNG HÒA LẠC</small>
            <strong>Chia sẻ câu chuyện,<br />kết nối cùng cộng đồng!</strong>
            <p>Mỗi bài viết của bạn giúp cộng đồng Hòa Lạc hữu ích và gắn kết hơn.</p>
            <Link to="/cong-dong/create">
              <Pencil size={18} />
              Viết bài ngay
              <ChevronRight size={17} />
            </Link>
          </div>
          <div className="account-overview-mobile__community-art" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="account-overview-mobile__manage">
          <div className="account-overview-mobile__manage-heading">
            <h3>Quản lý tài khoản nhanh</h3>
            <Link to="/tai-khoan/ho-so">
              Tùy chỉnh tài khoản của bạn
              <ChevronRight size={15} />
            </Link>
          </div>

          <div className="account-overview-mobile__manage-grid">
            <Link to="/tai-khoan/ho-so" className="is-green">
              <span><UserRound size={22} /></span>
              <div>
                <strong>Thông tin tài khoản</strong>
                <small>Cập nhật thông tin cá nhân và hồ sơ.</small>
              </div>
              <ChevronRight size={17} />
            </Link>

            <Link to="/tai-khoan/bao-mat" className="is-blue">
              <span><ShieldCheck size={22} /></span>
              <div>
                <strong>Bảo mật tài khoản</strong>
                <small>Mật khẩu, email và xác thực.</small>
              </div>
              <ChevronRight size={17} />
            </Link>

            <Link to="/tai-khoan/noi-dung" className="is-purple">
              <span><Files size={22} /></span>
              <div>
                <strong>Quản lý bài đăng</strong>
                <small>Bài viết, tin BĐS và việc làm của bạn.</small>
              </div>
              <ChevronRight size={17} />
            </Link>

            <Link to="/tai-khoan/tin-nha-dat" className="is-orange">
              <span><Home size={22} /></span>
              <div>
                <strong>Tin bất động sản</strong>
                <small>Quản lý các tin nhà đất bạn đã đăng.</small>
              </div>
              <ChevronRight size={17} />
            </Link>

            <Link to="/tai-khoan/da-luu" className="is-red">
              <span><Bookmark size={22} /></span>
              <div>
                <strong>Tin đã lưu</strong>
                <small>Xem lại những nội dung bạn đã lưu.</small>
              </div>
              <ChevronRight size={17} />
            </Link>

            <Link to="/tai-khoan/hoat-dong" className="is-teal">
              <span><Activity size={22} /></span>
              <div>
                <strong>Lịch sử hoạt động</strong>
                <small>Theo dõi các hoạt động gần đây.</small>
              </div>
              <ChevronRight size={17} />
            </Link>
          </div>
        </section>
      </div>

      <div className="account-overview-v2__desktop-dashboard">
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
          <Link className="account-overview-v2__tab-create" to="/dang-bai">
            <Plus size={18} />
            Bài đăng mới
          </Link>
          <Link to="/tai-khoan/noi-dung">
            <FileText size={16} />
            Bài đăng
          </Link>
          <Link to="/tai-khoan/da-luu">
            <Bookmark size={16} />
            Đã lưu
          </Link>
          <Link to="/tai-khoan/tin-nha-dat">
            <Home size={16} />
            Tin BĐS
          </Link>
          <Link to="/tai-khoan/thong-bao">
            <Bell size={16} />
            Thông báo
          </Link>
        </nav>

        <section className="account-overview-v2__section">
          <div className="account-overview-v2__section-heading">
            <div>
              <h3>Trạng thái tài khoản</h3>
              <p>Các trạng thái quan trọng nhất của tài khoản và hồ sơ.</p>
            </div>
            <Link to="/tai-khoan/ho-so" className="account-overview-v2__details-link">
              Xem chi tiết
              <ChevronRight size={15} />
            </Link>
          </div>

          <div className="account-overview-v2__highlight-grid">
            <article>
              <span><UserRound size={20} /></span>
              <div>
                <small>Hồ sơ hoàn thiện</small>
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
                <strong>{verified ? 'Đã xác thực' : 'Chưa hoàn tất'}</strong>
                <p>{verified ? 'Email đang được bảo vệ và xác thực.' : 'Nên xác thực email để tăng độ an toàn.'}</p>
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

            <article className="account-overview-v2__membership">
              <span><CalendarDays size={20} /></span>
              <div>
                <small>Thành viên từ</small>
                <strong>{membership.since}</strong>
                <p>{membership.age}</p>
              </div>
            </article>
          </div>

          <div className="account-overview-v2__community-cta">
            <div>
              <strong>Chia sẻ câu chuyện, đặt câu hỏi, kết nối với cộng đồng!</strong>
              <span>Mỗi bài viết của bạn giúp cộng đồng Hòa Lạc hữu ích và gần gũi hơn.</span>
            </div>
            <Link to="/cong-dong/create">
              Viết bài ngay
              <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        <section className="account-overview-v2__section account-overview-v2__account-info">
          <div className="account-overview-v2__section-heading">
            <div>
              <h3>Thông tin cá nhân</h3>
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
          <div className="account-overview-v2__quick-heading">
            <h3>Tính năng nhanh</h3>
            <p>Truy cập nhanh các khu vực quản lý tài khoản thường dùng.</p>
          </div>

          <Link to="/tai-khoan/ho-so">
            <UserRound size={19} />
            <span>
              <strong>Thông tin tài khoản</strong>
              <small>Cập nhật thông tin cá nhân và hồ sơ.</small>
            </span>
          </Link>
          <Link to="/tai-khoan/bao-mat">
            <ShieldCheck size={19} />
            <span>
              <strong>Bảo mật tài khoản</strong>
              <small>Mật khẩu, email và xác thực.</small>
            </span>
          </Link>
          <Link to="/tai-khoan/noi-dung">
            <Files size={19} />
            <span>
              <strong>Quản lý bài đăng</strong>
              <small>Bài viết, tin BĐS và việc làm của bạn.</small>
            </span>
          </Link>
          <Link to="/tai-khoan/tin-nha-dat">
            <Home size={19} />
            <span>
              <strong>Tin bất động sản</strong>
              <small>Quản lý các tin nhà đất bạn đã đăng.</small>
            </span>
          </Link>
          <Link to="/tai-khoan/da-luu">
            <Bookmark size={19} />
            <span>
              <strong>Tin đã lưu</strong>
              <small>Xem lại những nội dung bạn đã lưu.</small>
            </span>
          </Link>
          <Link to="/tai-khoan/hoat-dong">
            <Activity size={19} />
            <span>
              <strong>Nhật ký hoạt động</strong>
              <small>Lịch sử đăng nhập và hoạt động.</small>
            </span>
          </Link>
          <Link to="/tai-khoan/thong-bao">
            <Bell size={19} />
            <span>
              <strong>Cài đặt & thông báo</strong>
              <small>Quản lý thông báo và tùy chọn hiển thị.</small>
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
