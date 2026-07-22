import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  ImagePlus,
  Info,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Tags,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import RichTextEditor from '../../components/forms/RichTextEditor';
import MediaUploader from '../../components/forms/MediaUploader';
import TaxonomyFields from '../../components/forms/TaxonomyFields';

import { jobApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

import {
  EXPERIENCE_LEVELS,
  JOB_TYPES,
} from '../../utils/constants';

import { toNumber } from '../../utils/validators';

import './JobEditorPage.css';

const TITLE_MIN_LENGTH = 5;
const TITLE_MAX_LENGTH = 250;
const SUMMARY_MAX_LENGTH = 1000;

const SALARY_UNITS = {
  month: 'Theo tháng',
  hour: 'Theo giờ',
  day: 'Theo ngày',
  project: 'Theo dự án',
  negotiable: 'Thỏa thuận',
};

const JOB_TYPE_DESCRIPTIONS = {
  full_time:
    'Công việc toàn thời gian, phù hợp với nhu cầu tuyển dụng nhân sự ổn định.',

  part_time:
    'Công việc bán thời gian, linh hoạt về lịch làm việc hoặc số ca.',

  internship:
    'Vị trí thực tập dành cho sinh viên hoặc người cần tích lũy kinh nghiệm.',

  temporary:
    'Công việc thời vụ hoặc có thời gian làm việc ngắn hạn.',

  freelance:
    'Công việc tự do, cộng tác từ xa hoặc thực hiện theo đầu việc.',

  contract:
    'Công việc theo hợp đồng có thời hạn hoặc theo dự án cụ thể.',
};

function getTomorrowDate() {
  const date = new Date();

  date.setDate(date.getDate() + 1);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeId(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || null;
}

function normalizeIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map(normalizeId)
    .filter(Boolean);
}

function extractBodyHtml(source) {
  return (
    source?.body?.bodyHtml ||
    source?.body?.html ||
    source?.bodyHtml ||
    source?.contentHtml ||
    ''
  );
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDateInput(value) {
  if (!value) {
    return '';
  }

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getStorageKey(editingId) {
  return editingId
    ? `job-editor-draft:${editingId}`
    : 'job-editor-draft:new';
}

function buildInitialForm(source = {}) {
  const job = source.job || {};

  return {
    title: source.title || '',

    summary: source.summary || '',

    bodyHtml: extractBodyHtml(source),

    jobType:
      job.jobType ||
      source.jobType ||
      'full_time',

    companyName:
      job.companyName ||
      source.companyName ||
      '',

    salaryMin:
      job.salaryMin ??
      source.salaryMin ??
      '',

    salaryMax:
      job.salaryMax ??
      source.salaryMax ??
      '',

    salaryUnit:
      job.salaryUnit ||
      source.salaryUnit ||
      'month',

    experienceLevel:
      job.experienceLevel ||
      source.experienceLevel ||
      'none',

    workLocation:
      job.workLocation ||
      source.workLocation ||
      '',

    applicationMethod:
      job.applicationMethod ||
      source.applicationMethod ||
      '',

    contactEmail:
      job.contactEmail ||
      source.contactEmail ||
      '',

    contactPhone:
      job.contactPhone ||
      source.contactPhone ||
      '',

    deadline:
      normalizeDateInput(
        job.deadline ||
          source.deadline,
      ) || getTomorrowDate(),

    positionsCount:
      job.positionsCount ??
      source.positionsCount ??
      1,

    primaryAreaId:
      normalizeId(
        source.primaryAreaId,
      ) || '',

    tagIds: normalizeIds(
      source.tagIds,
    ),

    thumbnailMediaId:
      source.thumbnailMediaId ||
      null,
  };
}

function isValidEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

export default function JobEditorPage() {
  const [params] = useSearchParams();

  const editingId = params.get('edit');

  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const source =
    location.state?.item || {};

  const formTopRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const savedSnapshotRef = useRef('');

  const storageKey = useMemo(
    () => getStorageKey(editingId),
    [editingId],
  );

  const initialForm = useMemo(
    () => buildInitialForm(source),
    [source],
  );

  const [form, setForm] =
    useState(initialForm);

  const [loading, setLoading] =
    useState(false);

  const [
    validationErrors,
    setValidationErrors,
  ] = useState({});

  const [
    autoSaveStatus,
    setAutoSaveStatus,
  ] = useState('idle');

  const [
    hasLocalDraft,
    setHasLocalDraft,
  ] = useState(false);

  const [
    restoredDraft,
    setRestoredDraft,
  ] = useState(false);

  const formSnapshot = useMemo(
    () => JSON.stringify(form),
    [form],
  );

  const dirty =
    formSnapshot !==
    savedSnapshotRef.current;

  const bodyTextLength = useMemo(
    () =>
      stripHtml(form.bodyHtml).length,
    [form.bodyHtml],
  );

  const selectedJobType = useMemo(
    () => ({
      label:
        JOB_TYPES[form.jobType] ||
        'Việc làm',

      description:
        JOB_TYPE_DESCRIPTIONS[
          form.jobType
        ] ||
        'Cơ hội tuyển dụng dành cho người lao động tại Hòa Lạc.',
    }),
    [form.jobType],
  );

  const completionItems = useMemo(
    () => [
      {
        label: 'Tên vị trí',
        completed:
          form.title.trim().length >=
          TITLE_MIN_LENGTH,
      },
      {
        label: 'Đơn vị tuyển dụng',
        completed: Boolean(
          form.companyName.trim(),
        ),
      },
      {
        label: 'Mô tả công việc',
        completed:
          bodyTextLength > 0 ||
          Boolean(editingId),
      },
      {
        label: 'Địa điểm làm việc',
        completed: Boolean(
          form.workLocation.trim(),
        ),
      },
      {
        label: 'Hạn nộp hồ sơ',
        completed: Boolean(
          form.deadline,
        ),
      },
      {
        label: 'Thông tin ứng tuyển',
        completed: Boolean(
          form.applicationMethod.trim() ||
            form.contactEmail.trim() ||
            form.contactPhone.trim(),
        ),
      },
      {
        label: 'Ảnh đại diện',
        completed: Boolean(
          form.thumbnailMediaId,
        ),
        optional: true,
      },
    ],
    [
      bodyTextLength,
      editingId,
      form.applicationMethod,
      form.companyName,
      form.contactEmail,
      form.contactPhone,
      form.deadline,
      form.thumbnailMediaId,
      form.title,
      form.workLocation,
    ],
  );

  const completionPercent = useMemo(() => {
    const requiredItems =
      completionItems.filter(
        (item) => !item.optional,
      );

    const completedItems =
      requiredItems.filter(
        (item) => item.completed,
      );

    return Math.round(
      (completedItems.length /
        Math.max(
          requiredItems.length,
          1,
        )) *
        100,
    );
  }, [completionItems]);

  const change = useCallback(
    (key, value) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));

      setValidationErrors(
        (current) => {
          if (!current[key]) {
            return current;
          }

          const next = {
            ...current,
          };

          delete next[key];

          return next;
        },
      );
    },
    [],
  );

  useEffect(() => {
    savedSnapshotRef.current =
      JSON.stringify(initialForm);

    setForm(initialForm);
    setValidationErrors({});
    setRestoredDraft(false);
    setAutoSaveStatus('idle');

    try {
      const stored =
        window.localStorage.getItem(
          storageKey,
        );

      setHasLocalDraft(
        Boolean(stored),
      );
    } catch {
      setHasLocalDraft(false);
    }
  }, [
    initialForm,
    storageKey,
  ]);

  useEffect(() => {
    if (!dirty) {
      return undefined;
    }

    if (autoSaveTimerRef.current) {
      window.clearTimeout(
        autoSaveTimerRef.current,
      );
    }

    setAutoSaveStatus('saving');

    autoSaveTimerRef.current =
      window.setTimeout(() => {
        try {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({
              form,
              savedAt:
                new Date().toISOString(),
            }),
          );

          setHasLocalDraft(true);
          setAutoSaveStatus('saved');
        } catch {
          setAutoSaveStatus('error');
        }
      }, 700);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(
          autoSaveTimerRef.current,
        );
      }
    };
  }, [
    dirty,
    form,
    storageKey,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (
      event,
    ) => {
      if (!dirty || loading) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload,
      );
    };
  }, [
    dirty,
    loading,
  ]);

  const restoreLocalDraft =
    useCallback(() => {
      try {
        const stored =
          window.localStorage.getItem(
            storageKey,
          );

        if (!stored) {
          toast.error(
            'Không tìm thấy bản tự lưu.',
          );

          return;
        }

        const parsed =
          JSON.parse(stored);

        if (!parsed?.form) {
          throw new Error(
            'Invalid local draft.',
          );
        }

        setForm({
          ...initialForm,
          ...parsed.form,

          tagIds: normalizeIds(
            parsed.form.tagIds,
          ),
        });

        setRestoredDraft(true);

        toast.success(
          'Đã khôi phục bản tự lưu.',
        );
      } catch {
        toast.error(
          'Không thể khôi phục bản tự lưu.',
        );
      }
    }, [
      initialForm,
      storageKey,
      toast,
    ]);

  const clearLocalDraft =
    useCallback(() => {
      try {
        window.localStorage.removeItem(
          storageKey,
        );

        setHasLocalDraft(false);
        setRestoredDraft(false);
        setAutoSaveStatus('idle');

        toast.success(
          'Đã xóa bản tự lưu.',
        );
      } catch {
        toast.error(
          'Không thể xóa bản tự lưu.',
        );
      }
    }, [
      storageKey,
      toast,
    ]);

  const resetForm = useCallback(() => {
    const confirmed =
      window.confirm(
        'Bạn có chắc muốn xóa các thay đổi chưa lưu và đặt lại biểu mẫu?',
      );

    if (!confirmed) {
      return;
    }

    setForm(initialForm);
    setValidationErrors({});

    savedSnapshotRef.current =
      JSON.stringify(initialForm);

    try {
      window.localStorage.removeItem(
        storageKey,
      );
    } catch {
      // Không chặn việc đặt lại biểu mẫu.
    }

    setHasLocalDraft(false);
    setRestoredDraft(false);
    setAutoSaveStatus('idle');

    toast.success(
      'Đã đặt lại biểu mẫu.',
    );
  }, [
    initialForm,
    storageKey,
    toast,
  ]);

  const validate = useCallback(
    (submitAfter) => {
      const errors = {};

      const title =
        form.title.trim();

      if (!title) {
        errors.title =
          'Vui lòng nhập tên vị trí tuyển dụng.';
      } else if (
        title.length <
        TITLE_MIN_LENGTH
      ) {
        errors.title =
          `Tiêu đề cần ít nhất ${TITLE_MIN_LENGTH} ký tự.`;
      }

      if (
        title.length >
        TITLE_MAX_LENGTH
      ) {
        errors.title =
          `Tiêu đề không được vượt quá ${TITLE_MAX_LENGTH} ký tự.`;
      }

      if (!form.companyName.trim()) {
        errors.companyName =
          'Vui lòng nhập tên công ty hoặc người tuyển dụng.';
      }

      if (
        form.summary.length >
        SUMMARY_MAX_LENGTH
      ) {
        errors.summary =
          `Mô tả ngắn không được vượt quá ${SUMMARY_MAX_LENGTH} ký tự.`;
      }

      if (
        submitAfter &&
        !editingId &&
        bodyTextLength === 0
      ) {
        errors.bodyHtml =
          'Vui lòng nhập mô tả công việc.';
      }

      const salaryMin =
        form.salaryMin === ''
          ? null
          : toNumber(
              form.salaryMin,
            );

      const salaryMax =
        form.salaryMax === ''
          ? null
          : toNumber(
              form.salaryMax,
            );

      if (
        salaryMin !== null &&
        salaryMin < 0
      ) {
        errors.salaryMin =
          'Mức lương tối thiểu không hợp lệ.';
      }

      if (
        salaryMax !== null &&
        salaryMax < 0
      ) {
        errors.salaryMax =
          'Mức lương tối đa không hợp lệ.';
      }

      if (
        salaryMin !== null &&
        salaryMax !== null &&
        salaryMax < salaryMin
      ) {
        errors.salaryMax =
          'Mức lương tối đa phải lớn hơn hoặc bằng mức lương tối thiểu.';
      }

      if (
        Number(
          form.positionsCount,
        ) < 1
      ) {
        errors.positionsCount =
          'Số lượng tuyển phải từ 1 trở lên.';
      }

      if (!form.deadline) {
        errors.deadline =
          'Vui lòng chọn hạn nộp hồ sơ.';
      }

      if (!form.workLocation.trim()) {
        errors.workLocation =
          'Vui lòng nhập địa điểm làm việc.';
      }

      if (
        form.contactEmail &&
        !isValidEmail(
          form.contactEmail.trim(),
        )
      ) {
        errors.contactEmail =
          'Địa chỉ email không hợp lệ.';
      }

      if (
        submitAfter &&
        !form.applicationMethod.trim() &&
        !form.contactEmail.trim() &&
        !form.contactPhone.trim()
      ) {
        errors.applicationMethod =
          'Vui lòng cung cấp ít nhất một cách thức ứng tuyển, email hoặc số điện thoại.';
      }

      setValidationErrors(errors);

      const firstError =
        Object.values(errors)[0];

      if (firstError) {
        formTopRef.current?.scrollIntoView(
          {
            behavior: 'smooth',
            block: 'start',
          },
        );

        toast.error(firstError);

        return false;
      }

      return true;
    },
    [
      bodyTextLength,
      editingId,
      form,
      toast,
    ],
  );

  const buildPayload =
    useCallback(() => {
      const salaryMin =
        form.salaryUnit ===
          'negotiable' ||
        form.salaryMin === ''
          ? null
          : toNumber(
              form.salaryMin,
            );

      const salaryMax =
        form.salaryUnit ===
          'negotiable' ||
        form.salaryMax === ''
          ? null
          : toNumber(
              form.salaryMax,
            );

      const thumbnailMediaId =
        normalizeId(
          form.thumbnailMediaId,
        );

      const nextPayload = {
        title: form.title.trim(),

        summary:
          form.summary.trim() ||
          undefined,

        jobType: form.jobType,

        companyName:
          form.companyName.trim(),

        salaryMin,

        salaryMax,

        salaryUnit:
          form.salaryUnit,

        experienceLevel:
          form.experienceLevel,

        workLocation:
          form.workLocation.trim(),

        applicationMethod:
          form.applicationMethod.trim(),

        contactEmail:
          form.contactEmail.trim(),

        contactPhone:
          form.contactPhone.trim(),

        deadline:
          form.deadline || null,

        positionsCount: Math.max(
          toNumber(
            form.positionsCount,
            1,
          ),
          1,
        ),

        primaryAreaId:
          form.primaryAreaId ||
          null,

        tagIds: normalizeIds(
          form.tagIds,
        ),

        thumbnailMediaId,
      };

      const normalizedBody =
        form.bodyHtml?.trim();

      /*
       * Khi chỉnh sửa mà server chưa trả bodyHtml:
       * không gửi bodyHtml rỗng để tránh ghi đè
       * nội dung cũ trong database.
       */
      if (
        normalizedBody ||
        !editingId
      ) {
        nextPayload.bodyHtml =
          normalizedBody || '';
      }

      return nextPayload;
    },
    [
      editingId,
      form,
    ],
  );

  const save = useCallback(
    async (submitAfter = false) => {
      if (
        loading ||
        !validate(submitAfter)
      ) {
        return;
      }

      setLoading(true);

      try {
        const nextPayload =
          buildPayload();

        let content;

        if (editingId) {
          content =
            await jobApi.update(
              editingId,
              nextPayload,
            );
        } else {
          content =
            await jobApi.create(
              nextPayload,
            );
        }

        const contentId =
          content?._id ||
          content?.id ||
          editingId;

        if (
          submitAfter &&
          contentId
        ) {
          await jobApi.submit(
            contentId,
          );
        }

        savedSnapshotRef.current =
          JSON.stringify(form);

        try {
          window.localStorage.removeItem(
            storageKey,
          );
        } catch {
          // Không chặn luồng lưu lên server.
        }

        setHasLocalDraft(false);
        setAutoSaveStatus('idle');

        toast.success(
          submitAfter
            ? 'Đã gửi tin tuyển dụng đi duyệt.'
            : 'Đã lưu bản nháp.',
        );

        navigate(
          '/tai-khoan/bai-viet',
        );
      } catch (error) {
        toast.error(
          apiErrorMessage(error),
        );
      } finally {
        setLoading(false);
      }
    },
    [
      buildPayload,
      editingId,
      form,
      loading,
      navigate,
      storageKey,
      toast,
      validate,
    ],
  );

  const handleBack =
    useCallback(() => {
      if (dirty) {
        const confirmed =
          window.confirm(
            'Bạn đang có thay đổi chưa lưu. Bạn vẫn muốn rời khỏi trang?',
          );

        if (!confirmed) {
          return;
        }
      }

      if (
        window.history.state?.idx > 0
      ) {
        navigate(-1);

        return;
      }

      navigate('/dang-bai');
    }, [
      dirty,
      navigate,
    ]);

  return (
    <section className="job-editor-page">
      <Seo
        title={
          editingId
            ? 'Chỉnh sửa tin tuyển dụng'
            : 'Đăng tin tuyển dụng'
        }
        description="Đăng tin tuyển dụng, việc làm, thực tập và công việc thời vụ tại khu vực Hòa Lạc."
      />

      <div className="job-editor-container">
        <nav className="job-editor-breadcrumb">
          <button
            type="button"
            onClick={handleBack}
          >
            <ArrowLeft size={17} />
            Quay lại
          </button>

          <span>/</span>

          <Link to="/dang-bai">
            Trung tâm đăng nội dung
          </Link>

          <span>/</span>

          <span>
            {editingId
              ? 'Chỉnh sửa việc làm'
              : 'Đăng tin việc làm'}
          </span>
        </nav>

        <header className="job-editor-hero">
          <div className="job-editor-hero__icon">
            <BriefcaseBusiness
              size={35}
            />
          </div>

          <div className="job-editor-hero__content">
            <span className="job-editor-hero__eyebrow">
              <Building2 size={16} />
              Tuyển dụng tại Hòa Lạc
            </span>

            <h1>
              {editingId
                ? 'Chỉnh sửa tin tuyển dụng'
                : 'Đăng tin tuyển dụng'}
            </h1>

            <p>
              Cung cấp rõ vị trí, đơn vị
              tuyển dụng, mức lương, địa
              điểm làm việc và cách ứng
              tuyển.
            </p>
          </div>

          <div className="job-editor-hero__status">
            <div>
              <span>
                Hoàn thiện biểu mẫu
              </span>

              <strong>
                {completionPercent}%
              </strong>
            </div>

            <div className="job-editor-progress">
              <span
                style={{
                  width: `${completionPercent}%`,
                }}
              />
            </div>

            <small>
              {autoSaveStatus ===
              'saving'
                ? 'Đang tự lưu...'
                : autoSaveStatus ===
                    'saved'
                  ? 'Đã tự lưu trên thiết bị'
                  : autoSaveStatus ===
                      'error'
                    ? 'Không thể tự lưu'
                    : dirty
                      ? 'Có thay đổi chưa lưu'
                      : 'Chưa có thay đổi'}
            </small>
          </div>
        </header>

        {hasLocalDraft &&
        !restoredDraft ? (
          <section className="job-editor-restore">
            <div>
              <RefreshCcw size={21} />

              <div>
                <strong>
                  Có bản tự lưu trên thiết
                  bị
                </strong>

                <p>
                  Bạn có thể khôi phục dữ
                  liệu đã nhập trước đó hoặc
                  tiếp tục với biểu mẫu hiện
                  tại.
                </p>
              </div>
            </div>

            <div className="job-editor-restore__actions">
              <button
                type="button"
                onClick={
                  restoreLocalDraft
                }
              >
                Khôi phục
              </button>

              <button
                type="button"
                onClick={clearLocalDraft}
              >
                Xóa bản tự lưu
              </button>
            </div>
          </section>
        ) : null}

        <div className="job-editor-layout">
          <main
            ref={formTopRef}
            className="job-editor-main"
          >
            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span>
                  <BriefcaseBusiness
                    size={22}
                  />
                </span>

                <div>
                  <small>Bước 1</small>

                  <h2>
                    Thông tin tuyển dụng
                  </h2>

                  <p>
                    Chọn loại việc và cung
                    cấp thông tin đơn vị
                    tuyển dụng.
                  </p>
                </div>
              </header>

              <div className="job-editor-grid job-editor-grid--2">
                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="job-type">
                      Loại việc
                      <span>*</span>
                    </label>
                  </div>

                  <select
                    id="job-type"
                    value={form.jobType}
                    onChange={(event) =>
                      change(
                        'jobType',
                        event.target.value,
                      )
                    }
                  >
                    {Object.entries(
                      JOB_TYPES,
                    ).map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="company-name">
                      Tên công ty/người tuyển
                      <span>*</span>
                    </label>
                  </div>

                  <input
                    id="company-name"
                    value={form.companyName}
                    maxLength="250"
                    placeholder="Ví dụ: Công ty Cổ phần ABC"
                    className={
                      validationErrors.companyName
                        ? 'has-error'
                        : ''
                    }
                    onChange={(event) =>
                      change(
                        'companyName',
                        event.target.value,
                      )
                    }
                  />

                  {validationErrors.companyName ? (
                    <p className="job-field-error">
                      {
                        validationErrors.companyName
                      }
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="job-selected-type">
                <BriefcaseBusiness
                  size={19}
                />

                <div>
                  <strong>
                    {
                      selectedJobType.label
                    }
                  </strong>

                  <p>
                    {
                      selectedJobType.description
                    }
                  </p>
                </div>
              </div>
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span>
                  <FileText size={22} />
                </span>

                <div>
                  <small>Bước 2</small>

                  <h2>
                    Vị trí và mô tả công việc
                  </h2>

                  <p>
                    Viết tiêu đề rõ ràng và
                    mô tả đầy đủ công việc,
                    yêu cầu, quyền lợi.
                  </p>
                </div>
              </header>

              <div className="job-editor-field">
                <div className="job-editor-field__label">
                  <label htmlFor="job-title">
                    Tiêu đề tuyển dụng
                    <span>*</span>
                  </label>

                  <small>
                    {form.title.length}/
                    {TITLE_MAX_LENGTH}
                  </small>
                </div>

                <input
                  id="job-title"
                  value={form.title}
                  minLength={
                    TITLE_MIN_LENGTH
                  }
                  maxLength={
                    TITLE_MAX_LENGTH
                  }
                  placeholder="Ví dụ: Tuyển nhân viên kinh doanh bất động sản tại Hòa Lạc"
                  className={
                    validationErrors.title
                      ? 'has-error'
                      : ''
                  }
                  onChange={(event) =>
                    change(
                      'title',
                      event.target.value,
                    )
                  }
                />

                {validationErrors.title ? (
                  <p className="job-field-error">
                    {
                      validationErrors.title
                    }
                  </p>
                ) : (
                  <p className="job-field-hint">
                    Nên gồm vị trí, lĩnh vực
                    hoặc khu vực làm việc.
                  </p>
                )}
              </div>

              <div className="job-editor-field">
                <div className="job-editor-field__label">
                  <label htmlFor="job-summary">
                    Mô tả ngắn
                  </label>

                  <small>
                    {form.summary.length}/
                    {SUMMARY_MAX_LENGTH}
                  </small>
                </div>

                <textarea
                  id="job-summary"
                  rows="4"
                  value={form.summary}
                  maxLength={
                    SUMMARY_MAX_LENGTH
                  }
                  placeholder="Tóm tắt vị trí, yêu cầu chính và quyền lợi nổi bật."
                  className={
                    validationErrors.summary
                      ? 'has-error'
                      : ''
                  }
                  onChange={(event) =>
                    change(
                      'summary',
                      event.target.value,
                    )
                  }
                />

                {validationErrors.summary ? (
                  <p className="job-field-error">
                    {
                      validationErrors.summary
                    }
                  </p>
                ) : null}
              </div>

              <div className="job-editor-field">
                <div className="job-editor-field__label">
                  <label>
                    Mô tả công việc
                    {!editingId ? (
                      <span>*</span>
                    ) : null}
                  </label>

                  <small>
                    {bodyTextLength.toLocaleString(
                      'vi-VN',
                    )}{' '}
                    ký tự
                  </small>
                </div>

                <div
                  className={
                    validationErrors.bodyHtml
                      ? 'job-rich-editor has-error'
                      : 'job-rich-editor'
                  }
                >
                  <RichTextEditor
                    value={form.bodyHtml}
                    onChange={(value) =>
                      change(
                        'bodyHtml',
                        value,
                      )
                    }
                  />
                </div>

                {validationErrors.bodyHtml ? (
                  <p className="job-field-error">
                    {
                      validationErrors.bodyHtml
                    }
                  </p>
                ) : (
                  <p className="job-field-hint">
                    Nên trình bày trách
                    nhiệm, yêu cầu, quyền
                    lợi và thời gian làm
                    việc theo từng mục.
                  </p>
                )}
              </div>
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span>
                  <CircleDollarSign
                    size={22}
                  />
                </span>

                <div>
                  <small>Bước 3</small>

                  <h2>
                    Lương và yêu cầu công
                    việc
                  </h2>

                  <p>
                    Cung cấp mức lương, kinh
                    nghiệm, số lượng tuyển
                    và hạn nộp hồ sơ.
                  </p>
                </div>
              </header>

              <div className="job-editor-grid job-editor-grid--3">
                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="salary-min">
                      Lương từ
                    </label>
                  </div>

                  <input
                    id="salary-min"
                    type="number"
                    min="0"
                    step="1"
                    value={form.salaryMin}
                    disabled={
                      form.salaryUnit ===
                      'negotiable'
                    }
                    placeholder="0"
                    className={
                      validationErrors.salaryMin
                        ? 'has-error'
                        : ''
                    }
                    onChange={(event) =>
                      change(
                        'salaryMin',
                        event.target.value,
                      )
                    }
                  />

                  {validationErrors.salaryMin ? (
                    <p className="job-field-error">
                      {
                        validationErrors.salaryMin
                      }
                    </p>
                  ) : null}
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="salary-max">
                      Lương đến
                    </label>
                  </div>

                  <input
                    id="salary-max"
                    type="number"
                    min="0"
                    step="1"
                    value={form.salaryMax}
                    disabled={
                      form.salaryUnit ===
                      'negotiable'
                    }
                    placeholder="0"
                    className={
                      validationErrors.salaryMax
                        ? 'has-error'
                        : ''
                    }
                    onChange={(event) =>
                      change(
                        'salaryMax',
                        event.target.value,
                      )
                    }
                  />

                  {validationErrors.salaryMax ? (
                    <p className="job-field-error">
                      {
                        validationErrors.salaryMax
                      }
                    </p>
                  ) : null}
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="salary-unit">
                      Đơn vị lương
                    </label>
                  </div>

                  <select
                    id="salary-unit"
                    value={form.salaryUnit}
                    onChange={(event) =>
                      change(
                        'salaryUnit',
                        event.target.value,
                      )
                    }
                  >
                    {Object.entries(
                      SALARY_UNITS,
                    ).map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="experience-level">
                      Kinh nghiệm
                    </label>
                  </div>

                  <select
                    id="experience-level"
                    value={
                      form.experienceLevel
                    }
                    onChange={(event) =>
                      change(
                        'experienceLevel',
                        event.target.value,
                      )
                    }
                  >
                    {Object.entries(
                      EXPERIENCE_LEVELS,
                    ).map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="positions-count">
                      Số lượng tuyển
                    </label>
                  </div>

                  <input
                    id="positions-count"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.positionsCount
                    }
                    className={
                      validationErrors.positionsCount
                        ? 'has-error'
                        : ''
                    }
                    onChange={(event) =>
                      change(
                        'positionsCount',
                        event.target.value,
                      )
                    }
                  />

                  {validationErrors.positionsCount ? (
                    <p className="job-field-error">
                      {
                        validationErrors.positionsCount
                      }
                    </p>
                  ) : null}
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="job-deadline">
                      Hạn nộp
                      <span>*</span>
                    </label>
                  </div>

                  <div className="job-input-with-icon">
                    <CalendarDays
                      size={18}
                    />

                    <input
                      id="job-deadline"
                      type="date"
                      value={form.deadline}
                      className={
                        validationErrors.deadline
                          ? 'has-error'
                          : ''
                      }
                      onChange={(event) =>
                        change(
                          'deadline',
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {validationErrors.deadline ? (
                    <p className="job-field-error">
                      {
                        validationErrors.deadline
                      }
                    </p>
                  ) : null}
                </div>
              </div>

              {form.salaryUnit ===
              'negotiable' ? (
                <div className="job-editor-notice">
                  <Info size={18} />

                  <p>
                    Tin đang sử dụng mức
                    lương thỏa thuận. Hai
                    trường lương từ và lương
                    đến sẽ không được gửi
                    lên server.
                  </p>
                </div>
              ) : null}
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span>
                  <MapPin size={22} />
                </span>

                <div>
                  <small>Bước 4</small>

                  <h2>
                    Địa điểm và phân loại
                  </h2>

                  <p>
                    Cung cấp địa chỉ làm
                    việc, khu vực và các thẻ
                    nội dung liên quan.
                  </p>
                </div>
              </header>

              <div className="job-editor-field">
                <div className="job-editor-field__label">
                  <label htmlFor="work-location">
                    Địa điểm làm việc
                    <span>*</span>
                  </label>
                </div>

                <div className="job-input-with-icon">
                  <MapPin size={18} />

                  <input
                    id="work-location"
                    value={form.workLocation}
                    maxLength="500"
                    placeholder="Ví dụ: Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội"
                    className={
                      validationErrors.workLocation
                        ? 'has-error'
                        : ''
                    }
                    onChange={(event) =>
                      change(
                        'workLocation',
                        event.target.value,
                      )
                    }
                  />
                </div>

                {validationErrors.workLocation ? (
                  <p className="job-field-error">
                    {
                      validationErrors.workLocation
                    }
                  </p>
                ) : null}
              </div>

              <div className="job-taxonomy-wrapper">
                <TaxonomyFields
                  scope="job"
                  categoryId={null}
                  areaId={
                    form.primaryAreaId
                  }
                  tagIds={form.tagIds}
                  onChange={change}
                />
              </div>
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span>
                  <Send size={22} />
                </span>

                <div>
                  <small>Bước 5</small>

                  <h2>
                    Cách ứng tuyển và liên hệ
                  </h2>

                  <p>
                    Hướng dẫn ứng viên nộp
                    hồ sơ và cung cấp thông
                    tin liên hệ hợp lệ.
                  </p>
                </div>
              </header>

              <div className="job-editor-field">
                <div className="job-editor-field__label">
                  <label htmlFor="application-method">
                    Cách ứng tuyển
                  </label>
                </div>

                <textarea
                  id="application-method"
                  rows="5"
                  value={
                    form.applicationMethod
                  }
                  maxLength="2000"
                  placeholder="Ví dụ: Gửi CV qua email với tiêu đề [Ứng tuyển] - Họ tên - Vị trí..."
                  className={
                    validationErrors.applicationMethod
                      ? 'has-error'
                      : ''
                  }
                  onChange={(event) =>
                    change(
                      'applicationMethod',
                      event.target.value,
                    )
                  }
                />

                {validationErrors.applicationMethod ? (
                  <p className="job-field-error">
                    {
                      validationErrors.applicationMethod
                    }
                  </p>
                ) : (
                  <p className="job-field-hint">
                    Không yêu cầu ứng viên
                    chuyển tiền hoặc cung
                    cấp dữ liệu nhạy cảm
                    không cần thiết.
                  </p>
                )}
              </div>

              <div className="job-editor-grid job-editor-grid--2">
                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="contact-email">
                      Email liên hệ
                    </label>
                  </div>

                  <div className="job-input-with-icon">
                    <Mail size={18} />

                    <input
                      id="contact-email"
                      type="email"
                      value={
                        form.contactEmail
                      }
                      placeholder="hr@congty.vn"
                      className={
                        validationErrors.contactEmail
                          ? 'has-error'
                          : ''
                      }
                      onChange={(event) =>
                        change(
                          'contactEmail',
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {validationErrors.contactEmail ? (
                    <p className="job-field-error">
                      {
                        validationErrors.contactEmail
                      }
                    </p>
                  ) : null}
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="contact-phone">
                      Số điện thoại
                    </label>
                  </div>

                  <div className="job-input-with-icon">
                    <Phone size={18} />

                    <input
                      id="contact-phone"
                      type="tel"
                      value={
                        form.contactPhone
                      }
                      maxLength="30"
                      placeholder="0966 709 790"
                      onChange={(event) =>
                        change(
                          'contactPhone',
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span>
                  <ImagePlus size={22} />
                </span>

                <div>
                  <small>Bước 6</small>

                  <h2>
                    Ảnh đại diện tin tuyển
                    dụng
                  </h2>

                  <p>
                    Có thể sử dụng ảnh văn
                    phòng, môi trường làm
                    việc hoặc nhận diện đơn
                    vị tuyển dụng.
                  </p>
                </div>
              </header>

              <MediaUploader
                value={
                  form.thumbnailMediaId
                }
                onChange={(value) =>
                  change(
                    'thumbnailMediaId',
                    value,
                  )
                }
              />

              <div className="job-editor-notice">
                <ImagePlus size={18} />

                <p>
                  Không sử dụng hình ảnh giả
                  mạo thương hiệu hoặc hình
                  ảnh không liên quan đến
                  đơn vị tuyển dụng.
                </p>
              </div>
            </section>

            {editingId &&
            !extractBodyHtml(source) ? (
              <div className="job-editor-warning">
                <AlertTriangle
                  size={21}
                />

                <div>
                  <strong>
                    Chưa tải được nội dung
                    HTML của bản nháp
                  </strong>

                  <p>
                    Server hiện chưa trả nội
                    dung chi tiết của bản
                    nháp. Khi bạn không nhập
                    lại phần mô tả công việc,
                    trang sẽ không gửi
                    `bodyHtml` rỗng để tránh
                    ghi đè nội dung cũ.
                  </p>
                </div>
              </div>
            ) : null}

            <section className="job-editor-actions">
              <div className="job-editor-actions__status">
                <button
                  type="button"
                  disabled={loading}
                  onClick={resetForm}
                >
                  <RefreshCcw
                    size={17}
                  />
                  Đặt lại
                </button>

                <span>
                  {dirty
                    ? 'Bạn đang có thay đổi chưa lưu.'
                    : 'Biểu mẫu chưa có thay đổi mới.'}
                </span>
              </div>

              <div className="job-editor-actions__buttons">
                <Button
                  variant="outline"
                  loading={loading}
                  disabled={loading}
                  onClick={() =>
                    save(false)
                  }
                >
                  <Save size={17} />
                  Lưu bản nháp
                </Button>

                <Button
                  loading={loading}
                  disabled={loading}
                  onClick={() =>
                    save(true)
                  }
                >
                  <Send size={17} />
                  Lưu và gửi duyệt
                </Button>
              </div>
            </section>
          </main>

          <aside className="job-editor-sidebar">
            <div className="job-editor-sidebar__content">
              <section className="job-editor-sidebar-card">
                <div className="job-sidebar-heading">
                  <CheckCircle2
                    size={20}
                  />

                  <div>
                    <h2>
                      Mức độ hoàn thiện
                    </h2>

                    <p>
                      Kiểm tra các thông tin
                      chính trước khi gửi
                      duyệt.
                    </p>
                  </div>
                </div>

                <div className="job-completion-score">
                  <strong>
                    {completionPercent}%
                  </strong>

                  <div>
                    <span
                      style={{
                        width: `${completionPercent}%`,
                      }}
                    />
                  </div>
                </div>

                <ul className="job-completion-list">
                  {completionItems.map(
                    (item) => (
                      <li
                        key={item.label}
                        className={
                          item.completed
                            ? 'is-completed'
                            : ''
                        }
                      >
                        <CheckCircle2
                          size={16}
                        />

                        <span>
                          {item.label}

                          {item.optional ? (
                            <small>
                              Không bắt buộc
                            </small>
                          ) : null}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </section>

              <section className="job-editor-sidebar-card">
                <div className="job-sidebar-heading">
                  <BriefcaseBusiness
                    size={20}
                  />

                  <div>
                    <h2>
                      Loại việc đang chọn
                    </h2>

                    <p>
                      {
                        selectedJobType.label
                      }
                    </p>
                  </div>
                </div>

                <div className="job-type-summary">
                  <span>
                    <BriefcaseBusiness
                      size={25}
                    />
                  </span>

                  <strong>
                    {
                      selectedJobType.label
                    }
                  </strong>

                  <p>
                    {
                      selectedJobType.description
                    }
                  </p>
                </div>
              </section>

              <section className="job-editor-sidebar-card">
                <div className="job-sidebar-heading">
                  <Tags size={20} />

                  <div>
                    <h2>
                      Thông tin nên có
                    </h2>

                    <p>
                      Tin càng rõ ràng càng
                      dễ tiếp cận ứng viên
                      phù hợp.
                    </p>
                  </div>
                </div>

                <ul className="job-guideline-list">
                  <li>
                    Mô tả cụ thể trách nhiệm
                    công việc.
                  </li>

                  <li>
                    Ghi rõ thời gian và địa
                    điểm làm việc.
                  </li>

                  <li>
                    Cung cấp lương, phụ cấp
                    hoặc quyền lợi chính.
                  </li>

                  <li>
                    Nêu yêu cầu về kinh
                    nghiệm và kỹ năng.
                  </li>

                  <li>
                    Hướng dẫn ứng tuyển rõ
                    ràng và có thông tin
                    liên hệ.
                  </li>
                </ul>

                <Link
                  to="/quy-dinh-dang-bai"
                  target="_blank"
                  className="job-guideline-link"
                >
                  Xem quy định đăng bài
                </Link>
              </section>

              <section className="job-editor-sidebar-card job-safety-card">
                <ShieldCheck
                  size={25}
                />

                <small>
                  An toàn tuyển dụng
                </small>

                <h2>
                  Không thu phí ứng viên
                  trái quy định
                </h2>

                <p>
                  Tin có dấu hiệu lừa đảo,
                  yêu cầu chuyển tiền hoặc
                  thu thập dữ liệu cá nhân
                  không cần thiết có thể bị
                  từ chối hoặc gỡ bỏ.
                </p>

                <div>
                  <span>
                    <Clock3 size={16} />
                    Nội dung chờ kiểm duyệt
                  </span>

                  <span>
                    <ShieldCheck
                      size={16}
                    />
                    Có thể yêu cầu xác minh
                  </span>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}