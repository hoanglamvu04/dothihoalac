import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useBlocker,
  useOutletContext,
} from 'react-router-dom';
import {
  AtSign,
  BriefcaseBusiness,
  Check,
  Eye,
  EyeOff,
  Globe2,
  Info,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';

import './ProfileSettingsPage.css';

const USERNAME_PATTERN =
  /^[a-z0-9](?:[a-z0-9._]{2,28}[a-z0-9])$/;

const EMPTY_FORM = {
  displayName: '',
  fullName: '',
  username: '',
  occupation: '',
  areaId: '',
  website: '',
  bio: '',
};

function getAreaId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
}

function normalizeUsername(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/[._]{2,}/g, '.')
    .replace(/^[._]+/, '')
    .slice(0, 30);
}

function normalizeWebsite(value) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

function isValidWebsite(value) {
  if (!String(value || '').trim()) return true;

  try {
    const url = new URL(normalizeWebsite(value));
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function serializeForm(form) {
  return JSON.stringify({
    displayName: form.displayName.trim(),
    fullName: form.fullName.trim(),
    username: form.username.trim(),
    occupation: form.occupation.trim(),
    areaId: form.areaId || '',
    website: form.website.trim(),
    bio: form.bio.trim(),
  });
}

function extractFieldErrors(error) {
  const issues = error?.response?.data?.errors;
  if (!issues) return {};

  if (!Array.isArray(issues) && typeof issues === 'object') {
    return Object.fromEntries(
      Object.entries(issues).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : value?.message || '',
      ]),
    );
  }

  if (Array.isArray(issues)) {
    return issues.reduce((result, issue) => {
      const key = String(issue?.path || '').split('.').pop();
      if (key && issue?.message) result[key] = issue.message;
      return result;
    }, {});
  }

  return {};
}

function createForm(profile, user) {
  return {
    ...EMPTY_FORM,
    displayName: profile?.displayName || user?.displayName || '',
    fullName: profile?.fullName || '',
    username: user?.username || profile?.username || '',
    occupation: profile?.occupation || '',
    areaId: getAreaId(profile?.areaId),
    website: profile?.website || '',
    bio: profile?.bio || '',
  };
}

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { areas = [] } = useTaxonomy();
  const toast = useToast();

  const {
    accountProfile,
    setAccountProfile,
    reloadAccountProfile,
  } = useOutletContext();

  const [form, setForm] = useState(() =>
    createForm(accountProfile, user),
  );
  const [snapshot, setSnapshot] = useState(() =>
    serializeForm(createForm(accountProfile, user)),
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState({});

  const sortedAreas = useMemo(
    () =>
      [...areas].sort((first, second) =>
        String(first?.name || '').localeCompare(
          String(second?.name || ''),
          'vi',
        ),
      ),
    [areas],
  );

  const selectedArea = useMemo(
    () =>
      sortedAreas.find(
        (area) => String(area._id || area.id) === String(form.areaId),
      ),
    [form.areaId, sortedAreas],
  );

  const changed = serializeForm(form) !== snapshot;

  const shouldBlockNavigation = useCallback(
    ({ currentLocation, nextLocation }) => {
      if (!changed || saving) return false;

      const currentUrl = `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}`;
      const nextUrl = `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`;

      return currentUrl !== nextUrl;
    },
    [changed, saving],
  );

  const navigationBlocker = useBlocker(shouldBlockNavigation);
  const bioLength = form.bio.length;
  const publicProfile = accountProfile?.publicProfile !== false;
  const publicProfilePath = `/thanh-vien/${encodeURIComponent(
    form.username || user?.username || '',
  )}`;

  useEffect(() => {
    if (changed) return;

    const nextForm = createForm(accountProfile, user);
    setForm(nextForm);
    setSnapshot(serializeForm(nextForm));
  }, [accountProfile, user?.displayName, user?.username]);

  useEffect(() => {
    if (!changed) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [changed]);

  useEffect(() => {
    if (!changed && navigationBlocker.state === 'blocked') {
      navigationBlocker.proceed();
    }
  }, [changed, navigationBlocker]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setFormError('');
  };

  const validate = () => {
    const nextErrors = {};
    const displayName = form.displayName.trim();
    const username = form.username.trim();

    if (!displayName) {
      nextErrors.displayName = 'Vui lòng nhập tên hiển thị.';
    } else if (displayName.length < 2) {
      nextErrors.displayName = 'Tên hiển thị phải có ít nhất 2 ký tự.';
    } else if (displayName.length > 80) {
      nextErrors.displayName = 'Tên hiển thị không được vượt quá 80 ký tự.';
    }

    if (!username) {
      nextErrors.username = 'Vui lòng nhập tên người dùng.';
    } else if (!USERNAME_PATTERN.test(username)) {
      nextErrors.username =
        'Tên người dùng cần có 4–30 ký tự, chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới.';
    }

    if (form.fullName.trim().length > 120) {
      nextErrors.fullName = 'Họ và tên không được vượt quá 120 ký tự.';
    }

    if (form.occupation.trim().length > 120) {
      nextErrors.occupation = 'Nghề nghiệp không được vượt quá 120 ký tự.';
    }

    if (form.bio.length > 500) {
      nextErrors.bio = 'Giới thiệu không được vượt quá 500 ký tự.';
    }

    if (!isValidWebsite(form.website)) {
      nextErrors.website = 'Địa chỉ website không hợp lệ.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async (event) => {
    event.preventDefault();

    if (saving || !changed || !validate()) return;

    setSaving(true);
    setFormError('');

    const usernameChanged = form.username.trim() !== user?.username;
    const profilePayload = {
      displayName: form.displayName.trim(),
      fullName: form.fullName.trim(),
      occupation: form.occupation.trim(),
      areaId: form.areaId || null,
      website: form.website ? normalizeWebsite(form.website) : '',
      bio: form.bio.trim(),
    };

    let profileSaved = false;

    try {
      await userApi.updateProfile(profilePayload);
      profileSaved = true;

      if (usernameChanged) {
        await userApi.changeUsername(form.username.trim());
      }

      const selectedAreaValue =
        selectedArea || (form.areaId ? { _id: form.areaId } : null);

      setAccountProfile((current) => ({
        ...(current || {}),
        ...profilePayload,
        areaId: selectedAreaValue,
      }));

      const refreshedUser = await refreshUser();
      await reloadAccountProfile();

      const nextForm = {
        ...form,
        username: refreshedUser?.username || form.username.trim(),
        website: profilePayload.website,
      };

      setForm(nextForm);
      setSnapshot(serializeForm(nextForm));
      setErrors({});
      toast.success('Đã cập nhật hồ sơ cá nhân.');
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      setErrors((current) => ({ ...current, ...fieldErrors }));

      const message = apiErrorMessage(
        error,
        profileSaved
          ? 'Thông tin hồ sơ đã lưu nhưng chưa thể đổi tên người dùng.'
          : 'Không thể cập nhật hồ sơ.',
      );

      setFormError(message);
      toast.error(message);

      if (profileSaved) {
        await reloadAccountProfile();
      }
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    try {
      const stored = JSON.parse(snapshot);
      setForm(stored);
      setErrors({});
      setFormError('');
    } catch {
      const nextForm = createForm(accountProfile, user);
      setForm(nextForm);
      setSnapshot(serializeForm(nextForm));
    }
  };

  return (
    <div className="profile-settings-page">
      <Seo
        title="Hồ sơ cá nhân"
        description="Cập nhật tên hiển thị, tên người dùng và thông tin hồ sơ."
      />

      {formError ? (
        <div className="profile-settings-alert" role="alert">
          <TriangleAlert size={19} />
          <div>
            <strong>Chưa thể lưu thay đổi</strong>
            <p>{formError}</p>
          </div>
        </div>
      ) : null}

      <form className="profile-settings-layout" onSubmit={save} noValidate>
        <aside className="profile-settings-sidebar">
          <section className="profile-settings-card profile-settings-preview">
            <div className="profile-settings-card__heading">
              <div>
                <h2>Giới thiệu</h2>
                <p>Thông tin người khác có thể thấy trên hồ sơ.</p>
              </div>
            </div>

            <div className="profile-settings-preview__name">
              <span>
                <UserRound size={21} />
              </span>
              <div>
                <strong>{form.displayName || 'Chưa cập nhật'}</strong>
                <small>@{form.username || 'ten-nguoi-dung'}</small>
              </div>
            </div>

            <div className="profile-settings-preview__list">
              <div>
                <BriefcaseBusiness size={19} />
                <span>
                  <strong>{form.occupation || 'Chưa cập nhật nghề nghiệp'}</strong>
                  <small>Nghề nghiệp</small>
                </span>
              </div>

              <div>
                <MapPin size={19} />
                <span>
                  <strong>{selectedArea?.name || 'Chưa chọn khu vực'}</strong>
                  <small>Khu vực sinh sống</small>
                </span>
              </div>

              <div>
                <Globe2 size={19} />
                <span>
                  <strong>{form.website || 'Chưa thêm website'}</strong>
                  <small>Website</small>
                </span>
              </div>
            </div>

            {form.bio ? (
              <p className="profile-settings-preview__bio">{form.bio}</p>
            ) : (
              <p className="profile-settings-preview__empty">
                Thêm một đoạn giới thiệu ngắn để hồ sơ rõ ràng hơn.
              </p>
            )}
          </section>

          <section className="profile-settings-card profile-settings-privacy">
            <div className="profile-settings-privacy__icon">
              {publicProfile ? <Eye size={22} /> : <EyeOff size={22} />}
            </div>

            <div>
              <strong>
                {publicProfile ? 'Hồ sơ công khai' : 'Hồ sơ riêng tư'}
              </strong>
              <p>
                Thay đổi chế độ hiển thị từ nút ba chấm bên phải thanh điều hướng tài khoản.
              </p>
            </div>

            {publicProfile && form.username ? (
              <Link to={publicProfilePath} target="_blank" rel="noopener noreferrer">
                Xem hồ sơ công khai
              </Link>
            ) : null}
          </section>
        </aside>

        <div className="profile-settings-main">
          <section className="profile-settings-card profile-settings-form-card">
            <div className="profile-settings-card__heading">
              <div className="profile-settings-card__heading-icon">
                <UserRound size={22} />
              </div>
              <div>
                <h2>Thông tin cá nhân</h2>
                <p>Cập nhật các thông tin xuất hiện trên hồ sơ, bài viết và bình luận.</p>
              </div>
            </div>

            <div className="profile-settings-grid">
              <div className={`profile-settings-field ${errors.displayName ? 'has-error' : ''}`}>
                <label htmlFor="profile-display-name">
                  Tên hiển thị <em>*</em>
                </label>
                <div className="profile-settings-input">
                  <UserRound size={18} />
                  <input
                    id="profile-display-name"
                    value={form.displayName}
                    onChange={(event) => updateField('displayName', event.target.value)}
                    placeholder="Tên hiển thị của bạn"
                    maxLength={80}
                    disabled={saving}
                  />
                </div>
                {errors.displayName ? (
                  <small className="profile-settings-field__error">{errors.displayName}</small>
                ) : (
                  <small className="profile-settings-field__hint">
                    Tên này xuất hiện trên bài viết và bình luận.
                  </small>
                )}
              </div>

              <div className={`profile-settings-field ${errors.fullName ? 'has-error' : ''}`}>
                <label htmlFor="profile-full-name">Họ và tên</label>
                <div className="profile-settings-input">
                  <UserRound size={18} />
                  <input
                    id="profile-full-name"
                    value={form.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                    placeholder="Họ và tên đầy đủ"
                    maxLength={120}
                    disabled={saving}
                  />
                </div>
                {errors.fullName ? (
                  <small className="profile-settings-field__error">{errors.fullName}</small>
                ) : null}
              </div>

              <div className={`profile-settings-field ${errors.username ? 'has-error' : ''}`}>
                <label htmlFor="profile-username">
                  Tên người dùng <em>*</em>
                </label>
                <div className="profile-settings-input">
                  <AtSign size={18} />
                  <input
                    id="profile-username"
                    value={form.username}
                    onChange={(event) =>
                      updateField('username', normalizeUsername(event.target.value))
                    }
                    placeholder="ten.nguoi.dung"
                    autoCapitalize="none"
                    spellCheck="false"
                    maxLength={30}
                    disabled={saving}
                  />
                </div>
                {errors.username ? (
                  <small className="profile-settings-field__error">{errors.username}</small>
                ) : (
                  <small className="profile-settings-field__hint">
                    4–30 ký tự. Việc đổi tên có thể bị giới hạn theo thời gian.
                  </small>
                )}
              </div>

              <div className={`profile-settings-field ${errors.occupation ? 'has-error' : ''}`}>
                <label htmlFor="profile-occupation">Nghề nghiệp</label>
                <div className="profile-settings-input">
                  <BriefcaseBusiness size={18} />
                  <input
                    id="profile-occupation"
                    value={form.occupation}
                    onChange={(event) => updateField('occupation', event.target.value)}
                    placeholder="Ví dụ: Kiến trúc sư"
                    maxLength={120}
                    disabled={saving}
                  />
                </div>
                {errors.occupation ? (
                  <small className="profile-settings-field__error">{errors.occupation}</small>
                ) : null}
              </div>

              <div className="profile-settings-field">
                <label htmlFor="profile-area">Khu vực</label>
                <div className="profile-settings-input profile-settings-input--select">
                  <MapPin size={18} />
                  <select
                    id="profile-area"
                    value={form.areaId}
                    onChange={(event) => updateField('areaId', event.target.value)}
                    disabled={saving}
                  >
                    <option value="">Chưa chọn khu vực</option>
                    {sortedAreas.map((area) => (
                      <option key={area._id || area.id} value={area._id || area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`profile-settings-field ${errors.website ? 'has-error' : ''}`}>
                <label htmlFor="profile-website">Website</label>
                <div className="profile-settings-input">
                  <Globe2 size={18} />
                  <input
                    id="profile-website"
                    value={form.website}
                    onChange={(event) => updateField('website', event.target.value)}
                    placeholder="https://website-cua-ban.vn"
                    inputMode="url"
                    disabled={saving}
                  />
                </div>
                {errors.website ? (
                  <small className="profile-settings-field__error">{errors.website}</small>
                ) : null}
              </div>
            </div>

            <div className={`profile-settings-field profile-settings-field--wide ${errors.bio ? 'has-error' : ''}`}>
              <div className="profile-settings-field__label-row">
                <label htmlFor="profile-bio">Giới thiệu</label>
                <span className={bioLength >= 480 ? 'is-warning' : ''}>
                  {bioLength}/500
                </span>
              </div>
              <textarea
                id="profile-bio"
                rows={6}
                value={form.bio}
                onChange={(event) => updateField('bio', event.target.value)}
                placeholder="Chia sẻ ngắn về bản thân, công việc hoặc mối quan tâm của bạn tại Hòa Lạc..."
                maxLength={500}
                disabled={saving}
              />
              {errors.bio ? (
                <small className="profile-settings-field__error">{errors.bio}</small>
              ) : null}
            </div>

            <div className="profile-settings-note">
              <ShieldCheck size={18} />
              <p>
                <strong>Ảnh đại diện và ảnh bìa</strong>
                <span>
                  Nhấn trực tiếp vào ảnh đại diện hoặc nút chỉnh sửa ảnh bìa ở phía trên để thay ảnh.
                </span>
              </p>
            </div>
          </section>
            <div className="profile-settings-savebar">
          <div className="profile-settings-savebar__status">
            <span className={changed ? 'is-changed' : 'is-saved'}>
              {changed ? <Info size={17} /> : <Check size={17} />}
            </span>
            <div>
              <strong>{changed ? 'Có thay đổi chưa lưu' : 'Hồ sơ đã được cập nhật'}</strong>
              <small>
                {changed
                  ? 'Lưu thay đổi trước khi rời khỏi trang.'
                  : 'Không có thay đổi mới.'}
              </small>
            </div>
          </div>

          <div className="profile-settings-savebar__actions">
            <button
              type="button"
              className="profile-settings-button profile-settings-button--secondary"
              onClick={reset}
              disabled={!changed || saving}
            >
              <RotateCcw size={17} />
              Hoàn tác
            </button>

            <button
              type="submit"
              className="profile-settings-button profile-settings-button--primary"
              disabled={!changed || saving}
            >
              {saving ? (
                <>
                  <LoaderCircle className="is-spinning" size={18} />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </div>
        </div>

      
      </form>

      {navigationBlocker.state === 'blocked' ? (
        <div
          className="profile-unsaved-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-unsaved-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              navigationBlocker.reset();
            }
          }}
        >
          <div className="profile-unsaved-dialog__panel">
            <span className="profile-unsaved-dialog__icon">
              <TriangleAlert size={24} />
            </span>

            <div className="profile-unsaved-dialog__content">
              <h2 id="profile-unsaved-title">Thay đổi chưa được lưu</h2>
              <p>
                Bạn đã chỉnh sửa hồ sơ nhưng chưa bấm lưu. Nếu rời khỏi
                trang, các thay đổi hiện tại sẽ bị mất.
              </p>
            </div>

            <div className="profile-unsaved-dialog__actions">
              <button
                type="button"
                className="profile-unsaved-dialog__stay"
                onClick={() => navigationBlocker.reset()}
              >
                Ở lại chỉnh sửa
              </button>

              <button
                type="button"
                className="profile-unsaved-dialog__leave"
                onClick={() => navigationBlocker.proceed()}
              >
                Rời trang, không lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
