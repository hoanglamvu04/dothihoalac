import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronUp,
  Clock3,
  Copy,
  Eye,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import ArticleBody from '../../components/content/ArticleBody';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';

import { jobApi } from '../../api/content.api';
import { useToast } from '../../context/ToastContext';

import {
  EXPERIENCE_LEVELS,
  JOB_TYPES,
} from '../../utils/constants';

import {
  formatCurrency,
  formatDate,
} from '../../utils/formatters';

import './JobDetailPage.css';

const SALARY_UNIT_LABELS = {
  month: '/tháng',
  monthly: '/tháng',
  hour: '/giờ',
  hourly: '/giờ',
  day: '/ngày',
  daily: '/ngày',
  shift: '/ca',
  project: '/dự án',
  year: '/năm',
  yearly: '/năm',
};

function getViewCount(item) {
  return Number(
    item?.stats?.viewCount ??
      item?.viewCount ??
      0,
  );
}

function getTaxonomyValue(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return (
    value.slug ||
    value._id ||
    value.id ||
    ''
  );
}

function formatSalary(job) {
  const salaryUnit =
    String(job?.salaryUnit || '')
      .trim()
      .toLowerCase();

  const salaryMin =
    Number(job?.salaryMin || 0);

  const salaryMax =
    Number(job?.salaryMax || 0);

  if (
    salaryUnit === 'negotiable' ||
    (!salaryMin && !salaryMax)
  ) {
    return 'Thỏa thuận';
  }

  const suffix =
    SALARY_UNIT_LABELS[salaryUnit] ||
    '';

  if (
    salaryMin > 0 &&
    salaryMax > 0 &&
    salaryMin !== salaryMax
  ) {
    return `${formatCurrency(
      salaryMin,
    )} – ${formatCurrency(
      salaryMax,
    )}${suffix}`;
  }

  const salary =
    salaryMax || salaryMin;

  return `${formatCurrency(
    salary,
  )}${suffix}`;
}

function getDeadlineStatus(deadline) {
  if (!deadline) {
    return {
      expired: false,
      label: 'Không giới hạn',
      remainingDays: null,
    };
  }

  const deadlineDate =
    new Date(deadline);

  if (
    Number.isNaN(
      deadlineDate.getTime(),
    )
  ) {
    return {
      expired: false,
      label: formatDate(deadline),
      remainingDays: null,
    };
  }

  deadlineDate.setHours(
    23,
    59,
    59,
    999,
  );

  const now = new Date();

  const difference =
    deadlineDate.getTime() -
    now.getTime();

  const remainingDays =
    Math.ceil(
      difference /
        (24 * 60 * 60 * 1000),
    );

  if (remainingDays < 0) {
    return {
      expired: true,
      label: 'Đã hết hạn',
      remainingDays,
    };
  }

  if (remainingDays === 0) {
    return {
      expired: false,
      label: 'Hết hạn hôm nay',
      remainingDays: 0,
    };
  }

  return {
    expired: false,
    label: `Còn ${remainingDays} ngày`,
    remainingDays,
  };
}

async function copyText(value) {
  if (
    navigator.clipboard?.writeText
  ) {
    await navigator.clipboard.writeText(
      value,
    );

    return;
  }

  const textarea =
    document.createElement(
      'textarea',
    );

  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents =
    'none';

  document.body.appendChild(
    textarea,
  );

  textarea.focus();
  textarea.select();

  document.execCommand('copy');

  textarea.remove();
}

function isCanceledRequest(error) {
  return (
    error?.name === 'CanceledError' ||
    error?.code === 'ERR_CANCELED'
  );
}

export default function JobDetailPage() {
  const { slug } = useParams();
  const toast = useToast();

  const pageRef = useRef(null);
  const progressBarRef = useRef(null);

  const [item, setItem] =
    useState(null);

  const [error, setError] =
    useState(null);

  const [copiedLink, setCopiedLink] =
    useState(false);

  const [copiedEmail, setCopiedEmail] =
    useState(false);

  const [showScrollTop, setShowScrollTop] =
    useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setItem(null);
    setError(null);
    setCopiedLink(false);
    setCopiedEmail(false);
    setShowScrollTop(false);

    if (progressBarRef.current) {
      progressBarRef.current.style.transform = 'scaleX(0)';
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });

    jobApi
      .detail(slug, {
        signal: controller.signal,
      })
      .then((result) => {
        if (active) {
          setItem(result);
        }
      })
      .catch((requestError) => {
        if (
          active &&
          !isCanceledRequest(requestError)
        ) {
          setError(requestError);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [slug]);

  const job = item?.job || {};

  const salary = useMemo(
    () => formatSalary(job),
    [job],
  );

  const deadlineStatus = useMemo(
    () =>
      getDeadlineStatus(
        job.deadline,
      ),
    [job.deadline],
  );

  const jobTypeLabel =
    JOB_TYPES[job.jobType] ||
    'Việc làm';

  const experienceLabel =
    EXPERIENCE_LEVELS[
      job.experienceLevel
    ] || 'Không yêu cầu';

  const companyName =
    job.companyName ||
    'Nhà tuyển dụng';

  const workLocation =
    job.workLocation ||
    item?.primaryAreaId?.name ||
    'Hòa Lạc';

  const areaValue =
    getTaxonomyValue(
      item?.primaryAreaId,
    );

  const publishedAt =
    item?.publishedAt ||
    item?.createdAt;

  const updatedAt =
    item?.updatedAt;

  const viewCount =
    getViewCount(item);

  const wasUpdated = useMemo(() => {
    if (
      !publishedAt ||
      !updatedAt
    ) {
      return false;
    }

    const publishedTime =
      new Date(
        publishedAt,
      ).getTime();

    const updatedTime =
      new Date(
        updatedAt,
      ).getTime();

    if (
      Number.isNaN(publishedTime) ||
      Number.isNaN(updatedTime)
    ) {
      return false;
    }

    return (
      updatedTime -
        publishedTime >
      60 * 1000
    );
  }, [
    publishedAt,
    updatedAt,
  ]);

  useEffect(() => {
    if (!item) {
      return undefined;
    }

    let animationFrame = null;

    const calculateProgress = () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame,
        );
      }

      animationFrame =
        requestAnimationFrame(() => {
          const root =
            pageRef.current;

          if (!root) {
            return;
          }

          const rootTop =
            root.getBoundingClientRect()
              .top + window.scrollY;

          const rootHeight =
            root.offsetHeight;

          const start =
            rootTop - 100;

          const end =
            rootTop +
            rootHeight -
            window.innerHeight * 0.7;

          const distance =
            Math.max(
              end - start,
              1,
            );

          const progress =
            (window.scrollY - start) /
            distance;

          const clampedProgress =
            Math.min(
              Math.max(progress, 0),
              1,
            );

          if (progressBarRef.current) {
            progressBarRef.current.style.transform =
              `scaleX(${clampedProgress})`;
          }

          const shouldShowScrollTop =
            clampedProgress > 0.35;

          setShowScrollTop((current) =>
            current === shouldShowScrollTop
              ? current
              : shouldShowScrollTop,
          );
        });
    };

    calculateProgress();

    window.addEventListener(
      'scroll',
      calculateProgress,
      {
        passive: true,
      },
    );

    window.addEventListener(
      'resize',
      calculateProgress,
    );

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame,
        );
      }

      window.removeEventListener(
        'scroll',
        calculateProgress,
      );

      window.removeEventListener(
        'resize',
        calculateProgress,
      );
    };
  }, [item]);

  const handleCopyLink =
    useCallback(async () => {
      try {
        await copyText(
          window.location.href,
        );

        setCopiedLink(true);

        toast.success(
          'Đã sao chép liên kết việc làm.',
        );

        window.setTimeout(() => {
          setCopiedLink(false);
        }, 1800);
      } catch {
        toast.error(
          'Không thể sao chép liên kết.',
        );
      }
    }, [toast]);

  const handleCopyEmail =
    useCallback(async () => {
      if (!job.contactEmail) {
        return;
      }

      try {
        await copyText(
          job.contactEmail,
        );

        setCopiedEmail(true);

        toast.success(
          'Đã sao chép email tuyển dụng.',
        );

        window.setTimeout(() => {
          setCopiedEmail(false);
        }, 1800);
      } catch {
        toast.error(
          'Không thể sao chép email.',
        );
      }
    }, [
      job.contactEmail,
      toast,
    ]);

  const handleShare =
    useCallback(async () => {
      const shareData = {
        title: item?.title,
        text:
          item?.summary ||
          `${jobTypeLabel} tại ${companyName}`,
        url: window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(
            shareData,
          );
        } catch (shareError) {
          if (
            shareError?.name !==
            'AbortError'
          ) {
            toast.error(
              'Không thể mở chức năng chia sẻ.',
            );
          }
        }

        return;
      }

      await handleCopyLink();
    }, [
      companyName,
      handleCopyLink,
      item,
      jobTypeLabel,
      toast,
    ]);

  if (!item && !error) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <section className="job-detail-error">
        <div className="job-detail-container">
          <ErrorState
            error={error}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={pageRef}
      className="job-detail-page"
    >
      <Seo
        title={item.title}
        description={item.summary}
      />

      <div
        className="job-reading-progress"
        aria-hidden="true"
      >
        <span ref={progressBarRef} />
      </div>

      <div className="job-detail-container">
        <nav
          className="job-detail-breadcrumb"
          aria-label="Điều hướng việc làm"
        >
          <Link to="/viec-lam">
            <ArrowLeft size={16} />
            Việc làm
          </Link>

          <span>/</span>

          {job.jobType ? (
            <Link
              to={`/viec-lam?type=${encodeURIComponent(
                job.jobType,
              )}`}
            >
              {jobTypeLabel}
            </Link>
          ) : (
            <span>
              {jobTypeLabel}
            </span>
          )}
        </nav>

        <header className="job-detail-header">
          <div className="job-detail-company-logo">
            <BriefcaseBusiness
              size={38}
            />
          </div>

          <div className="job-detail-header__content">
            <div className="job-detail-labels">
              <Badge tone="soft">
                {jobTypeLabel}
              </Badge>

              {deadlineStatus.expired ? (
                <span className="job-deadline-badge is-expired">
                  <Clock3 size={15} />
                  Đã hết hạn
                </span>
              ) : (
                <span className="job-deadline-badge">
                  <Clock3 size={15} />
                  {deadlineStatus.label}
                </span>
              )}
            </div>

            <h1>{item.title}</h1>

            <div className="job-detail-company">
              <Building2 size={17} />

              <strong>
                {companyName}
              </strong>
            </div>

            <div className="job-detail-header-meta">
              <span>
                <CalendarDays
                  size={16}
                />

                Đăng ngày{' '}
                {formatDate(
                  publishedAt,
                )}
              </span>

              {wasUpdated ? (
                <span>
                  <Clock3 size={16} />

                  Cập nhật{' '}
                  {formatDate(
                    updatedAt,
                  )}
                </span>
              ) : null}

              <span>
                <Eye size={16} />

                {viewCount.toLocaleString(
                  'vi-VN',
                )}{' '}
                lượt xem
              </span>
            </div>
          </div>

          <div className="job-detail-header__actions">
            <button
              type="button"
              onClick={handleShare}
            >
              <Share2 size={17} />
              Chia sẻ
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <Check size={17} />
              ) : (
                <Copy size={17} />
              )}

              {copiedLink
                ? 'Đã sao chép'
                : 'Sao chép link'}
            </button>
          </div>
        </header>

        <div className="job-detail-layout">
          <main className="job-detail-main">
            <section className="job-facts-section">
              <div className="job-section-heading">
                <span>
                  <BriefcaseBusiness
                    size={20}
                  />
                </span>

                <div>
                  <h2>
                    Thông tin tuyển dụng
                  </h2>

                  <p>
                    Các thông tin chính về
                    vị trí đang tuyển.
                  </p>
                </div>
              </div>

              <div className="job-facts-grid">
                <article>
                  <span>
                    <MapPin size={22} />
                  </span>

                  <div>
                    <small>
                      Địa điểm
                    </small>

                    <strong>
                      {workLocation}
                    </strong>
                  </div>
                </article>

                <article>
                  <span>
                    <GraduationCap
                      size={22}
                    />
                  </span>

                  <div>
                    <small>
                      Kinh nghiệm
                    </small>

                    <strong>
                      {experienceLabel}
                    </strong>
                  </div>
                </article>

                <article>
                  <span>
                    <Users size={22} />
                  </span>

                  <div>
                    <small>
                      Số lượng tuyển
                    </small>

                    <strong>
                      {job.positionsCount ||
                        1}{' '}
                      người
                    </strong>
                  </div>
                </article>

                <article>
                  <span>
                    <CalendarDays
                      size={22}
                    />
                  </span>

                  <div>
                    <small>
                      Hạn nộp hồ sơ
                    </small>

                    <strong>
                      {job.deadline
                        ? formatDate(
                            job.deadline,
                          )
                        : 'Không giới hạn'}
                    </strong>
                  </div>
                </article>

                <article>
                  <span>
                    <WalletCards
                      size={22}
                    />
                  </span>

                  <div>
                    <small>
                      Mức lương
                    </small>

                    <strong>
                      {salary}
                    </strong>
                  </div>
                </article>

                <article>
                  <span>
                    <BriefcaseBusiness
                      size={22}
                    />
                  </span>

                  <div>
                    <small>
                      Loại công việc
                    </small>

                    <strong>
                      {jobTypeLabel}
                    </strong>
                  </div>
                </article>
              </div>
            </section>

            <section className="job-description-section">
              <div className="job-section-heading">
                <span>
                  <BadgeCheck
                    size={20}
                  />
                </span>

                <div>
                  <h2>
                    Mô tả công việc
                  </h2>

                  <p>
                    Trách nhiệm, yêu cầu và
                    quyền lợi của vị trí.
                  </p>
                </div>
              </div>

              {item.summary ? (
                <p className="job-description-lead">
                  {item.summary}
                </p>
              ) : null}

              <div className="job-description-body">
                <ArticleBody
                  html={
                    item.body?.bodyHtml ||
                    item.bodyHtml
                  }
                />
              </div>
            </section>

            {job.applicationMethod ? (
              <section className="job-application-method">
                <div className="job-section-heading">
                  <span>
                    <Mail size={20} />
                  </span>

                  <div>
                    <h2>
                      Cách thức ứng tuyển
                    </h2>

                    <p>
                      Thực hiện theo hướng
                      dẫn của nhà tuyển
                      dụng.
                    </p>
                  </div>
                </div>

                <div className="job-application-method__content">
                  <CheckCircle2
                    size={21}
                  />

                  <p>
                    {job.applicationMethod}
                  </p>
                </div>
              </section>
            ) : null}

            <section className="job-safety-notice">
              <span>
                <ShieldAlert size={23} />
              </span>

              <div>
                <strong>
                  Lưu ý an toàn khi tìm việc
                </strong>

                <p>
                  Không chuyển tiền, đóng
                  phí tuyển dụng hoặc cung
                  cấp mã OTP. Hãy xác minh
                  doanh nghiệp và địa điểm
                  làm việc trước khi gửi
                  giấy tờ cá nhân.
                </p>
              </div>
            </section>
          </main>

          <aside className="job-detail-sidebar">
            <div className="job-detail-sidebar__content">
              <section
                className={[
                  'job-apply-card',
                  deadlineStatus.expired
                    ? 'is-expired'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="job-apply-card__salary">
                  <span>
                    Mức lương
                  </span>

                  <strong>
                    {salary}
                  </strong>

                  <small>
                    Theo thông tin nhà tuyển
                    dụng
                  </small>
                </div>

                <div className="job-apply-card__company">
                  <span>
                    <Building2
                      size={20}
                    />
                  </span>

                  <div>
                    <small>
                      Nhà tuyển dụng
                    </small>

                    <strong>
                      {companyName}
                    </strong>
                  </div>
                </div>

                {deadlineStatus.expired ? (
                  <div className="job-apply-expired">
                    <Clock3 size={18} />

                    <div>
                      <strong>
                        Tin tuyển dụng đã
                        hết hạn
                      </strong>

                      <p>
                        Hãy liên hệ trước để
                        xác nhận doanh nghiệp
                        còn tuyển vị trí này.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="job-apply-deadline">
                    <CalendarDays
                      size={18}
                    />

                    <div>
                      <small>
                        Hạn nhận hồ sơ
                      </small>

                      <strong>
                        {job.deadline
                          ? formatDate(
                              job.deadline,
                            )
                          : 'Không giới hạn'}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="job-apply-card__contacts">
                  <h2>
                    Thông tin ứng tuyển
                  </h2>

                  {job.contactEmail ? (
                    <a
                      href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(
                        `Ứng tuyển: ${item.title}`,
                      )}`}
                    >
                      <Mail size={18} />

                      <span>
                        <small>
                          Gửi hồ sơ qua email
                        </small>

                        <strong>
                          {job.contactEmail}
                        </strong>
                      </span>
                    </a>
                  ) : null}

                  {job.contactPhone ? (
                    <a
                      href={`tel:${job.contactPhone}`}
                    >
                      <Phone size={18} />

                      <span>
                        <small>
                          Liên hệ tuyển dụng
                        </small>

                        <strong>
                          {job.contactPhone}
                        </strong>
                      </span>
                    </a>
                  ) : null}

                  {job.contactEmail ? (
                    <button
                      type="button"
                      onClick={
                        handleCopyEmail
                      }
                    >
                      {copiedEmail ? (
                        <Check size={17} />
                      ) : (
                        <Copy size={17} />
                      )}

                      {copiedEmail
                        ? 'Đã sao chép email'
                        : 'Sao chép email'}
                    </button>
                  ) : null}

                  {!job.contactEmail &&
                  !job.contactPhone ? (
                    <div className="job-contact-empty">
                      <Mail size={18} />

                      Chưa có thông tin liên
                      hệ
                    </div>
                  ) : null}
                </div>

                <small className="job-apply-card__note">
                  Khi liên hệ, hãy nói bạn
                  xem tin trên Đô Thị Hòa
                  Lạc để nhà tuyển dụng dễ
                  nhận biết.
                </small>
              </section>

              <section className="job-sidebar-card job-sidebar-summary">
                <div className="job-sidebar-heading">
                  <BriefcaseBusiness
                    size={19}
                  />

                  <h2>
                    Tóm tắt công việc
                  </h2>
                </div>

                <dl>
                  <div>
                    <dt>
                      <BriefcaseBusiness
                        size={16}
                      />
                      Loại việc
                    </dt>

                    <dd>
                      {jobTypeLabel}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <GraduationCap
                        size={16}
                      />
                      Kinh nghiệm
                    </dt>

                    <dd>
                      {experienceLabel}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <Users size={16} />
                      Số lượng
                    </dt>

                    <dd>
                      {job.positionsCount ||
                        1}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <MapPin size={16} />
                      Khu vực
                    </dt>

                    <dd>
                      {areaValue ? (
                        <Link
                          to={`/viec-lam?area=${encodeURIComponent(
                            areaValue,
                          )}`}
                        >
                          {item
                            .primaryAreaId
                            ?.name ||
                            workLocation}
                        </Link>
                      ) : (
                        item.primaryAreaId
                          ?.name ||
                        workLocation
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <CalendarDays
                        size={16}
                      />
                      Hạn nộp
                    </dt>

                    <dd>
                      {job.deadline
                        ? formatDate(
                            job.deadline,
                          )
                        : 'Không giới hạn'}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="job-sidebar-card job-sidebar-safety">
                <div className="job-sidebar-heading">
                  <ShieldCheck
                    size={19}
                  />

                  <div>
                    <h2>
                      Tuyển dụng an toàn
                    </h2>

                    <p>
                      Xác minh trước khi gửi
                      hồ sơ cá nhân.
                    </p>
                  </div>
                </div>

                <ul>
                  <li>
                    Không đóng phí để được
                    phỏng vấn hoặc nhận việc.
                  </li>

                  <li>
                    Không cung cấp mã OTP,
                    mật khẩu hoặc thông tin
                    ngân hàng.
                  </li>

                  <li>
                    Kiểm tra email, số điện
                    thoại và địa chỉ doanh
                    nghiệp.
                  </li>

                  <li>
                    Đọc kỹ hợp đồng trước
                    khi bắt đầu làm việc.
                  </li>
                </ul>
              </section>

              <section className="job-sidebar-card job-sidebar-share">
                <div className="job-sidebar-heading">
                  <Share2 size={19} />

                  <div>
                    <h2>
                      Chia sẻ cơ hội
                    </h2>

                    <p>
                      Gửi việc làm này tới
                      người đang có nhu cầu.
                    </p>
                  </div>
                </div>

                <div className="job-sidebar-share__actions">
                  <button
                    type="button"
                    onClick={handleShare}
                  >
                    <Share2 size={17} />
                    Chia sẻ
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? (
                      <Check size={17} />
                    ) : (
                      <Copy size={17} />
                    )}

                    {copiedLink
                      ? 'Đã sao chép'
                      : 'Sao chép'}
                  </button>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>

      {showScrollTop ? (
        <button
          type="button"
          className="job-scroll-top"
          aria-label="Quay lên đầu trang"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            })
          }
        >
          <ChevronUp size={21} />
        </button>
      ) : null}
    </section>
  );
}
