import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  Clipboard,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  ListChecks,
  LoaderCircle,
  Lock,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  MonitorSmartphone,
  Pencil,
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

import './AccountProfileHeader.css';

const mainTabs = [
  {
    to: '/tai-khoan',
    label: 'Tổng quan',
    icon: UserRound,
    end: true,
  },
  {
    to: '/tai-khoan/ho-so',
    label: 'Hồ sơ cá nhân',
    icon: Pencil,
  },
  {
    to: '/tai-khoan/bao-mat',
    label: 'Bảo mật',
    icon: Lock,
  },
  {
    to: '/tai-khoan/phien-dang-nhap',
    label: 'Phiên đăng nhập',
    icon: MonitorSmartphone,
  },
  {
    to: '/tai-khoan/thong-bao',
    label: 'Thông báo',
    icon: Bell,
  },
];

const secondaryTabs = [
  {
    to: '/tai-khoan/bai-viet',
    label: 'Bài viết của tôi',
    icon: FileText,
  },
  {
    to: '/tai-khoan/tin-nha-dat',
    label: 'Tin bất động sản',
    icon: ListChecks,
  },
  {
    to: '/tai-khoan/da-luu',
    label: 'Nội dung đã lưu',
    icon: Bookmark,
  },
  {
    to: '/tai-khoan/bao-cao',
    label: 'Báo cáo đã gửi',
    icon: ShieldCheck,
  },
];

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const MAX_IMAGE_SIZE = 12 * 1024 * 1024;

function getRoleLabel(user) {
  const rawRole = user?.roles?.[0];
  const role =
    typeof rawRole === 'string'
      ? rawRole
      : rawRole?.slug || rawRole?.name || '';

  const labels = {
    super_admin: 'Quản trị hệ thống',
    admin: 'Quản trị viên',
    editor: 'Biên tập viên',
    moderator: 'Kiểm duyệt viên',
    member: 'Thành viên',
    user: 'Thành viên',
  };

  return labels[role] || 'Thành viên';
}

function getAreaName(profile) {
  if (typeof profile?.areaId === 'object') {
    return profile.areaId?.name || '';
  }

  return profile?.areaName || '';
}

export default function AccountProfileHeader({
  profile,
  onProfileChange,
}) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const avatarMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const moreNavRef = useRef(null);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [moreNavOpen, setMoreNavOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerType, setViewerType] = useState('avatar');
  const [viewerMode, setViewerMode] = useState('fit');
  const [viewerNaturalSize, setViewerNaturalSize] = useState({
    width: 0,
    height: 0,
  });
  const [uploadingField, setUploadingField] = useState('');
  const [privacySaving, setPrivacySaving] = useState(false);

  const displayName =
    profile?.displayName ||
    user?.displayName ||
    user?.username ||
    'Thành viên Đô Thị Hòa Lạc';

  const username = user?.username || profile?.username || 'thanh-vien';
  const avatarUrl = mediaUrl(profile?.avatarMediaId);
  const coverUrl = mediaUrl(profile?.coverMediaId);
  const areaName = getAreaName(profile);
  const occupation = profile?.occupation || getRoleLabel(user);
  const publicProfile = profile?.publicProfile !== false;

  const publicProfilePath = `/thanh-vien/${encodeURIComponent(username)}`;

  const secondaryActive = useMemo(
    () =>
      secondaryTabs.some((item) =>
        location.pathname.startsWith(item.to),
      ),
    [location.pathname],
  );

  useEffect(() => {
    const handleOutside = (event) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target)
      ) {
        setAvatarMenuOpen(false);
      }

      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target)
      ) {
        setActionsMenuOpen(false);
      }

      if (
        moreNavRef.current &&
        !moreNavRef.current.contains(event.target)
      ) {
        setMoreNavOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      setAvatarMenuOpen(false);
      setActionsMenuOpen(false);
      setMoreNavOpen(false);
      setViewerOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setAvatarMenuOpen(false);
    setActionsMenuOpen(false);
    setMoreNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!viewerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [viewerOpen]);

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

      await userApi.updateProfile({
        [field]: media._id,
      });

      onProfileChange?.((current) => ({
        ...(current || {}),
        [field]: media,
      }));

      await refreshUser();

      toast.success(
        field === 'avatarMediaId'
          ? 'Đã cập nhật ảnh đại diện.'
          : 'Đã cập nhật ảnh bìa.',
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Không thể cập nhật hình ảnh.'),
      );
    } finally {
      setUploadingField('');
    }
  };

  const handleFileInput = (field, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setAvatarMenuOpen(false);
    applyImage(field, file);
  };

  const openViewer = (type) => {
    const url = type === 'avatar' ? avatarUrl : coverUrl;

    if (!url) {
      toast.error('Chưa có hình ảnh để xem.');
      return;
    }

    setViewerType(type);
    setViewerMode('fit');
    setViewerNaturalSize({ width: 0, height: 0 });
    setViewerOpen(true);
    setAvatarMenuOpen(false);
  };

  const togglePrivacy = async () => {
    if (privacySaving) return;

    const nextValue = !publicProfile;
    setPrivacySaving(true);

    try {
      await userApi.updateProfile({
        publicProfile: nextValue,
      });

      onProfileChange?.((current) => ({
        ...(current || {}),
        publicProfile: nextValue,
      }));

      toast.success(
        nextValue
          ? 'Hồ sơ đã chuyển sang công khai.'
          : 'Hồ sơ đã chuyển sang riêng tư.',
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Không thể thay đổi quyền riêng tư.'),
      );
    } finally {
      setPrivacySaving(false);
    }
  };

  const viewAsPublic = () => {
    setActionsMenuOpen(false);
    window.open(publicProfilePath, '_blank', 'noopener,noreferrer');
  };

  const copyProfileLink = async () => {
    const url = `${window.location.origin}${publicProfilePath}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Đã sao chép liên kết hồ sơ.');
    } catch {
      const temporaryInput = document.createElement('textarea');
      temporaryInput.value = url;
      temporaryInput.style.position = 'fixed';
      temporaryInput.style.opacity = '0';
      document.body.appendChild(temporaryInput);
      temporaryInput.select();
      document.execCommand('copy');
      temporaryInput.remove();
      toast.success('Đã sao chép liên kết hồ sơ.');
    }

    setActionsMenuOpen(false);
  };

  return (
    <section className="account-profile-header">
      <div className="account-profile-cover">
        {coverUrl ? (
          <img src={coverUrl} alt="Ảnh bìa hồ sơ" />
        ) : (
          <div className="account-profile-cover__fallback" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}

        <div className="account-profile-cover__shade" />

        <button
          type="button"
          className="account-profile-cover__button"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingField === 'coverMediaId'}
        >
          {uploadingField === 'coverMediaId' ? (
            <LoaderCircle className="is-spinning" size={18} />
          ) : (
            <Camera size={18} />
          )}
          <span>
            {uploadingField === 'coverMediaId'
              ? 'Đang tải ảnh...'
              : 'Chỉnh sửa ảnh bìa'}
          </span>
        </button>

        <input
          ref={coverInputRef}
          className="visually-hidden"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
          onChange={(event) => handleFileInput('coverMediaId', event)}
        />
      </div>

      <div className="account-profile-identity">
        <div className="account-profile-avatar-wrap" ref={avatarMenuRef}>
          <button
            type="button"
            className="account-profile-avatar"
            aria-label="Mở tùy chọn ảnh đại diện"
            aria-expanded={avatarMenuOpen}
            onClick={() => {
              setAvatarMenuOpen((current) => !current);
              setActionsMenuOpen(false);
              setMoreNavOpen(false);
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span>{initials(displayName)}</span>
            )}

            {uploadingField === 'avatarMediaId' ? (
              <span className="account-profile-avatar__loading">
                <LoaderCircle className="is-spinning" size={25} />
              </span>
            ) : null}
          </button>

          <span className="account-profile-avatar__camera" aria-hidden="true">
            <Camera size={18} />
          </span>

          {avatarMenuOpen ? (
            <div className="account-profile-avatar-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => openViewer('avatar')}
                disabled={!avatarUrl}
              >
                <ImageIcon size={19} />
                <span>
                  <strong>Xem ảnh đại diện</strong>
                  <small>Mở ảnh với kích thước lớn</small>
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera size={19} />
                <span>
                  <strong>Thay ảnh đại diện</strong>
                  <small>Chọn một ảnh mới từ máy</small>
                </span>
              </button>
            </div>
          ) : null}

          <input
            ref={avatarInputRef}
            className="visually-hidden"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => handleFileInput('avatarMediaId', event)}
          />
        </div>

        <div className="account-profile-name">
          <div className="account-profile-name__title">
            <h1>{displayName}</h1>

            {user?.emailVerifiedAt ? (
              <span title="Email đã xác thực">
                <ShieldCheck size={18} />
              </span>
            ) : null}
          </div>

          <p>@{username}</p>

          <div className="account-profile-meta">
            <span>{occupation}</span>
            {areaName ? <span>{areaName}</span> : null}
            <span className={publicProfile ? 'is-public' : 'is-private'}>
              {publicProfile ? <Eye size={14} /> : <EyeOff size={14} />}
              {publicProfile ? 'Hồ sơ công khai' : 'Hồ sơ riêng tư'}
            </span>
          </div>
        </div>

        <div className="account-profile-identity__actions">
          <button
            type="button"
            className="account-profile-action account-profile-action--secondary"
            onClick={() => navigate('/tai-khoan/ho-so')}
          >
            <Pencil size={17} />
            Chỉnh sửa hồ sơ
          </button>
        </div>
      </div>

      <div className="account-profile-navigation">
        <nav aria-label="Điều hướng tài khoản">
          {mainTabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? 'is-active' : undefined
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="account-profile-navigation__more" ref={moreNavRef}>
            <button
              type="button"
              className={secondaryActive ? 'is-active' : ''}
              aria-expanded={moreNavOpen}
              onClick={() => {
                setMoreNavOpen((current) => !current);
                setActionsMenuOpen(false);
                setAvatarMenuOpen(false);
              }}
            >
              <span>Xem thêm</span>
              <ChevronDown size={15} />
            </button>

            {moreNavOpen ? (
              <div className="account-profile-navigation__more-menu">
                {secondaryTabs.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      isActive ? 'is-active' : undefined
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="account-profile-options" ref={actionsMenuRef}>
          <button
            type="button"
            className="account-profile-options__trigger"
            aria-label="Tùy chọn hồ sơ"
            aria-expanded={actionsMenuOpen}
            onClick={() => {
              setActionsMenuOpen((current) => !current);
              setAvatarMenuOpen(false);
              setMoreNavOpen(false);
            }}
          >
            <MoreHorizontal size={22} />
          </button>

          {actionsMenuOpen ? (
            <div className="account-profile-options__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={togglePrivacy}
                disabled={privacySaving}
              >
                <span className="account-profile-options__icon">
                  {privacySaving ? (
                    <LoaderCircle className="is-spinning" size={19} />
                  ) : publicProfile ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </span>

                <span>
                  <strong>
                    {publicProfile
                      ? 'Chuyển hồ sơ sang riêng tư'
                      : 'Chuyển hồ sơ sang công khai'}
                  </strong>
                  <small>
                    Hiện tại: {publicProfile ? 'Công khai' : 'Riêng tư'}
                  </small>
                </span>

                <Check
                  size={16}
                  className={publicProfile ? 'is-visible' : ''}
                />
              </button>

              <button type="button" role="menuitem" onClick={viewAsPublic}>
                <span className="account-profile-options__icon">
                  <Eye size={19} />
                </span>

                <span>
                  <strong>Xem với tư cách người khác</strong>
                  <small>Mở góc nhìn công khai của hồ sơ</small>
                </span>
              </button>

              <button type="button" role="menuitem" onClick={copyProfileLink}>
                <span className="account-profile-options__icon">
                  <Clipboard size={19} />
                </span>

                <span>
                  <strong>Sao chép liên kết hồ sơ</strong>
                  <small>Chia sẻ trang cá nhân của bạn</small>
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {viewerOpen ? (
        <div
          className="account-profile-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={viewerType === 'avatar' ? 'Ảnh đại diện' : 'Ảnh bìa'}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewerOpen(false);
            }
          }}
        >
          <div className="account-profile-viewer__toolbar">
            <div>
              <strong>
                {viewerType === 'avatar' ? 'Ảnh đại diện' : 'Ảnh bìa'}
              </strong>
              <span>
                {viewerNaturalSize.width > 0
                  ? `${viewerNaturalSize.width} × ${viewerNaturalSize.height} px`
                  : 'Đang đọc kích thước ảnh...'}
              </span>
            </div>

            <div className="account-profile-viewer__tools">
              <button
                type="button"
                className={viewerMode === 'fit' ? 'is-active' : ''}
                onClick={() => setViewerMode('fit')}
              >
                <Minimize2 size={18} />
                <span>Vừa màn hình</span>
              </button>

              <button
                type="button"
                className={viewerMode === 'original' ? 'is-active' : ''}
                onClick={() => setViewerMode('original')}
              >
                <Maximize2 size={18} />
                <span>Kích thước gốc</span>
              </button>

              <button
                type="button"
                className="account-profile-viewer__close"
                aria-label="Đóng ảnh"
                onClick={() => setViewerOpen(false)}
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div
            className={`account-profile-viewer__stage ${
              viewerMode === 'original' ? 'is-original-mode' : ''
            }`}
          >
            <img
              className={
                viewerMode === 'original'
                  ? 'is-original-size'
                  : 'is-fit-screen'
              }
              src={viewerType === 'avatar' ? avatarUrl : coverUrl}
              alt={viewerType === 'avatar' ? displayName : 'Ảnh bìa hồ sơ'}
              draggable="false"
              onLoad={(event) => {
                setViewerNaturalSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
