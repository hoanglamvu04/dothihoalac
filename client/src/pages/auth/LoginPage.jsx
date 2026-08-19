import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPinned,
  ShieldCheck,
  Users,
} from 'lucide-react';

import logoMark from '../../assets/logo-mark.svg';

import Seo from '../../components/common/Seo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/http';

import './LoginPage.css';

const REMEMBER_IDENTIFIER_KEY =
  'dthl_remembered_identifier';

function getRedirectPath(location) {
  const from = location.state?.from;

  if (typeof from === 'string') {
    return from.startsWith('/dang-nhap')
      ? '/'
      : from;
  }

  if (from?.pathname) {
    const destination = [
      from.pathname,
      from.search || '',
      from.hash || '',
    ].join('');

    return destination.startsWith(
      '/dang-nhap',
    )
      ? '/'
      : destination;
  }

  return '/';
}

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberAccount, setRememberAccount] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [formError, setFormError] =
    useState('');

  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    identifier: '',
    password: '',
  });

  useEffect(() => {
    const rememberedIdentifier =
      window.localStorage.getItem(
        REMEMBER_IDENTIFIER_KEY,
      );

    if (rememberedIdentifier) {
      setForm((current) => ({
        ...current,
        identifier: rememberedIdentifier,
      }));

      setRememberAccount(true);
    }
  }, []);

  const updateField = (field, value) => {
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

    if (!form.identifier.trim()) {
      nextErrors.identifier =
        'Vui lòng nhập email hoặc tên người dùng.';
    }

    if (!form.password) {
      nextErrors.password =
        'Vui lòng nhập mật khẩu.';
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  const submit = async (event) => {
    event.preventDefault();

    if (loading || !validate()) {
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      await login({
        identifier:
          form.identifier.trim(),
        password: form.password,
      });

      if (rememberAccount) {
        window.localStorage.setItem(
          REMEMBER_IDENTIFIER_KEY,
          form.identifier.trim(),
        );
      } else {
        window.localStorage.removeItem(
          REMEMBER_IDENTIFIER_KEY,
        );
      }

      toast.success(
        'Đăng nhập thành công.',
      );

      navigate(
        getRedirectPath(location),
        {
          replace: true,
        },
      );
    } catch (error) {
      const message = apiErrorMessage(
        error,
        'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.',
      );

      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dthl-login-page">
      <Seo
        title="Đăng nhập"
        description="Đăng nhập Đô Thị Hòa Lạc để theo dõi thông tin, tham gia cộng đồng và quản lý nội dung của bạn."
      />

      <div className="dthl-login-shell">
        <section className="dthl-login-intro">
          <div className="dthl-login-intro__content">
            <Link
              className="dthl-login-brand"
              to="/"
              aria-label="Đô Thị Hòa Lạc - Trang chủ"
            >
              <span className="dthl-login-brand__mark">
                <img
                  src={logoMark}
                  alt=""
                  aria-hidden="true"
                />
              </span>

              <span>
                <strong>
                  Đô Thị Hòa Lạc
                </strong>

                <small>
                  Trung Tâm Phát Triển Đô Thị Hòa Lạc
                </small>
              </span>
            </Link>

            <div className="dthl-login-intro__heading">
              <span className="dthl-login-eyebrow">
                <MapPinned size={17} />
                Nền tảng dành riêng cho Hòa Lạc
              </span>

              <h1>
                Hiểu địa phương.
                <br />
                <em>Kết nối cộng đồng.</em>
              </h1>

              <p>
                Một tài khoản để theo dõi tin
                tức, lưu nội dung, đăng bài và
                tham gia các hoạt động tại Hòa
                Lạc.
              </p>
            </div>

            <div className="dthl-login-benefits">
              <div>
                <span>
                  <CheckCircle2
                    size={19}
                  />
                </span>

                <p>
                  <strong>
                    Nội dung địa phương
                  </strong>

                  <small>
                    Tin tức, quy hoạch và hạ
                    tầng được tổ chức rõ ràng.
                  </small>
                </p>
              </div>

              <div>
                <span>
                  <Users size={19} />
                </span>

                <p>
                  <strong>
                    Cộng đồng thực
                  </strong>

                  <small>
                    Hỏi đáp, chia sẻ và kết nối
                    với người đang sống tại khu
                    vực.
                  </small>
                </p>
              </div>

              <div>
                <span>
                  <ShieldCheck
                    size={19}
                  />
                </span>

                <p>
                  <strong>
                    Tài khoản an toàn
                  </strong>

                  <small>
                    Quản lý bài đăng, thông báo
                    và các phiên đăng nhập.
                  </small>
                </p>
              </div>
            </div>
          </div>

          <div className="dthl-login-intro__footer">
            <span>
              © 2026 Đô Thị Hòa Lạc
            </span>

            <div>
              <Link to="/dieu-khoan-su-dung">
                Điều khoản
              </Link>

              <Link to="/quyen-rieng-tu">
                Quyền riêng tư
              </Link>
            </div>
          </div>
        </section>

        <section className="dthl-login-form-side">
          <div className="dthl-login-card">
            <div className="dthl-login-card__header">
              <span>Chào mừng trở lại</span>

              <h2>
                Đăng nhập tài khoản
              </h2>

              <p>
                Tiếp tục theo dõi và đóng góp
                cho cộng đồng Đô Thị Hòa Lạc.
              </p>
            </div>

            {formError ? (
              <div
                className="dthl-login-alert"
                role="alert"
              >
                <span>
                  <LockKeyhole size={18} />
                </span>

                <div>
                  <strong>
                    Đăng nhập chưa thành công
                  </strong>

                  <p>{formError}</p>
                </div>
              </div>
            ) : null}

            <form
              className="dthl-login-form"
              onSubmit={submit}
              noValidate
            >
              <div
                className={[
                  'dthl-login-field',
                  errors.identifier
                    ? 'has-error'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <label htmlFor="login-identifier">
                  Email hoặc tên người dùng
                  <em>*</em>
                </label>

                <div className="dthl-login-input">
                  <Mail
                    size={19}
                    aria-hidden="true"
                  />

                  <input
                    id="login-identifier"
                    type="text"
                    value={form.identifier}
                    onChange={(event) =>
                      updateField(
                        'identifier',
                        event.target.value,
                      )
                    }
                    placeholder="Nhập email hoặc tên người dùng"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck="false"
                    aria-invalid={
                      Boolean(
                        errors.identifier,
                      )
                    }
                    aria-describedby={
                      errors.identifier
                        ? 'login-identifier-error'
                        : undefined
                    }
                    disabled={loading}
                  />
                </div>

                {errors.identifier ? (
                  <small
                    id="login-identifier-error"
                    className="dthl-login-field__error"
                  >
                    {errors.identifier}
                  </small>
                ) : null}
              </div>

              <div
                className={[
                  'dthl-login-field',
                  errors.password
                    ? 'has-error'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="dthl-login-field__label-row">
                  <label htmlFor="login-password">
                    Mật khẩu
                    <em>*</em>
                  </label>

                  <Link to="/quen-mat-khau">
                    Quên mật khẩu?
                  </Link>
                </div>

                <div className="dthl-login-input">
                  <LockKeyhole
                    size={19}
                    aria-hidden="true"
                  />

                  <input
                    id="login-password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={form.password}
                    onChange={(event) =>
                      updateField(
                        'password',
                        event.target.value,
                      )
                    }
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    aria-invalid={
                      Boolean(
                        errors.password,
                      )
                    }
                    aria-describedby={
                      errors.password
                        ? 'login-password-error'
                        : undefined
                    }
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="dthl-login-password-toggle"
                    aria-label={
                      showPassword
                        ? 'Ẩn mật khẩu'
                        : 'Hiện mật khẩu'
                    }
                    aria-pressed={showPassword}
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>

                {errors.password ? (
                  <small
                    id="login-password-error"
                    className="dthl-login-field__error"
                  >
                    {errors.password}
                  </small>
                ) : null}
              </div>

              <label className="dthl-login-remember">
                <input
                  type="checkbox"
                  checked={rememberAccount}
                  onChange={(event) =>
                    setRememberAccount(
                      event.target.checked,
                    )
                  }
                  disabled={loading}
                />

                <span
                  className="dthl-login-checkbox"
                  aria-hidden="true"
                >
                  <CheckCircle2
                    size={14}
                  />
                </span>

                <span>
                  Ghi nhớ email hoặc tên đăng
                  nhập trên thiết bị này
                </span>
              </label>

              <button
                type="submit"
                className="dthl-login-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="dthl-login-spinner" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight size={19} />
                  </>
                )}
              </button>

              <p className="dthl-login-switch">
                Chưa có tài khoản?
                <Link to="/dang-ky">
                  Đăng ký ngay
                </Link>
              </p>
            </form>

            <div className="dthl-login-card__security">
              <ShieldCheck size={16} />

              <span>
                Thông tin đăng nhập được truyền
                qua kết nối bảo mật.
              </span>
            </div>
          </div>

          <p className="dthl-login-mobile-footer">
            Bằng việc tiếp tục, bạn đồng ý với
            <Link to="/dieu-khoan-su-dung">
              Điều khoản sử dụng
            </Link>
            và
            <Link to="/quyen-rieng-tu">
              Chính sách quyền riêng tư
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}