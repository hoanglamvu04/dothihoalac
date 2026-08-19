import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import logoMark from '../../assets/logo-mark.svg';

import Seo from '../../components/common/Seo';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

import './ResetPasswordPage.css';

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
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

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
        const field = String(
          item?.path || '',
        )
          .split('.')
          .pop();

        if (field && item?.message) {
          result[field] = item.message;
        }

        return result;
      },
      {},
    );
  }

  return {};
}

export default function ResetPasswordPage() {
  const { token } = useParams();

  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [formError, setFormError] =
    useState('');

  const [errors, setErrors] = useState({});

  const hasToken = Boolean(
    String(token || '').trim(),
  );

  const passwordStrength = useMemo(
    () =>
      calculatePasswordStrength(
        form.newPassword,
      ),
    [form.newPassword],
  );

  const passwordRequirements = useMemo(
    () => [
      {
        label: 'Tối thiểu 8 ký tự',
        passed:
          form.newPassword.length >= 8,
      },
      {
        label: 'Có chữ và số',
        passed:
          /[A-Za-z]/.test(
            form.newPassword,
          ) &&
          /[0-9]/.test(
            form.newPassword,
          ),
      },
      {
        label: 'Hai mật khẩu trùng nhau',
        passed:
          Boolean(
            form.confirmPassword,
          ) &&
          form.newPassword ===
            form.confirmPassword,
      },
    ],
    [
      form.newPassword,
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

    if (!form.newPassword) {
      nextErrors.newPassword =
        'Vui lòng nhập mật khẩu mới.';
    } else if (
      form.newPassword.length < 8
    ) {
      nextErrors.newPassword =
        'Mật khẩu phải có ít nhất 8 ký tự.';
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

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  const submit = async (event) => {
    event.preventDefault();

    if (
      loading ||
      !hasToken ||
      !validate()
    ) {
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      await authApi.resetPassword({
        token,
        newPassword:
          form.newPassword,
        confirmPassword:
          form.confirmPassword,
      });

      toast.success(
        'Đặt lại mật khẩu thành công.',
      );

      navigate('/dang-nhap', {
        replace: true,
        state: {
          passwordReset: true,
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
        'Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn hoặc không hợp lệ.',
      );

      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dthl-reset-page">
      <Seo
        title="Đặt lại mật khẩu"
        description="Tạo mật khẩu mới cho tài khoản Đô Thị Hòa Lạc."
      />

      <div className="dthl-reset-shell">
        <section className="dthl-reset-intro">
          <div className="dthl-reset-intro__content">
            <Link
              className="dthl-reset-brand"
              to="/"
              aria-label="Đô Thị Hòa Lạc - Trang chủ"
            >
              <span className="dthl-reset-brand__mark">
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

            <div className="dthl-reset-intro__heading">
              <span className="dthl-reset-eyebrow">
                <MapPinned size={17} />
                Bảo mật tài khoản
              </span>

              <h1>
                Khôi phục quyền truy cập.
                <br />

                <em>
                  Tiếp tục kết nối Hòa Lạc.
                </em>
              </h1>

              <p>
                Tạo mật khẩu mới đủ mạnh để
                bảo vệ bài đăng, thông báo và
                các hoạt động trong tài khoản
                của bạn.
              </p>
            </div>

            <div className="dthl-reset-benefits">
              <div>
                <span>
                  <KeyRound size={20} />
                </span>

                <p>
                  <strong>
                    Mật khẩu hoàn toàn mới
                  </strong>

                  <small>
                    Không nên sử dụng lại mật
                    khẩu cũ hoặc mật khẩu đang
                    dùng ở dịch vụ khác.
                  </small>
                </p>
              </div>

              <div>
                <span>
                  <ShieldCheck size={20} />
                </span>

                <p>
                  <strong>
                    Bảo vệ phiên đăng nhập
                  </strong>

                  <small>
                    Sau khi đổi mật khẩu, hãy
                    kiểm tra lại các thiết bị
                    đang đăng nhập tài khoản.
                  </small>
                </p>
              </div>
            </div>
          </div>

          <div className="dthl-reset-intro__footer">
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

        <section className="dthl-reset-form-side">
          <div className="dthl-reset-card">
            {!hasToken ? (
              <div className="dthl-reset-invalid">
                <span className="dthl-reset-invalid__icon">
                  <TriangleAlert size={30} />
                </span>

                <span className="dthl-reset-invalid__eyebrow">
                  Liên kết không hợp lệ
                </span>

                <h2>
                  Không tìm thấy mã đặt lại mật
                  khẩu
                </h2>

                <p>
                  Liên kết có thể bị thiếu,
                  không đúng hoặc đã hết hạn.
                  Hãy yêu cầu một liên kết mới
                  từ trang quên mật khẩu.
                </p>

                <Link
                  className="dthl-reset-request-link"
                  to="/quen-mat-khau"
                >
                  Gửi lại yêu cầu
                  <ArrowRight size={18} />
                </Link>

                <Link
                  className="dthl-reset-back-link"
                  to="/dang-nhap"
                >
                  <ArrowLeft size={17} />
                  Quay lại đăng nhập
                </Link>
              </div>
            ) : (
              <>
                <div className="dthl-reset-card__header">
                  <span>
                    Thiết lập mật khẩu mới
                  </span>

                  <h2>
                    Đặt lại mật khẩu
                  </h2>

                  <p>
                    Mật khẩu nên có ít nhất 8
                    ký tự và khác với mật khẩu
                    bạn đã sử dụng trước đây.
                  </p>
                </div>

                {formError ? (
                  <div
                    className="dthl-reset-alert"
                    role="alert"
                  >
                    <span>
                      <TriangleAlert
                        size={18}
                      />
                    </span>

                    <div>
                      <strong>
                        Chưa thể đặt lại mật
                        khẩu
                      </strong>

                      <p>{formError}</p>
                    </div>
                  </div>
                ) : null}

                <form
                  className="dthl-reset-form"
                  onSubmit={submit}
                  noValidate
                >
                  <div
                    className={[
                      'dthl-reset-field',
                      errors.newPassword
                        ? 'has-error'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <label htmlFor="reset-new-password">
                      Mật khẩu mới
                      <em>*</em>
                    </label>

                    <div className="dthl-reset-input">
                      <LockKeyhole
                        size={19}
                        aria-hidden="true"
                      />

                      <input
                        id="reset-new-password"
                        type={
                          showNewPassword
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
                        autoFocus
                        disabled={loading}
                        aria-invalid={Boolean(
                          errors.newPassword,
                        )}
                      />

                      <button
                        type="button"
                        className="dthl-reset-password-toggle"
                        aria-label={
                          showNewPassword
                            ? 'Ẩn mật khẩu mới'
                            : 'Hiện mật khẩu mới'
                        }
                        aria-pressed={
                          showNewPassword
                        }
                        onClick={() =>
                          setShowNewPassword(
                            (current) =>
                              !current,
                          )
                        }
                        disabled={loading}
                      >
                        {showNewPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>

                    {errors.newPassword ? (
                      <small className="dthl-reset-field__error">
                        {errors.newPassword}
                      </small>
                    ) : null}
                  </div>

                  <div
                    className={[
                      'dthl-reset-field',
                      errors.confirmPassword
                        ? 'has-error'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <label htmlFor="reset-confirm-password">
                      Xác nhận mật khẩu
                      <em>*</em>
                    </label>

                    <div className="dthl-reset-input">
                      <LockKeyhole
                        size={19}
                        aria-hidden="true"
                      />

                      <input
                        id="reset-confirm-password"
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
                        placeholder="Nhập lại mật khẩu mới"
                        autoComplete="new-password"
                        disabled={loading}
                        aria-invalid={Boolean(
                          errors.confirmPassword,
                        )}
                      />

                      <button
                        type="button"
                        className="dthl-reset-password-toggle"
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
                      <small className="dthl-reset-field__error">
                        {
                          errors.confirmPassword
                        }
                      </small>
                    ) : null}
                  </div>

                  {form.newPassword ? (
                    <div className="dthl-reset-password-info">
                      <div className="dthl-reset-strength">
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

                      <div className="dthl-reset-requirements">
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
                                <Check
                                  size={13}
                                />
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

                  <button
                    type="submit"
                    className="dthl-reset-submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="dthl-reset-spinner" />
                        Đang cập nhật...
                      </>
                    ) : (
                      <>
                        Đặt lại mật khẩu
                        <ArrowRight size={19} />
                      </>
                    )}
                  </button>

                  <p className="dthl-reset-switch">
                    Đã nhớ mật khẩu?
                    <Link to="/dang-nhap">
                      Quay lại đăng nhập
                    </Link>
                  </p>
                </form>

                <div className="dthl-reset-card__security">
                  <ShieldCheck size={16} />

                  <span>
                    Liên kết đặt lại mật khẩu
                    chỉ nên được sử dụng trên
                    thiết bị của bạn.
                  </span>
                </div>
              </>
            )}
          </div>

          <p className="dthl-reset-mobile-footer">
            Gặp khó khăn khi khôi phục tài
            khoản?
            <Link to="/lien-he">
              Liên hệ hỗ trợ
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}