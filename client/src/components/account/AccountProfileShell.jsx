import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Camera,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  ListChecks,
  LoaderCircle,
  Lock,
  MonitorSmartphone,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
  X,
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

  useEffect(() => {
    setFailed(false);
  }, [url]);

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
  const avatarMenuRef = useRef(null);
  const coverMenuRef = useRef(null);

  const [uploadingField, setUploadingField] = useState('');
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [viewerType, setViewerType] = useState('');

  const displayName =
    profile?.displayName || user?.displayName || user?.username || 'Thành viên Đô Thị Hòa Lạc';
  const username = user?.username || profile?.username || 'thanh-vien';
  const avatarUrl = mediaUrl(profile?.avatarMediaId);
  const coverUrl = mediaUrl(profile?.coverMediaId);
  const roleLabel = getRoleLabel(user);
  const areaName = getAreaName(profile);
  const publicProfile = profile?.publicProfile !== false;

  const viewerUrl = viewerType === 'cover' ? coverUrl : avatarUrl;
  const viewerLabel = viewerType === 'cover' ? 'Ảnh bìa' : 'Ảnh đại diện';

  useEffect(() => {
    const handleOutside = (event) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target)
      ) {
        setAvatarMenuOpen(false);
      }

      if (
        coverMenuRef.current &&
        !coverMenuRef.current.contains(event.target)
      ) {
        setCoverMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      setAvatarMenuOpen(false);
      setCoverMenuOpen(false);
      setViewerType('');
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!viewerType) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [viewerType]);

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
    setAvatarMenuOpen(false);
    setCoverMenuOpen(false);
    applyImage(field, file);
  };

  const openViewer = (type) => {
    const url = type === 'cover' ? coverUrl : avatarUrl;

    if (!url) {
      toast.error(type === 'cover' ? 'Chưa có ảnh bìa để xem.' : 'Chưa có ảnh đại diện để xem.');
      return;
    }

    setAvatarMenuOpen(false);
    setCoverMenuOpen(false);
    setViewerType(type);
  };

  const chooseImage = (field) => {
    setAvatarMenuOpen(false);
    setCoverMenuOpen(false);
    setViewerType('');

    if (field === 'coverMediaId') {
      coverInputRef.current?.click();
    } else {
      avatarInputRef.current?.click();
    }
  };

  return (
    <>
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

          <div className="account-shell-cover-actions" ref={coverMenuRef}>
            <button
              type="button"
              className="account-shell-cover__edit"
              aria-label="Mở tùy chọn ảnh bìa"
              aria-expanded={coverMenuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setCoverMenuOpen((current) => !current);
                setAvatarMenuOpen(false);
              }}
              disabled={uploadingField === 'coverMediaId'}
            >
              {uploadingField === 'coverMediaId' ? (
                <LoaderCircle className="is-spinning" size={17} />
              ) : (
                <ImagePlus size={17} />
              )}
              <span>Ảnh bìa</span>
              <ChevronDown size={15} />
            </button>

            {coverMenuOpen ? (
              <div className="account-shell-image-menu account-shell-image-menu--cover" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openViewer('cover')}
                  disabled={!coverUrl}
                >
                  <ImageIcon size={18} />
                  <span>
                    <strong>Xem ảnh bìa</strong>
                    <small>Xem đầy đủ ảnh gốc</small>
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => chooseImage('coverMediaId')}
                >
                  <Camera size={18} />
                  <span>
                    <strong>{coverUrl ? 'Thay ảnh bìa' : 'Thêm ảnh bìa'}</strong>
                    <small>Chọn ảnh mới từ máy</small>
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          <input
            ref={coverInputRef}
            className="visually-hidden"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => handleInput('coverMediaId', event)}
          />
        </div>

        <div className="account-shell-profile__body">
          <div className="account-shell-avatar-wrap" ref={avatarMenuRef}>
            <button
              type="button"
              className="account-shell-avatar"
              aria-label="Mở tùy chọn ảnh đại diện"
              aria-expanded={avatarMenuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setAvatarMenuOpen((current) => !current);
                setCoverMenuOpen(false);
              }}
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

            {avatarMenuOpen ? (
              <div className="account-shell-image-menu account-shell-image-menu--avatar" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openViewer('avatar')}
                  disabled={!avatarUrl}
                >
                  <ImageIcon size={18} />
                  <span>
                    <strong>Xem ảnh đại diện</strong>
                    <small>Mở ảnh với kích thước lớn</small>
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => chooseImage('avatarMediaId')}
                >
                  <Camera size={18} />
                  <span>
                    <strong>{avatarUrl ? 'Thay ảnh đại diện' : 'Thêm ảnh đại diện'}</strong>
                    <small>Chọn ảnh mới từ máy</small>
                  </span>
                </button>
              </div>
            ) : null}

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

      {viewerType && viewerUrl ? (
        <div
          className="account-shell-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={viewerLabel}
          onMouseDown={() => setViewerType('')}
        >
          <div
            className="account-shell-viewer__panel"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="account-shell-viewer__header">
              <div>
                <strong>{viewerLabel}</strong>
                <small>Ảnh gốc được hiển thị đầy đủ, không cắt khung.</small>
              </div>

              <button
                type="button"
                aria-label="Đóng xem ảnh"
                onClick={() => setViewerType('')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="account-shell-viewer__image">
              <img src={viewerUrl} alt={viewerLabel} />
            </div>

            <div className="account-shell-viewer__footer">
              <button
                type="button"
                className="account-shell-button account-shell-button--ghost"
                onClick={() => setViewerType('')}
              >
                Đóng
              </button>

              <button
                type="button"
                className="account-shell-button account-shell-button--primary"
                onClick={() =>
                  chooseImage(viewerType === 'cover' ? 'coverMediaId' : 'avatarMediaId')
                }
              >
                <Camera size={17} />
                Thay ảnh
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
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
