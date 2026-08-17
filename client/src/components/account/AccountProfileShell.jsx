import { useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Camera,
  ChevronDown,
  FileText,
  ImagePlus,
  ListChecks,
  LoaderCircle,
  Lock,
  MonitorSmartphone,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { mediaApi } from '../../api/media.api';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { mediaUrl } from '../../utils/media';
import { initials } from '../../utils/formatters';

import './AccountProfileShell.css';

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const MAX_IMAGE_SIZE = 12 * 1024 * 1024;

const primaryLinks = [
  { to: '/tai-khoan', label: 'Tổng quan', icon: UserRound, end: true },
  { to: '/tai-khoan/ho-so', label: 'Hồ sơ cá nhân', icon: Pencil },
  { to: '/tai-khoan/bao-mat', label: 'Bảo mật', icon: Lock },
  { to: '/tai-khoan/phien-dang-nhap', label: 'Phiên đăng nhập', icon: MonitorSmartphone },
  { to: '/tai-khoan/thong-bao', label: 'Thông báo', icon: Bell },
];

const secondaryLinks = [
  { to: '/tai-khoan/bai-viet', label: 'Bài viết của tôi', icon: FileText },
  { to: '/tai-khoan/tin-nha-dat', label: 'Tin bất động sản', icon: ListChecks },
  { to: '/tai-khoan/da-luu', label: 'Nội dung đã lưu', icon: Bookmark },
  { to: '/tai-khoan/bao-cao', label: 'Báo cáo đã gửi', icon: ShieldCheck },
];

function getRoleLabel(user) {
  const rawRole = user?.roles?.[0];
  const role = typeof rawRole === 'string' ? rawRole : rawRole?.slug || rawRole?.name || '';

  const labels = {
    super_admin: 'Quản trị hệ thống',
    admin: 'Quản trị viên',
    editor: 'Biên tập viên',
    moderator: 'Kiểm duyệt viên',
    verified_member: 'Thành viên xác thực',
    member: 'Thành viên',
    user: 'Thành viên',
  };

  return labels[role] || 'Thành viên';
}

function getAreaName(profile) {
  if (!profile?.areaId) return '';
  if (typeof profile.areaId === 'object') return profile.areaId?.name || '';
  return profile?.areaName || '';
}

function ProfileImage({ src, name }) {
  const [failed, setFailed] = useState(false);
  const url = mediaUrl(src);

  if (!url || failed) {
    return <span className="account-shell-avatar__fallback">{initials(name)}</span>;
  }

  return (
    <img
      src={url}
      alt={name || 'Ảnh đại diện'}
      onError={() => setFailed(true)}
    />
  );
}

export default function AccountProfileShell({ profile, onProfileChange }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [uploadingField, setUploadingField] = useState('');

  const displayName =
    profile?.displayName || user?.displayName || user?.username || 'Thành viên Đô Thị Hòa Lạc';
  const username = user?.username || profile?.username || 'thanh-vien';
  const coverUrl = mediaUrl(profile?.coverMediaId);
  const roleLabel = getRoleLabel(user);
  const areaName = getAreaName(profile);
  const publicProfile = profile?.publicProfile !== false;

  const applyImage = async (field, file) => {
    if (!file) return;

    if (!allowedImageTypes.has(file.type)) {
      toast.error('Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc AVIF.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Ảnh không được vượt quá 12 MB.');
      return;
    }

    setUploadingField(field);

    try {
      const label =
        field === 'avatarMediaId'
          ? `Ảnh đại diện của ${displayName}`
          : `Ảnh bìa của ${displayName}`;
      const media = await mediaApi.uploadImage(file, label);

      if (!media?._id) {
        throw new Error('Server không trả về mã ảnh hợp lệ.');
      }

      const updatedProfile = await userApi.updateProfile({ [field]: media._id });

      onProfileChange?.((current) => ({
        ...(current || {}),
        ...(updatedProfile || {}),
        [field]: updatedProfile?.[field] || media,
      }));

      await refreshUser();
      toast.success(
        field === 'avatarMediaId'
          ? 'Đã cập nhật ảnh đại diện.'
          : 'Đã cập nhật ảnh bìa.',
      );
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể cập nhật hình ảnh.'));
    } finally {
      setUploadingField('');
    }
  };

  const handleInput = (field, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    applyImage(field, file);
  };

  return (
    <section className="account-shell-profile" aria-label="Hồ sơ tài khoản">
      <div className="account-shell-cover">
        {coverUrl ? (
          <img src={coverUrl} alt="Ảnh bìa hồ sơ" />
        ) : (
          <div className="account-shell-cover__fallback" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}

        <button
          type="button"
          className="account-shell-cover__edit"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingField === 'coverMediaId'}
        >
          {uploadingField === 'coverMediaId' ? (
            <LoaderCircle className="is-spinning" size={17} />
          ) : (
            <ImagePlus size={17} />
          )}
          <span>Ảnh bìa</span>
        </button>

        <input
          ref={coverInputRef}
          className="visually-hidden"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
          onChange={(event) => handleInput('coverMediaId', event)}
        />
      </div>

      <div className="account-shell-profile__body">
        <div className="account-shell-avatar-wrap">
          <button
            type="button"
            className="account-shell-avatar"
            aria-label="Thay ảnh đại diện"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingField === 'avatarMediaId'}
          >
            <ProfileImage src={profile?.avatarMediaId} name={displayName} />
            {uploadingField === 'avatarMediaId' ? (
              <span className="account-shell-avatar__loading">
                <LoaderCircle className="is-spinning" size={24} />
              </span>
            ) : null}
          </button>

          <span className="account-shell-avatar__camera" aria-hidden="true">
            <Camera size={16} />
          </span>

          <input
            ref={avatarInputRef}
            className="visually-hidden"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => handleInput('avatarMediaId', event)}
          />
        </div>

        <div className="account-shell-identity">
          <div className="account-shell-identity__title">
            <h1>{displayName}</h1>
            {user?.emailVerifiedAt ? (
              <span title="Tài khoản đã xác thực">
                <ShieldCheck size={18} />
              </span>
            ) : null}
          </div>
          <p>@{username}</p>
          <div className="account-shell-identity__meta">
            <span>{roleLabel}</span>
            {areaName ? <span>{areaName}</span> : null}
            <span>{publicProfile ? 'Hồ sơ công khai' : 'Hồ sơ riêng tư'}</span>
          </div>
        </div>

        <div className="account-shell-profile__actions">
          <Link className="account-shell-button account-shell-button--ghost" to="/tai-khoan/ho-so">
            <Pencil size={17} />
            <span>Chỉnh sửa hồ sơ</span>
          </Link>
          <Link className="account-shell-button account-shell-button--primary" to="/dang-bai">
            <Plus size={18} />
            <span>Bài đăng mới</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function AccountSidebarNav({ profile }) {
  const { user } = useAuth();
  const displayName = profile?.displayName || user?.displayName || user?.username || 'Thành viên';
  const avatar = profile?.avatarMediaId || user?.profile?.avatarMediaId;

  return (
    <aside className="account-shell-sidebar">
      <div className="account-shell-sidebar__intro">
        <span className="account-shell-sidebar__mini-avatar">
          <ProfileImage src={avatar} name={displayName} />
        </span>
        <div>
          <small>Xin chào,</small>
          <strong>{displayName}</strong>
        </div>
      </div>

      <nav className="account-shell-nav" aria-label="Điều hướng tài khoản">
        {primaryLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'is-active' : '')}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}

        <details className="account-shell-nav__more">
          <summary>
            <span>
              <ChevronDown size={18} />
              Xem thêm
            </span>
            <ChevronDown className="account-shell-nav__chevron" size={17} />
          </summary>

          <div>
            {secondaryLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? 'is-active' : '')}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </details>
      </nav>
    </aside>
  );
}
