import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
} from 'react-router-dom';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Home,
  Newspaper,
  RefreshCw,
  TriangleAlert,
  UserRound,
  UsersRound,
} from 'lucide-react';

import Seo from '../common/Seo';
import AccountProfileShell from '../account/AccountProfileShell';
import AccountContentNav from '../account/AccountContentNav';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';

import './AccountLayout.css';
import './AccountMobile.css';
import './AccountDesktopReference.css';

const MOBILE_TITLES = [
  ['/tai-khoan/ho-so', 'Thông tin tài khoản'],
  ['/tai-khoan/bao-mat', 'Bảo mật tài khoản'],
  ['/tai-khoan/phien-dang-nhap', 'Thiết bị đăng nhập'],
  ['/tai-khoan/thong-bao', 'Thông báo'],
  ['/tai-khoan/hoat-dong', 'Nhật ký hoạt động'],
  ['/tai-khoan/noi-dung', 'Bài đăng của tôi'],
  ['/tai-khoan/bai-viet', 'Bài đăng của tôi'],
  ['/tai-khoan/tin-nha-dat', 'Tin bất động sản'],
  ['/tai-khoan/da-luu', 'Tin đã lưu'],
  ['/tai-khoan/bao-cao', 'Báo cáo đã gửi'],
];

const MOBILE_DOCK = [
  { to: '/', label: 'Trang chủ', icon: Home, end: true },
  { to: '/viec-lam', label: 'Việc làm', icon: BriefcaseBusiness },
  { to: '/cong-dong', label: 'Cộng đồng', icon: UsersRound },
  { to: '/tin-tuc', label: 'Tin tức', icon: Newspaper },
  { to: '/tai-khoan', label: 'Tài khoản', icon: UserRound },
];

function mobileTitle(pathname) {
  const match = MOBILE_TITLES.find(([path]) => pathname.startsWith(path));
  return match?.[1] || 'Tài khoản';
}

function buildProfile(user, profile) {
  return {
    displayName:
      profile?.displayName ||
      user?.displayName ||
      '',
    fullName: profile?.fullName || '',
    bio: profile?.bio || '',
    occupation: profile?.occupation || '',
    areaId: profile?.areaId || null,
    website: profile?.website || '',
    publicProfile:
      profile?.publicProfile !== false,
    avatarMediaId:
      profile?.avatarMediaId ||
      user?.profile?.avatarMediaId ||
      null,
    coverMediaId:
      profile?.coverMediaId ||
      user?.profile?.coverMediaId ||
      null,
  };
}

export default function AccountLayoutImpl() {
  const { user } = useAuth();
  const location = useLocation();

  const [accountProfile, setAccountProfile] =
    useState(() => buildProfile(user, user?.profile));
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isOverview = normalizedPath === '/tai-khoan';
  const currentMobileTitle = mobileTitle(normalizedPath);

  const reloadAccountProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError('');

    try {
      const profile = await userApi.myProfile();
      const nextProfile = buildProfile(user, profile);
      setAccountProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      const fallbackProfile = buildProfile(user, user?.profile);
      setAccountProfile(fallbackProfile);
      setProfileError(
        apiErrorMessage(
          error,
          'Không thể tải đầy đủ thông tin hồ sơ.',
        ),
      );
      return fallbackProfile;
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reloadAccountProfile();
  }, [reloadAccountProfile]);

  return (
    <main
      className={[
        'account-center-page',
        isOverview ? 'is-overview' : 'is-subpage',
      ].join(' ')}
    >
      <Seo
        title="Trung tâm tài khoản"
        description="Quản lý hồ sơ, bảo mật, thông báo, hoạt động và nội dung của bạn."
      />

      <div className="account-center-container">
        {!isOverview ? (
          <header className="account-mobile-header">
            <NavLink to="/tai-khoan" aria-label="Quay về tài khoản">
              <ArrowLeft size={19} />
            </NavLink>
            <strong>{currentMobileTitle}</strong>
            <span aria-hidden="true" />
          </header>
        ) : null}

        {isOverview ? (
          <AccountProfileShell
            profile={accountProfile}
            onProfileChange={setAccountProfile}
          />
        ) : null}

        {profileError ? (
          <div className="account-center-warning" role="status">
            <TriangleAlert size={18} />
            <span>{profileError}</span>
            <button type="button" onClick={reloadAccountProfile}>
              <RefreshCw size={16} />
              Tải lại
            </button>
          </div>
        ) : null}

        <div className="account-center-workspace">
          <AccountContentNav profile={accountProfile} />

          <section
            className="account-center-content"
            aria-busy={profileLoading}
          >
            <Outlet
              context={{
                accountProfile,
                setAccountProfile,
                reloadAccountProfile,
                profileLoading,
              }}
            />
          </section>
        </div>
      </div>

      <nav className="account-mobile-dock" aria-label="Điều hướng nhanh trên di động">
        {MOBILE_DOCK.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'is-active' : '')}
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </main>
  );
}
