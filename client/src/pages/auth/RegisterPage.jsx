import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  ArrowRight,
  AtSign,
  Bookmark,
  Check,
  Circle,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPinned,
  MessageSquareText,
  Newspaper,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import logoMark from '../../assets/logo-mark.svg';

import Seo from '../../components/common/Seo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/http';

import './RegisterPage.css';

const USERNAME_PATTERN =
  /^[a-z0-9](?:[a-z0-9._]{2,28}[a-z0-9])$/;

function normalizeUsername(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/[._]{2,}/g, '.')
    .slice(0, 30);
}

function calculatePasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: '',
      className: '',
    };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return {
      score: 1,
      label: 'Yếu',
      className: 'is-weak',
    };
  }

  if (score <= 4) {
    return {
      score: 2,
      label: 'Trung bình',
      className: 'is-medium',
    };
  }

  return {
    score: 3,
    label: 'Mạnh',
    className: 'is-strong',
  };
}

function extractServerFieldErrors(error) {
  const serverErrors =
    error?.response?.data?.errors;

  if (!serverErrors) {
    return {};
  }

  if (
    typeof serverErrors === 'object' &&
    !Array.isArray(serverErrors)
  ) {
    return Object.fromEntries(
      Object.entries(serverErrors).map(
        ([key, value]) => [
          key,
          typeof value === 'string'
            ? value
            : value?.message || '',
        ],
      ),
    );
  }

  if (Array.isArray(serverErrors)) {
    return serverErrors.reduce(
      (result, item) => {
        const path = String(
          item?.path || '',
        )
          .split('.')
          .pop();

        if (path && item?.message) {
          result[path] = item.message;
        }

        return result;
      },
      {},
    );
  }

  return {};
}

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [formError, setFormError] =
    useState('');

  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const passwordStrength = useMemo(
    () =>
      calculatePasswordStrength(
        form.password,
      ),
    [form.password],
  );

  const passwordRequirements = useMemo(
    () => [
      {
        label: 'Tối thiểu 8 ký tự',
        passed: form.password.length >= 8,
      },
      {
        label: 'Có chữ và số',
        passed:
          /[A-Za-z]/.test(form.password) &&
          /[0-9]/.test(form.password),
      },
      {
        label: 'Mật khẩu xác nhận khớp',
        passed:
          Boolean(form.confirmPassword) &&
          form.password ===
            form.confirmPassword,
      },
    ],
    [
      form.password,
      form.confirmPassword,
    ],
  );

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

    const displayName =
      form.displayName.trim();

    const username = form.username.trim();
    const email = form.email.trim();

    if (!displayName) {
      nextErrors.displayName =
        'Vui lòng nhập tên hiển thị.';
    } else if (displayName.length < 2) {
      nextErrors.displayName =
        'Tên hiển thị phải có ít nhất 2 ký tự.';
    } else if (displayName.length > 80) {
      nextErrors.displayName =
        'Tên hiển thị không được vượt quá 80 ký tự.';
    }

    if (!username) {
      nextErrors.username =
        'Vui lòng nhập tên người dùng.';
    } else if (username.length < 4) {
      nextErrors.username =
        'Tên người dùng phải có ít nhất 4 ký tự.';
    } else if (
      !USERNAME_PATTERN.test(username)
    ) {
      nextErrors.username =
        'Chỉ dùng chữ thường không dấu, số, dấu chấm hoặc gạch dưới; không bắt đầu hay kết thúc bằng ký tự đặc biệt.';
    }

    if (!email) {
      nextErrors.email =
        'Vui lòng nhập địa chỉ email.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      nextErrors.email =
        'Địa chỉ email không hợp lệ.';
    }

    if (!form.password) {
      nextErrors.password =
        'Vui lòng nhập mật khẩu.';
    } else if (form.password.length < 8) {
      nextErrors.password =
        'Mật khẩu phải có ít nhất 8 ký tự.';
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword =
        'Vui lòng xác nhận mật khẩu.';
    } else if (
      form.confirmPassword !==
      form.password
    ) {
      nextErrors.confirmPassword =
        'Mật khẩu xác nhận không khớp.';
    }

    if (!form.acceptTerms) {
      nextErrors.acceptTerms =
        'Bạn cần đồng ý với điều khoản và chính sách quyền riêng tư.';
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

    const payload = {
      displayName: form.displayName.trim(),
      username: form.username.trim(),
      email: form.email
        .trim()
        .toLowerCase(),
      password: form.password,
      confirmPassword:
        form.confirmPassword,
      acceptTerms: form.acceptTerms,
    };

    try {
      await register(payload);

      toast.success(
        'Đăng ký thành công. Hãy xác thực email.',
      );

      navigate('/xac-thuc-email', {
        replace: true,
        state: {
          email: payload.email,
        },
      });
    } catch (error) {
      const fieldErrors =
        extractServerFieldErrors(error);

      if (
        Object.keys(fieldErrors).length
      ) {
        setErrors((current) => ({
          ...current,
          ...fieldErrors,
        }));
      }

      const message = apiErrorMessage(
        error,
        'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.',
      );

      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dthl-register-page">
      <Seo
        title="Đăng ký"
        description="Tạo tài khoản Đô Thị Hòa Lạc để đăng bài, bình luận, lưu nội dung và theo dõi các khu vực bạn quan tâm."
      />

      <div className="dthl-register-shell">
        <section className="dthl-register-intro">
          <div className="dthl-register-intro__content">
            <Link
              className="dthl-register-brand"
              to="/"
              aria-label="Đô Thị Hòa Lạc - Trang chủ"
            >
              <span className="dthl-register-brand__mark">
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
                  Thông tin đúng · Kết nối thật
                </small>
              </span>
            </Link>

            <div className="dthl-register-intro__heading">
              <span className="dthl-register-eyebrow">
                <MapPinned size={17} />
                Cộng đồng dành cho Hòa Lạc
              </span>

              <h1>
                Theo dõi điều bạn quan tâm.
                <br />
                <em>
                  Chia sẻ điều bạn biết.
                </em>
              </h1>

              <p>
                Tạo tài khoản miễn phí để
                tiếp cận thông tin địa phương,
                tham gia thảo luận và quản lý
                nội dung của riêng bạn.
              </p>
            </div>

            <div className="dthl-register-benefits">
              <div>
                <span>
                  <Newspaper size={19} />
                </span>

                <p>
                  <strong>
                    Theo dõi thông tin
                  </strong>

                  <small>
                    Tin tức, quy hoạch, hạ tầng
                    và đời sống tại Hòa Lạc.
                  </small>
                </p>
              </div>

              <div>
                <span>
                  <MessageSquareText
                    size={19}
                  />
                </span>

                <p>
                  <strong>
                    Tham gia cộng đồng
                  </strong>

                  <small>
                    Đăng bài, bình luận và trao
                    đổi với người dân địa phương.
                  </small>
                </p>
              </div>

              <div>
                <span>
                  <Bookmark size={19} />
                </span>

                <p>
                  <strong>
                    Lưu nội dung cần thiết
                  </strong>

                  <small>
                    Đánh dấu bài viết, tin nhà
                    đất và việc làm để xem lại.
                  </small>
                </p>
              </div>
            </div>
          </div>

          <div className="dthl-register-intro__footer">
            <span>
              © 2026 Đô Thị Hòa Lạc
            </span>

            <div>
              <Link to="/dieu-khoan">
                Điều khoản
              </Link>

              <Link to="/chinh-sach-quyen-rieng">
                Quyền riêng tư
              </Link>
            </div>
          </div>
        </section>

        <section className="dthl-register-form-side">
          <div className="dthl-register-card">
            <div className="dthl-register-card__header">
              <span>Tham gia cộng đồng</span>

              <h2>Tạo tài khoản mới</h2>

              <p>
                Chỉ mất vài phút để bắt đầu
                theo dõi và đóng góp nội dung.
              </p>
            </div>

            {formError ? (
              <div
                className="dthl-register-alert"
                role="alert"
              >
                <span>
                  <ShieldCheck size={18} />
                </span>

                <div>
                  <strong>
                    Chưa thể tạo tài khoản
                  </strong>

                  <p>{formError}</p>
                </div>
              </div>
            ) : null}

            <form
              className="dthl-register-form"
              onSubmit={submit}
              noValidate
            >
              <div className="dthl-register-grid">
                <div
                  className={[
                    'dthl-register-field',
                    errors.displayName
                      ? 'has-error'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <label htmlFor="register-display-name">
                    Tên hiển thị
                    <em>*</em>
                  </label>

                  <div className="dthl-register-input">
                    <UserRound
                      size={19}
                      aria-hidden="true"
                    />

                    <input
                      id="register-display-name"
                      type="text"
                      value={form.displayName}
                      onChange={(event) =>
                        updateField(
                          'displayName',
                          event.target.value,
                        )
                      }
                      placeholder="Ví dụ: Nguyễn Văn An"
                      autoComplete="name"
                      maxLength={80}
                      disabled={loading}
                      aria-invalid={Boolean(
                        errors.displayName,
                      )}
                    />
                  </div>

                  {errors.displayName ? (
                    <small className="dthl-register-field__error">
                      {errors.displayName}
                    </small>
                  ) : null}
                </div>

                <div
                  className={[
                    'dthl-register-field',
                    errors.username
                      ? 'has-error'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <label htmlFor="register-username">
                    Tên người dùng
                    <em>*</em>
                  </label>

                  <div className="dthl-register-input">
                    <AtSign
                      size={19}
                      aria-hidden="true"
                    />

                    <input
                      id="register-username"
                      type="text"
                      value={form.username}
                      onChange={(event) =>
                        updateField(
                          'username',
                          normalizeUsername(
                            event.target.value,
                          ),
                        )
                      }
                      placeholder="nguyenvanan"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck="false"
                      maxLength={30}
                      disabled={loading}
                      aria-invalid={Boolean(
                        errors.username,
                      )}
                    />
                  </div>

                  {errors.username ? (
                    <small className="dthl-register-field__error">
                      {errors.username}
                    </small>
                  ) : (
                    <small className="dthl-register-field__hint">
                      4–30 ký tự, chỉ gồm chữ
                      thường, số, dấu chấm hoặc
                      gạch dưới.
                    </small>
                  )}
                </div>
              </div>

              <div
                className={[
                  'dthl-register-field',
                  errors.email
                    ? 'has-error'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <label htmlFor="register-email">
                  Email
                  <em>*</em>
                </label>

                <div className="dthl-register-input">
                  <Mail
                    size={19}
                    aria-hidden="true"
                  />

                  <input
                    id="register-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        'email',
                        event.target.value,
                      )
                    }
                    placeholder="ban@example.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck="false"
                    disabled={loading}
                    aria-invalid={Boolean(
                      errors.email,
                    )}
                  />
                </div>

                {errors.email ? (
                  <small className="dthl-register-field__error">
                    {errors.email}
                  </small>
                ) : null}
              </div>

              <div className="dthl-register-grid">
                <div
                  className={[
                    'dthl-register-field',
                    errors.password
                      ? 'has-error'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <label htmlFor="register-password">
                    Mật khẩu
                    <em>*</em>
                  </label>

                  <div className="dthl-register-input">
                    <LockKeyhole
                      size={19}
                      aria-hidden="true"
                    />

                    <input
                      id="register-password"
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
                      placeholder="Tối thiểu 8 ký tự"
                      autoComplete="new-password"
                      disabled={loading}
                      aria-invalid={Boolean(
                        errors.password,
                      )}
                    />

                    <button
                      type="button"
                      className="dthl-register-password-toggle"
                      aria-label={
                        showPassword
                          ? 'Ẩn mật khẩu'
                          : 'Hiện mật khẩu'
                      }
                      aria-pressed={
                        showPassword
                      }
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
                    <small className="dthl-register-field__error">
                      {errors.password}
                    </small>
                  ) : null}
                </div>

                <div
                  className={[
                    'dthl-register-field',
                    errors.confirmPassword
                      ? 'has-error'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <label htmlFor="register-confirm-password">
                    Xác nhận mật khẩu
                    <em>*</em>
                  </label>

                  <div className="dthl-register-input">
                    <LockKeyhole
                      size={19}
                      aria-hidden="true"
                    />

                    <input
                      id="register-confirm-password"
                      type={
                        showConfirmPassword
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
                      placeholder="Nhập lại mật khẩu"
                      autoComplete="new-password"
                      disabled={loading}
                      aria-invalid={Boolean(
                        errors.confirmPassword,
                      )}
                    />

                    <button
                      type="button"
                      className="dthl-register-password-toggle"
                      aria-label={
                        showConfirmPassword
                          ? 'Ẩn mật khẩu xác nhận'
                          : 'Hiện mật khẩu xác nhận'
                      }
                      aria-pressed={
                        showConfirmPassword
                      }
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) =>
                            !current,
                        )
                      }
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>

                  {errors.confirmPassword ? (
                    <small className="dthl-register-field__error">
                      {
                        errors.confirmPassword
                      }
                    </small>
                  ) : null}
                </div>
              </div>

              {form.password ? (
                <div className="dthl-register-password-info">
                  <div className="dthl-register-strength">
                    <div>
                      <span
                        className={
                          passwordStrength.score >=
                          1
                            ? passwordStrength.className
                            : ''
                        }
                      />

                      <span
                        className={
                          passwordStrength.score >=
                          2
                            ? passwordStrength.className
                            : ''
                        }
                      />

                      <span
                        className={
                          passwordStrength.score >=
                          3
                            ? passwordStrength.className
                            : ''
                        }
                      />
                    </div>

                    <small>
                      Độ mạnh:
                      <strong>
                        {
                          passwordStrength.label
                        }
                      </strong>
                    </small>
                  </div>

                  <div className="dthl-register-requirements">
                    {passwordRequirements.map(
                      (item) => (
                        <span
                          key={item.label}
                          className={
                            item.passed
                              ? 'is-passed'
                              : ''
                          }
                        >
                          {item.passed ? (
                            <Check size={13} />
                          ) : (
                            <Circle
                              size={9}
                            />
                          )}

                          {item.label}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              <div className="dthl-register-terms-wrap">
                <label className="dthl-register-terms">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(event) =>
                      updateField(
                        'acceptTerms',
                        event.target.checked,
                      )
                    }
                    disabled={loading}
                  />

                  <span
                    className="dthl-register-checkbox"
                    aria-hidden="true"
                  >
                    <Check size={14} />
                  </span>

                  <span>
                    Tôi đồng ý với
                    <Link
                      to="/dieu-khoan"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Điều khoản sử dụng
                    </Link>
                    và
                    <Link
                      to="/chinh-sach-quyen-rieng"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Chính sách quyền riêng tư
                    </Link>
                    .
                  </span>
                </label>

                {errors.acceptTerms ? (
                  <small className="dthl-register-field__error">
                    {errors.acceptTerms}
                  </small>
                ) : null}
              </div>

              <button
                type="submit"
                className="dthl-register-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="dthl-register-spinner" />
                    Đang tạo tài khoản...
                  </>
                ) : (
                  <>
                    Tạo tài khoản
                    <ArrowRight size={19} />
                  </>
                )}
              </button>

              <p className="dthl-register-switch">
                Đã có tài khoản?
                <Link to="/dang-nhap">
                  Đăng nhập
                </Link>
              </p>
            </form>

            <div className="dthl-register-card__security">
              <ShieldCheck size={16} />

              <span>
                Email của bạn sẽ cần được xác
                thực trước khi sử dụng đầy đủ
                các tính năng.
              </span>
            </div>
          </div>

          <p className="dthl-register-mobile-footer">
            Việc tạo tài khoản đồng nghĩa bạn
            chấp nhận
            <Link to="/dieu-khoan">
              Điều khoản sử dụng
            </Link>
            và
            <Link to="/chinh-sach-quyen-rieng">
              Chính sách quyền riêng tư
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}