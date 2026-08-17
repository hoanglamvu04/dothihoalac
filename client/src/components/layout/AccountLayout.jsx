import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Outlet } from 'react-router-dom';
import { RefreshCw, TriangleAlert } from 'lucide-react';

import Seo from '../common/Seo';
import AccountProfileShell, {
  AccountSidebarNav,
} from '../account/AccountProfileShell';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';

import './AccountLayout.css';

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

export default function AccountLayout() {
  const { user } = useAuth();

  const [accountProfile, setAccountProfile] =
    useState(() => buildProfile(user, user?.profile));
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

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
    <main className="account-center-page">
      <Seo
        title="Trung tâm tài khoản"
        description="Quản lý hồ sơ, bảo mật, thông báo và nội dung của bạn."
      />

      <div className="account-center-container">
        <AccountProfileShell
          profile={accountProfile}
          onProfileChange={setAccountProfile}
        />

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
          <AccountSidebarNav profile={accountProfile} />

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
    </main>
  );
}
