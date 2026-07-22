import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import Seo from '../../components/common/Seo';

import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/http';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import './AccountPages.css';

export default function SecurityPage() {
  const {
    user,
    logout,
  } = useAuth();

  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [
    showCurrent,
    setShowCurrent,
  ] = useState(false);

  const [
    showNew,
    setShowNew,
  ] = useState(false);

  const [
    showConfirm,
    setShowConfirm,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    formError,
    setFormError,
  ] = useState('');

  const [errors, setErrors] =
    useState({});

  const emailVerified = Boolean(
    user?.emailVerifiedAt ||
      user?.emailVerified ||
      user?.isEmailVerified,
  );

  const phoneVerified = Boolean(
    user?.phoneVerifiedAt ||
      user?.phoneVerified ||
      user?.isPhoneVerified,
  );

  const passwordStrongEnough =
    useMemo(
      () =>
        form.newPassword.length >= 8 &&
        /[A-Za-z]/.test(
          form.newPassword,
        ) &&
        /[0-9]/.test(
          form.newPassword,
        ),
      [form.newPassword],
    );

  const updateField = (
    field,
    value,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: '',
    }));

    setFormError('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.currentPassword) {
      nextErrors.currentPassword =
        'Vui lòng nhập mật khẩu hiện tại.';
    }

    if (!form.newPassword) {
      nextErrors.newPassword =
        'Vui lòng nhập mật khẩu mới.';
    } else if (
      form.newPassword.length < 8
    ) {
      nextErrors.newPassword =
        'Mật khẩu mới phải có ít nhất 8 ký tự.';
    } else if (
      !/[A-Za-z]/.test(
        form.newPassword,
      ) ||
      !/[0-9]/.test(
        form.newPassword,
      )
    ) {
      nextErrors.newPassword =
        'Mật khẩu mới nên có cả chữ và số.';
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword =
        'Vui lòng xác nhận mật khẩu mới.';
    } else if (
      form.confirmPassword !==
      form.newPassword
    ) {
      nextErrors.confirmPassword =
        'Mật khẩu xác nhận không khớp.';
    }

    if (
      form.currentPassword &&
      form.currentPassword ===
        form.newPassword
    ) {
      nextErrors.newPassword =
        'Mật khẩu mới phải khác mật khẩu hiện tại.';
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length ===
      0
    );
  };

  const submit = async (event) => {
    event.preventDefault();

    if (
      loading ||
      !validate()
    ) {
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      await authApi.changePassword(
        form,
      );

      toast.success(
        'Đã đổi mật khẩu. Vui lòng đăng nhập lại.',
      );

      await logout();

      navigate('/dang-nhap', {
        replace: true,
      });
    } catch (error) {
      const message = apiErrorMessage(
        error,
        'Không thể đổi mật khẩu.',
      );

      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-page-view account-security-page">
      <Seo title="Bảo mật tài khoản" />

      <div className="account-page-heading">
        <div>
          <span className="account-page-heading__eyebrow">
            <ShieldCheck size={15} />
            Bảo mật và xác thực
          </span>

          <h2>
            Bảo vệ tài khoản của bạn
          </h2>

          <p>
            Quản lý trạng thái xác thực
            và thay đổi mật khẩu đăng
            nhập.
          </p>
        </div>
      </div>

      <section className="account-page-card account-security-verification">
        <div className="account-page-card__header">
          <div>
            <h3>
              Trạng thái xác thực
            </h3>

            <p>
              Xác thực email và số điện
              thoại giúp tăng độ an toàn
              cho tài khoản.
            </p>
          </div>
        </div>

        <div className="account-verification-grid">
          <article
            className={[
              'account-verification-card',
              emailVerified
                ? 'is-verified'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="account-verification-card__icon">
              <Mail size={21} />
            </span>

            <div className="account-verification-card__content">
              <strong>Email</strong>

              <small>
                {user?.email ||
                  'Chưa cập nhật'}
              </small>
            </div>

            {emailVerified ? (
              <span className="account-verification-status is-verified">
                <ShieldCheck
                  size={14}
                />
                Đã xác thực
              </span>
            ) : (
              <Link
                className="account-page-button account-page-button--soft"
                to="/xac-thuc-email"
              >
                Xác thực ngay
              </Link>
            )}

            {emailVerified ? (
              <div className="account-verification-card__note">
                <Info size={15} />

                <span>
                  Email đã được xác thực.
                  Muốn thay đổi email, vui
                  lòng liên hệ quản trị
                  viên.
                </span>
              </div>
            ) : null}
          </article>

          <article
            className={[
              'account-verification-card',
              phoneVerified
                ? 'is-verified'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="account-verification-card__icon">
              <Phone size={21} />
            </span>

            <div className="account-verification-card__content">
              <strong>
                Số điện thoại
              </strong>

              <small>
                {user?.phone ||
                  'Chưa cập nhật'}
              </small>
            </div>

            {phoneVerified ? (
              <span className="account-verification-status is-verified">
                <ShieldCheck
                  size={14}
                />
                Đã xác thực
              </span>
            ) : (
              <Link
                className="account-page-button account-page-button--soft"
                to="/xac-thuc-so-dien-thoai"
              >
                Xác thực ngay
              </Link>
            )}

            {phoneVerified ? (
              <div className="account-verification-card__note">
                <Info size={15} />

                <span>
                  Số điện thoại đã được
                  xác thực. Muốn thay đổi,
                  vui lòng liên hệ quản trị
                  viên.
                </span>
              </div>
            ) : null}
          </article>
        </div>
      </section>

      <section className="account-page-card account-security-password">
        <div className="account-page-card__header">
          <div>
            <h3>Đổi mật khẩu</h3>

            <p>
              Sau khi đổi mật khẩu, bạn
              sẽ được yêu cầu đăng nhập
              lại.
            </p>
          </div>
        </div>

        {formError ? (
          <div
            className="account-inline-alert is-danger"
            role="alert"
          >
            <TriangleAlert
              size={18}
            />

            <span>{formError}</span>
          </div>
        ) : null}

        <form
          onSubmit={submit}
          noValidate
        >
          <div className="account-form-grid">
            <div
              className={[
                'account-field',
                'account-field--wide',
                errors.currentPassword
                  ? 'has-error'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <label htmlFor="security-current-password">
                Mật khẩu hiện tại
                <em>*</em>
              </label>

              <div className="account-input account-password-input">
                <LockKeyhole
                  size={18}
                  aria-hidden="true"
                />

                <input
                  id="security-current-password"
                  type={
                    showCurrent
                      ? 'text'
                      : 'password'
                  }
                  value={
                    form.currentPassword
                  }
                  onChange={(event) =>
                    updateField(
                      'currentPassword',
                      event.target.value,
                    )
                  }
                  placeholder="Nhập mật khẩu hiện tại"
                  autoComplete="current-password"
                  disabled={loading}
                  aria-invalid={Boolean(
                    errors.currentPassword,
                  )}
                />

                <button
                  type="button"
                  className="account-password-toggle"
                  aria-label={
                    showCurrent
                      ? 'Ẩn mật khẩu hiện tại'
                      : 'Hiện mật khẩu hiện tại'
                  }
                  aria-pressed={
                    showCurrent
                  }
                  onClick={() =>
                    setShowCurrent(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={loading}
                >
                  {showCurrent ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              {errors.currentPassword ? (
                <small className="account-field__error">
                  {
                    errors.currentPassword
                  }
                </small>
              ) : null}
            </div>

            <div
              className={[
                'account-field',
                errors.newPassword
                  ? 'has-error'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <label htmlFor="security-new-password">
                Mật khẩu mới
                <em>*</em>
              </label>

              <div className="account-input account-password-input">
                <KeyRound
                  size={18}
                  aria-hidden="true"
                />

                <input
                  id="security-new-password"
                  type={
                    showNew
                      ? 'text'
                      : 'password'
                  }
                  value={
                    form.newPassword
                  }
                  onChange={(event) =>
                    updateField(
                      'newPassword',
                      event.target.value,
                    )
                  }
                  placeholder="Nhập mật khẩu mới"
                  autoComplete="new-password"
                  disabled={loading}
                  aria-invalid={Boolean(
                    errors.newPassword,
                  )}
                />

                <button
                  type="button"
                  className="account-password-toggle"
                  aria-label={
                    showNew
                      ? 'Ẩn mật khẩu mới'
                      : 'Hiện mật khẩu mới'
                  }
                  aria-pressed={showNew}
                  onClick={() =>
                    setShowNew(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={loading}
                >
                  {showNew ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              {errors.newPassword ? (
                <small className="account-field__error">
                  {errors.newPassword}
                </small>
              ) : (
                <small
                  className={[
                    'account-field__hint',
                    form.newPassword &&
                    passwordStrongEnough
                      ? 'is-valid'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  Tối thiểu 8 ký tự. Nên
                  có cả chữ và số
                  {form.newPassword &&
                  passwordStrongEnough
                    ? ' — đạt yêu cầu.'
                    : '.'}
                </small>
              )}
            </div>

            <div
              className={[
                'account-field',
                errors.confirmPassword
                  ? 'has-error'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <label htmlFor="security-confirm-password">
                Xác nhận mật khẩu
                <em>*</em>
              </label>

              <div className="account-input account-password-input">
                <KeyRound
                  size={18}
                  aria-hidden="true"
                />

                <input
                  id="security-confirm-password"
                  type={
                    showConfirm
                      ? 'text'
                      : 'password'
                  }
                  value={
                    form.confirmPassword
                  }
                  onChange={(event) =>
                    updateField(
                      'confirmPassword',
                      event.target.value,
                    )
                  }
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  disabled={loading}
                  aria-invalid={Boolean(
                    errors.confirmPassword,
                  )}
                />

                <button
                  type="button"
                  className="account-password-toggle"
                  aria-label={
                    showConfirm
                      ? 'Ẩn mật khẩu xác nhận'
                      : 'Hiện mật khẩu xác nhận'
                  }
                  aria-pressed={
                    showConfirm
                  }
                  onClick={() =>
                    setShowConfirm(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={loading}
                >
                  {showConfirm ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              {errors.confirmPassword ? (
                <small className="account-field__error">
                  {
                    errors.confirmPassword
                  }
                </small>
              ) : null}
            </div>
          </div>

          <div className="account-form-actions">
            <button
              type="submit"
              className="account-page-button account-page-button--primary"
              disabled={loading}
            >
              {loading
                ? 'Đang đổi mật khẩu...'
                : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}