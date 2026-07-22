import { Link, useOutletContext } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  FileText,
  Home,
  MapPin,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import { useAuth } from '../../context/AuthContext';

import './AccountPages.css';

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

  return (
    <div className="account-page-view">
      <Seo title="Tổng quan tài khoản" />

      <div className="account-page-heading">
        <div>
          <span className="account-page-heading__eyebrow">
            <UserRound size={15} />
            Trung tâm tài khoản
          </span>
          <h2>Xin chào, {user?.displayName || user?.username}</h2>
          <p>
            Theo dõi trạng thái hồ sơ, xác thực tài khoản và truy cập nhanh các công cụ thường dùng.
          </p>
        </div>

        <Link className="account-page-button account-page-button--primary" to="/tai-khoan/ho-so">
          Chỉnh sửa hồ sơ
        </Link>
      </div>

      <div className="account-stat-grid">
        <article className="account-stat-card">
          <span><UserRound size={22} /></span>
          <div>
            <strong>{completion}%</strong>
            <small>Mức hoàn thiện hồ sơ</small>
          </div>
        </article>

        <article className="account-stat-card">
          <span><ShieldCheck size={22} /></span>
          <div>
            <strong>{user?.emailVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực'}</strong>
            <small>Trạng thái email</small>
          </div>
        </article>

        <article className="account-stat-card">
          <span><CheckCircle2 size={22} /></span>
          <div>
            <strong>{accountProfile?.publicProfile !== false ? 'Công khai' : 'Riêng tư'}</strong>
            <small>Chế độ hồ sơ</small>
          </div>
        </article>

        <article className="account-stat-card">
          <span><MapPin size={22} /></span>
          <div>
            <strong>
              {typeof accountProfile?.areaId === 'object'
                ? accountProfile.areaId?.name || 'Chưa chọn'
                : 'Chưa chọn'}
            </strong>
            <small>Khu vực quan tâm</small>
          </div>
        </article>
      </div>

      <section className="account-page-card">
        <div className="account-page-card__header">
          <div>
            <h3>Truy cập nhanh</h3>
            <p>Các thao tác thường dùng trên Đô Thị Hòa Lạc.</p>
          </div>
        </div>

        <div className="account-quick-grid">
          <Link to="/dang-bai/cong-dong">
            <span><FileText size={22} /></span>
            <strong>Đăng bài cộng đồng</strong>
            <small>Chia sẻ thông tin, hỏi đáp hoặc thảo luận với cư dân.</small>
          </Link>

          <Link to="/dang-bai/nha-dat">
            <span><Home size={22} /></span>
            <strong>Đăng tin nhà đất</strong>
            <small>Tạo và quản lý tin bất động sản trong khu vực Hòa Lạc.</small>
          </Link>

          <Link to="/tai-khoan/thong-bao">
            <span><Bell size={22} /></span>
            <strong>Xem thông báo</strong>
            <small>Theo dõi kiểm duyệt, bình luận và các cập nhật tài khoản.</small>
          </Link>
        </div>
      </section>

      {!user?.emailVerifiedAt || !user?.phoneVerifiedAt ? (
        <section className="account-page-card">
          <div className="account-page-card__header">
            <div>
              <h3>Hoàn thiện xác thực tài khoản</h3>
              <p>Xác thực giúp bảo vệ tài khoản và mở khóa đầy đủ các chức năng.</p>
            </div>
          </div>

          <div className="account-verification-grid">
            <article className="account-verification-card">
              <span className="account-verification-card__icon">
                <ShieldCheck size={21} />
              </span>
              <div>
                <strong>Email</strong>
                <small>{user?.email || 'Chưa cập nhật'}</small>
              </div>
              {user?.emailVerifiedAt ? (
                <span className="account-verification-status is-verified">Đã xác thực</span>
              ) : (
                <Link className="account-page-button account-page-button--soft" to="/xac-thuc-email">
                  Xác thực
                </Link>
              )}
            </article>

            <article className="account-verification-card">
              <span className="account-verification-card__icon">
                <ShieldCheck size={21} />
              </span>
              <div>
                <strong>Số điện thoại</strong>
                <small>{user?.phone || 'Chưa cập nhật'}</small>
              </div>
              {user?.phoneVerifiedAt ? (
                <span className="account-verification-status is-verified">Đã xác thực</span>
              ) : (
                <Link className="account-page-button account-page-button--soft" to="/xac-thuc-so-dien-thoai">
                  Xác thực
                </Link>
              )}
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
