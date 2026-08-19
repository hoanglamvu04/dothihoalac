import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  MapPinned,
  RefreshCw,
  Send,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import logoMark from '../../assets/logo-mark.svg';

import Seo from '../../components/common/Seo';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

import './ForgotPasswordPage.css';

const RESEND_DELAY_SECONDS = 30;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || '').trim(),
  );
}

function maskEmail(value) {
  const email = String(value || '').trim();
  const [name, domain] = email.split('@');

  if (!name || !domain) {
    return email;
  }

  if (name.length <= 2) {
    return `${name[0] || ''}***@${domain}`;
  }

  return `${name.slice(0, 2)}${'*'.repeat(
    Math.min(name.length - 2, 6),
  )}@${domain}`;
}

export default function ForgotPasswordPage() {
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [done, setDone] = useState(false);

  const [formError, setFormError] =
    useState('');

  const [emailError, setEmailError] =
    useState('');

  const [devToken, setDevToken] =
    useState('');

  const [resendSeconds, setResendSeconds] =
    useState(0);

  const showDevLink =
    import.meta.env.DEV && Boolean(devToken);

  const maskedSubmittedEmail = useMemo(
    () => maskEmail(submittedEmail),
    [submittedEmail],
  );

  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendSeconds((current) =>
        Math.max(0, current - 1),
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendSeconds]);

  const validateEmail = () => {
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      setEmailError(
        'Vui lòng nhập địa chỉ email.',
      );

      return false;
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailError(
        'Địa chỉ email không hợp lệ.',
      );

      return false;
    }

    setEmailError('');

    return true;
  };

  const requestResetPassword = async (
    targetEmail,
  ) => {
    const data =
      await authApi.forgotPassword(
        targetEmail,
      );

    setDevToken(data?.devToken || '');
    setSubmittedEmail(targetEmail);
    setDone(true);
    setResendSeconds(
      RESEND_DELAY_SECONDS,
    );
  };

  const submit = async (event) => {
    event.preventDefault();

    if (loading || !validateEmail()) {
      return;
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    setLoading(true);
    setFormError('');

    try {
      await requestResetPassword(
        normalizedEmail,
      );
    } catch (error) {
      const message = apiErrorMessage(
        error,
        'Không thể gửi hướng dẫn đặt lại mật khẩu. Vui lòng thử lại.',
      );

      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (
      loading ||
      resendSeconds > 0 ||
      !submittedEmail
    ) {
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      await requestResetPassword(
        submittedEmail,
      );

      toast.success(
        'Đã gửi lại hướng dẫn đặt lại mật khẩu.',
      );
    } catch (error) {
      const message = apiErrorMessage(
        error,
        'Không thể gửi lại email. Vui lòng thử lại.',
      );

      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const editEmail = () => {
    setDone(false);
    setDevToken('');
    setFormError('');
    setEmailError('');
    setResendSeconds(0);
  };

  return (
    <main className="dthl-forgot-page">
      <Seo
        title="Quên mật khẩu"
        description="Khôi phục quyền truy cập tài khoản Đô Thị Hòa Lạc bằng địa chỉ email đã đăng ký."
      />

      <div className="dthl-forgot-shell">
        <section className="dthl-forgot-intro">
          <div className="dthl-forgot-intro__content">
            <Link
              className="dthl-forgot-brand"
              to="/"
              aria-label="Đô Thị Hòa Lạc - Trang chủ"
            >
              <span className="dthl-forgot-brand__mark">
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

            <div className="dthl-forgot-intro__heading">
              <span className="dthl-forgot-eyebrow">
                <MapPinned size={17} />
                Khôi phục tài khoản
              </span>

              <h1>
                Lấy lại quyền truy cập.
                <br />

                <em>
                  Tiếp tục kết nối cộng đồng.
                </em>
              </h1>

              <p>
                Nhập email đã đăng ký. Hệ thống
                sẽ gửi cho bạn đường dẫn bảo mật
                để thiết lập mật khẩu mới.
              </p>
            </div>

            <div className="dthl-forgot-benefits">
              <div>
                <span>
                  <Mail size={20} />
                </span>

                <p>
                  <strong>
                    Gửi hướng dẫn qua email
                  </strong>

                  <small>
                    Đường dẫn đặt lại mật khẩu
                    chỉ được gửi tới email đã
                    liên kết với tài khoản.
                  </small>
                </p>
              </div>

              <div>
                <span>
                  <Clock3 size={20} />
                </span>

                <p>
                  <strong>
                    Liên kết có thời hạn
                  </strong>

                  <small>
                    Hãy sử dụng đường dẫn sớm để
                    tránh việc mã khôi phục hết
                    hiệu lực.
                  </small>
                </p>
              </div>

              <div>
                <span>
                  <ShieldCheck size={20} />
                </span>

                <p>
                  <strong>
                    Bảo vệ quyền riêng tư
                  </strong>

                  <small>
                    Hệ thống không công khai
                    email có tồn tại trong cơ sở
                    dữ liệu hay không.
                  </small>
                </p>
              </div>
            </div>
          </div>

          <div className="dthl-forgot-intro__footer">
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

        <section className="dthl-forgot-form-side">
          <div className="dthl-forgot-card">
            {done ? (
              <div className="dthl-forgot-success">
                <span className="dthl-forgot-success__icon">
                  <CheckCircle2 size={32} />
                </span>

                <span className="dthl-forgot-success__eyebrow">
                  Yêu cầu đã được tiếp nhận
                </span>

                <h2>
                  Kiểm tra email của bạn
                </h2>

                <p>
                  Nếu có tài khoản liên kết với
                  email
                  {maskedSubmittedEmail ? (
                    <strong>
                      {maskedSubmittedEmail}
                    </strong>
                  ) : null}
                  , hệ thống đã gửi đường dẫn đặt
                  lại mật khẩu.
                </p>

                <div className="dthl-forgot-success__steps">
                  <div>
                    <span>1</span>

                    <p>
                      <strong>
                        Mở hộp thư email
                      </strong>

                      <small>
                        Kiểm tra cả thư mục Spam
                        hoặc Quảng cáo.
                      </small>
                    </p>
                  </div>

                  <div>
                    <span>2</span>

                    <p>
                      <strong>
                        Nhấn vào liên kết
                      </strong>

                      <small>
                        Liên kết chỉ có hiệu lực
                        trong thời gian giới hạn.
                      </small>
                    </p>
                  </div>

                  <div>
                    <span>3</span>

                    <p>
                      <strong>
                        Tạo mật khẩu mới
                      </strong>

                      <small>
                        Không nên sử dụng lại mật
                        khẩu cũ.
                      </small>
                    </p>
                  </div>
                </div>

                {formError ? (
                  <div
                    className="dthl-forgot-alert"
                    role="alert"
                  >
                    <span>
                      <TriangleAlert
                        size={18}
                      />
                    </span>

                    <div>
                      <strong>
                        Chưa thể gửi lại email
                      </strong>

                      <p>{formError}</p>
                    </div>
                  </div>
                ) : null}

                {showDevLink ? (
                  <div className="dthl-forgot-dev">
                    <span>
                      Chế độ phát triển
                    </span>

                    <p>
                      SMTP chưa được sử dụng.
                      Bạn có thể mở trực tiếp
                      liên kết thử nghiệm bên
                      dưới.
                    </p>

                    <Link
                      to={`/dat-lai-mat-khau/${encodeURIComponent(
                        devToken,
                      )}`}
                    >
                      <KeyRound size={18} />
                      Mở liên kết thử nghiệm
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="dthl-forgot-resend"
                  onClick={resend}
                  disabled={
                    loading ||
                    resendSeconds > 0
                  }
                >
                  {loading ? (
                    <>
                      <span className="dthl-forgot-spinner dthl-forgot-spinner--green" />
                      Đang gửi lại...
                    </>
                  ) : resendSeconds > 0 ? (
                    <>
                      <Clock3 size={18} />
                      Gửi lại sau{' '}
                      {resendSeconds}s
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} />
                      Gửi lại hướng dẫn
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="dthl-forgot-edit-email"
                  onClick={editEmail}
                  disabled={loading}
                >
                  Sử dụng email khác
                </button>

                <Link
                  className="dthl-forgot-back-link"
                  to="/dang-nhap"
                >
                  <ArrowLeft size={17} />
                  Quay lại đăng nhập
                </Link>
              </div>
            ) : (
              <>
                <div className="dthl-forgot-card__header">
                  <span>
                    Khôi phục quyền truy cập
                  </span>

                  <h2>
                    Quên mật khẩu?
                  </h2>

                  <p>
                    Nhập email đã đăng ký. Chúng
                    tôi sẽ gửi hướng dẫn để bạn
                    tạo mật khẩu mới.
                  </p>
                </div>

                {formError ? (
                  <div
                    className="dthl-forgot-alert"
                    role="alert"
                  >
                    <span>
                      <TriangleAlert
                        size={18}
                      />
                    </span>

                    <div>
                      <strong>
                        Chưa thể gửi yêu cầu
                      </strong>

                      <p>{formError}</p>
                    </div>
                  </div>
                ) : null}

                <form
                  className="dthl-forgot-form"
                  onSubmit={submit}
                  noValidate
                >
                  <div
                    className={[
                      'dthl-forgot-field',
                      emailError
                        ? 'has-error'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <label htmlFor="forgot-email">
                      Email đăng ký
                      <em>*</em>
                    </label>

                    <div className="dthl-forgot-input">
                      <Mail
                        size={19}
                        aria-hidden="true"
                      />

                      <input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(
                            event.target.value,
                          );

                          setEmailError('');
                          setFormError('');
                        }}
                        placeholder="ban@example.com"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck="false"
                        autoFocus
                        disabled={loading}
                        aria-invalid={Boolean(
                          emailError,
                        )}
                        aria-describedby={
                          emailError
                            ? 'forgot-email-error'
                            : 'forgot-email-hint'
                        }
                      />
                    </div>

                    {emailError ? (
                      <small
                        id="forgot-email-error"
                        className="dthl-forgot-field__error"
                      >
                        {emailError}
                      </small>
                    ) : (
                      <small
                        id="forgot-email-hint"
                        className="dthl-forgot-field__hint"
                      >
                        Hãy sử dụng đúng email
                        bạn đã dùng để đăng ký
                        tài khoản.
                      </small>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="dthl-forgot-submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="dthl-forgot-spinner" />
                        Đang gửi hướng dẫn...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Gửi hướng dẫn
                        <ArrowRight size={19} />
                      </>
                    )}
                  </button>

                  <p className="dthl-forgot-switch">
                    Đã nhớ mật khẩu?
                    <Link to="/dang-nhap">
                      Quay lại đăng nhập
                    </Link>
                  </p>
                </form>

                <div className="dthl-forgot-card__security">
                  <ShieldCheck size={16} />

                  <span>
                    Vì lý do bảo mật, hệ thống
                    luôn hiển thị cùng một thông
                    báo dù email có tồn tại hay
                    không.
                  </span>
                </div>
              </>
            )}
          </div>

          <p className="dthl-forgot-mobile-footer">
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