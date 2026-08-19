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
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Gift,
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
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import RichTextEditor from '../../components/forms/RichTextEditor';
import MediaUploader from '../../components/forms/MediaUploader';

import { jobApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';

import {
  EXPERIENCE_LEVELS,
  JOB_TYPES,
} from '../../utils/constants';
import { isPersistedContentId } from '../../utils/content';
import { toNumber } from '../../utils/validators';

import './JobEditorPage.css';

const TITLE_MIN_LENGTH = 5;
const TITLE_MAX_LENGTH = 250;
const SUMMARY_MAX_LENGTH = 1000;
const BENEFITS_MAX_LENGTH = 4000;

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
    'Công việc bán thời gian, linh hoạt về ca hoặc số giờ làm việc.',
  internship:
    'Vị trí thực tập dành cho sinh viên hoặc người cần tích lũy kinh nghiệm.',
  temporary:
    'Công việc thời vụ hoặc có thời gian làm việc ngắn hạn.',
  student:
    'Công việc phù hợp sinh viên, ưu tiên lịch làm linh hoạt.',
  construction:
    'Nhóm công việc xây dựng, kỹ thuật, thi công và vận hành công trình.',
  service:
    'Nhóm công việc dịch vụ, bán hàng, chăm sóc khách hàng và vận hành.',
};

const JOB_CONTENT_TEMPLATES = [
  {
    id: 'standard',
    label: 'Mẫu cơ bản',
    description: 'Phù hợp đa số vị trí văn phòng và vận hành.',
    jobDescriptionHtml: `
      <ul>
        <li>Thực hiện các nhiệm vụ chính theo vị trí được phân công.</li>
        <li>Phối hợp với các bộ phận liên quan để hoàn thành công việc đúng tiến độ.</li>
        <li>Báo cáo kết quả và các vấn đề phát sinh cho người phụ trách.</li>
      </ul>
    `,
    candidateRequirementsHtml: `
      <ul>
        <li>Chủ động, có trách nhiệm và có khả năng phối hợp công việc.</li>
        <li>Ưu tiên ứng viên có kinh nghiệm phù hợp với vị trí.</li>
        <li>Có thể làm việc tại địa điểm và thời gian tuyển dụng đã nêu.</li>
      </ul>
    `,
  },
  {
    id: 'business',
    label: 'Kinh doanh',
    description: 'Dành cho sales, tư vấn, môi giới và phát triển khách hàng.',
    jobDescriptionHtml: `
      <ul>
        <li>Tìm kiếm, tư vấn và chăm sóc khách hàng theo tệp được phân công.</li>
        <li>Giới thiệu sản phẩm, dịch vụ và theo dõi quá trình ra quyết định của khách hàng.</li>
        <li>Cập nhật dữ liệu khách hàng và báo cáo kết quả kinh doanh định kỳ.</li>
      </ul>
    `,
    candidateRequirementsHtml: `
      <ul>
        <li>Giao tiếp rõ ràng, chủ động và có tinh thần phục vụ khách hàng.</li>
        <li>Ưu tiên ứng viên có kinh nghiệm bán hàng hoặc tư vấn.</li>
        <li>Có khả năng sử dụng điện thoại, email và các công cụ làm việc cơ bản.</li>
      </ul>
    `,
  },
  {
    id: 'technical',
    label: 'Kỹ thuật - xây dựng',
    description: 'Dành cho kiến trúc, kỹ sư, giám sát và thi công.',
    jobDescriptionHtml: `
      <ul>
        <li>Thực hiện công việc chuyên môn theo hồ sơ, kế hoạch hoặc yêu cầu kỹ thuật.</li>
        <li>Phối hợp kiểm tra hiện trường, chất lượng và tiến độ công việc.</li>
        <li>Lập báo cáo, hồ sơ hoặc biên bản theo phạm vi phụ trách.</li>
      </ul>
    `,
    candidateRequirementsHtml: `
      <ul>
        <li>Có chuyên môn phù hợp với vị trí tuyển dụng.</li>
        <li>Đọc hiểu tài liệu kỹ thuật và tuân thủ quy trình an toàn.</li>
        <li>Ưu tiên ứng viên có kinh nghiệm thực tế tại công trường hoặc dự án.</li>
      </ul>
    `,
  },
];

const BENEFIT_PRESETS = [
  'Đóng BHXH, BHYT, BHTN theo quy định.',
  'Thưởng theo hiệu quả công việc/KPI.',
  'Lương tháng 13 theo chính sách công ty.',
  'Xét tăng lương định kỳ.',
  'Phụ cấp ăn trưa.',
  'Phụ cấp xăng xe, điện thoại hoặc đi lại.',
  'Được đào tạo và hướng dẫn công việc.',
  'Nghỉ phép, nghỉ lễ theo quy định.',
  'Du lịch, team building hoặc hoạt động nội bộ.',
  'Cung cấp thiết bị và công cụ làm việc.',
];

const APPLICATION_PRESETS = [
  'Gửi CV qua email theo thông tin liên hệ bên dưới.',
  'Tiêu đề email: [Ứng tuyển] - Họ tên - Vị trí ứng tuyển.',
  'Liên hệ số điện thoại/Zalo để trao đổi trước khi nộp hồ sơ.',
  'Nộp hồ sơ trực tiếp tại địa điểm làm việc.',
];

const DESCRIPTION_SECTION_RE =
  /\s*<section\b[^>]*data-job-description=["']true["'][^>]*>([\s\S]*?)<\/section>\s*/i;
const REQUIREMENTS_SECTION_RE =
  /\s*<section\b[^>]*data-job-requirements=["']true["'][^>]*>([\s\S]*?)<\/section>\s*/i;
const BENEFITS_SECTION_RE =
  /\s*<section\b[^>]*data-job-benefits=["']true["'][^>]*>([\s\S]*?)<\/section>\s*/i;

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value._id || value.id || null;
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
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeDateInput(value) {
  if (!value) return '';

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function linesFromText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripNamedHeading(html, name) {
  const escapedName = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingRe = new RegExp(
    `^\\s*<h[1-6][^>]*>\\s*${escapedName}\\s*<\\/h[1-6]>\\s*`,
    'i',
  );
  return String(html || '').replace(headingRe, '').trim();
}

function extractListItems(html) {
  const items = [];
  const itemRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let itemMatch = itemRe.exec(String(html || ''));

  while (itemMatch) {
    const text = stripHtml(itemMatch[1]);
    if (text) items.push(text);
    itemMatch = itemRe.exec(String(html || ''));
  }

  return items;
}

function extractJobContent(bodyHtml) {
  let html = String(bodyHtml || '').trim();
  let benefits = '';

  const benefitsMatch = html.match(BENEFITS_SECTION_RE);
  if (benefitsMatch) {
    benefits = extractListItems(benefitsMatch[1]).join('\n');
    html = html.replace(BENEFITS_SECTION_RE, '').trim();
  }

  const descriptionMatch = html.match(DESCRIPTION_SECTION_RE);
  const requirementsMatch = html.match(REQUIREMENTS_SECTION_RE);

  if (descriptionMatch || requirementsMatch) {
    const jobDescriptionHtml = descriptionMatch
      ? stripNamedHeading(descriptionMatch[1], 'Mô tả công việc')
      : '';
    const candidateRequirementsHtml = requirementsMatch
      ? stripNamedHeading(requirementsMatch[1], 'Yêu cầu ứng viên')
      : '';

    return {
      jobDescriptionHtml,
      candidateRequirementsHtml,
      benefits,
    };
  }

  const requirementsHeadingRe =
    /<h[1-6][^>]*>\s*Yêu cầu ứng viên\s*<\/h[1-6]>/i;
  const requirementsHeading = requirementsHeadingRe.exec(html);

  let jobDescriptionHtml = html;
  let candidateRequirementsHtml = '';

  if (requirementsHeading) {
    const splitIndex = requirementsHeading.index;
    const headingEnd = splitIndex + requirementsHeading[0].length;
    jobDescriptionHtml = html.slice(0, splitIndex).trim();
    candidateRequirementsHtml = html.slice(headingEnd).trim();
  }

  jobDescriptionHtml = stripNamedHeading(
    jobDescriptionHtml,
    'Mô tả công việc',
  );
  candidateRequirementsHtml = stripNamedHeading(
    candidateRequirementsHtml,
    'Yêu cầu ứng viên',
  );

  return {
    jobDescriptionHtml,
    candidateRequirementsHtml,
    benefits,
  };
}

function composeBodyHtml(
  jobDescriptionHtml,
  candidateRequirementsHtml,
  benefits,
) {
  const blocks = [];
  const description = String(jobDescriptionHtml || '').trim();
  const requirements = String(candidateRequirementsHtml || '').trim();
  const benefitLines = linesFromText(benefits);

  if (description) {
    blocks.push(`
      <section data-job-description="true">
        <h2>Mô tả công việc</h2>
        ${description}
      </section>
    `.trim());
  }

  if (requirements) {
    blocks.push(`
      <section data-job-requirements="true">
        <h2>Yêu cầu ứng viên</h2>
        ${requirements}
      </section>
    `.trim());
  }

  if (benefitLines.length) {
    blocks.push(`
      <section data-job-benefits="true">
        <h2>Quyền lợi ứng viên</h2>
        <ul>
          ${benefitLines
            .map((line) => `<li>${escapeHtml(line)}</li>`)
            .join('\n')}
        </ul>
      </section>
    `.trim());
  }

  return blocks.join('\n');
}

function buildInitialForm(source = {}) {
  const job = source.job || {};
  const persistedContent = extractJobContent(extractBodyHtml(source));

  return {
    title: source.title || '',
    summary: source.summary || '',
    jobDescriptionHtml: persistedContent.jobDescriptionHtml,
    candidateRequirementsHtml: persistedContent.candidateRequirementsHtml,
    benefits: persistedContent.benefits,
    jobType: job.jobType || source.jobType || 'full_time',
    companyName: job.companyName || source.companyName || '',
    salaryMin: job.salaryMin ?? source.salaryMin ?? '',
    salaryMax: job.salaryMax ?? source.salaryMax ?? '',
    salaryUnit: job.salaryUnit || source.salaryUnit || 'month',
    experienceLevel:
      job.experienceLevel || source.experienceLevel || 'none',
    workLocation: job.workLocation || source.workLocation || '',
    applicationMethod:
      job.applicationMethod || source.applicationMethod || '',
    contactEmail: job.contactEmail || source.contactEmail || '',
    contactPhone: job.contactPhone || source.contactPhone || '',
    deadline:
      normalizeDateInput(job.deadline || source.deadline) ||
      getTomorrowDate(),
    positionsCount: job.positionsCount ?? source.positionsCount ?? 1,
    primaryAreaId:
      normalizeId(source.primaryAreaId || job.primaryAreaId) || '',
    thumbnailMediaId: source.thumbnailMediaId || null,
  };
}

function normalizeStoredDraft(currentForm, storedForm) {
  const draft = storedForm || {};
  const next = { ...currentForm, ...draft };

  if (
    !Object.prototype.hasOwnProperty.call(draft, 'jobDescriptionHtml') &&
    draft.bodyHtml
  ) {
    const legacyContent = extractJobContent(draft.bodyHtml);
    next.jobDescriptionHtml = legacyContent.jobDescriptionHtml;
    next.candidateRequirementsHtml =
      legacyContent.candidateRequirementsHtml;
    if (!draft.benefits) next.benefits = legacyContent.benefits;
  }

  delete next.bodyHtml;
  return next;
}

function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  if (!value) return true;
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

function togglePresetText(currentValue, preset) {
  const lines = linesFromText(currentValue);
  const target = preset.trim().toLowerCase();
  const exists = lines.some((line) => line.toLowerCase() === target);

  if (exists) {
    return lines
      .filter((line) => line.toLowerCase() !== target)
      .join('\n');
  }

  return [...lines, preset].join('\n');
}

function hasPreset(currentValue, preset) {
  const target = preset.trim().toLowerCase();
  return linesFromText(currentValue).some(
    (line) => line.toLowerCase() === target,
  );
}

function getStorageKey(editingId, sessionId) {
  const key = editingId || sessionId || 'new';
  return `job-editor-draft:${key}`;
}

function EditorContentBlock({
  number,
  icon: Icon,
  title,
  description,
  value,
  onChange,
  placeholder,
  error,
  textLength,
}) {
  return (
    <section className="job-editor-content-block">
      <header className="job-editor-content-block__heading">
        <span className="job-editor-content-block__number">{number}</span>
        <span className="job-editor-content-block__icon">
          <Icon size={20} />
        </span>
        <div>
          <h3>{title} <em>*</em></h3>
          <p>{description}</p>
        </div>
        <small>{textLength.toLocaleString('vi-VN')} ký tự</small>
      </header>

      <div className={error ? 'job-rich-editor has-error' : 'job-rich-editor'}>
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      </div>

      {error ? <p className="job-field-error">{error}</p> : null}
    </section>
  );
}

export default function JobEditorPage() {
  const { editorId } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { areas } = useTaxonomy();

  const queryEditingId = params.get('edit');
  const editingId = useMemo(() => {
    if (isPersistedContentId(queryEditingId)) return queryEditingId;
    if (isPersistedContentId(editorId)) return editorId;
    return null;
  }, [editorId, queryEditingId]);

  const sessionKey = editingId || editorId || location.pathname;
  const storageKey = useMemo(
    () => getStorageKey(editingId, editorId),
    [editingId, editorId],
  );

  const formTopRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const savedSnapshotRef = useRef('');

  const [source, setSource] = useState({});
  const [form, setForm] = useState(() =>
    buildInitialForm(editingId ? {} : location.state?.item || {}),
  );
  const [editorReady, setEditorReady] = useState(!editingId);
  const [loadError, setLoadError] = useState('');
  const [loadingAction, setLoadingAction] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  useEffect(() => {
    let active = true;

    async function initializeEditor() {
      setLoadError('');
      setValidationErrors({});
      setRestoredDraft(false);
      setAutoSaveStatus('idle');

      try {
        let nextSource = location.state?.item || {};

        if (editingId) {
          setEditorReady(false);
          nextSource = await jobApi.editDetail(editingId);
        }

        if (!active) return;

        const nextForm = buildInitialForm(nextSource);
        setSource(nextSource || {});
        setForm(nextForm);
        savedSnapshotRef.current = JSON.stringify(nextForm);
        setEditorReady(true);

        try {
          setHasLocalDraft(Boolean(window.localStorage.getItem(storageKey)));
        } catch {
          setHasLocalDraft(false);
        }
      } catch (error) {
        if (!active) return;
        setEditorReady(false);
        setLoadError(
          apiErrorMessage(
            error,
            'Không thể tải đầy đủ dữ liệu tin tuyển dụng để chỉnh sửa.',
          ),
        );
      }
    }

    void initializeEditor();

    return () => {
      active = false;
    };
    // sessionKey chỉ đổi khi chuyển sang một phiên soạn thảo khác.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, storageKey]);

  const formSnapshot = useMemo(() => JSON.stringify(form), [form]);
  const dirty = editorReady && formSnapshot !== savedSnapshotRef.current;

  const descriptionTextLength = useMemo(
    () => stripHtml(form.jobDescriptionHtml).length,
    [form.jobDescriptionHtml],
  );

  const requirementsTextLength = useMemo(
    () => stripHtml(form.candidateRequirementsHtml).length,
    [form.candidateRequirementsHtml],
  );

  const benefitsCount = useMemo(
    () => linesFromText(form.benefits).length,
    [form.benefits],
  );

  const selectedJobType = useMemo(
    () => ({
      label: JOB_TYPES[form.jobType] || 'Việc làm',
      description:
        JOB_TYPE_DESCRIPTIONS[form.jobType] ||
        'Cơ hội tuyển dụng dành cho người lao động tại khu vực Hòa Lạc.',
    }),
    [form.jobType],
  );

  const change = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const completionItems = useMemo(
    () => [
      {
        label: 'Tên vị trí',
        completed: form.title.trim().length >= TITLE_MIN_LENGTH,
      },
      {
        label: 'Đơn vị tuyển dụng',
        completed: Boolean(form.companyName.trim()),
      },
      {
        label: 'Mô tả công việc',
        completed: descriptionTextLength > 0,
      },
      {
        label: 'Yêu cầu ứng viên',
        completed: requirementsTextLength > 0,
      },
      {
        label: 'Quyền lợi',
        completed: benefitsCount > 0,
      },
      {
        label: 'Địa điểm làm việc',
        completed: Boolean(form.workLocation.trim()),
      },
      {
        label: 'Hạn nộp hồ sơ',
        completed: Boolean(form.deadline),
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
        completed: Boolean(form.thumbnailMediaId),
        optional: true,
      },
    ],
    [
      benefitsCount,
      descriptionTextLength,
      form.applicationMethod,
      form.companyName,
      form.contactEmail,
      form.contactPhone,
      form.deadline,
      form.thumbnailMediaId,
      form.title,
      form.workLocation,
      requirementsTextLength,
    ],
  );

  const completionPercent = useMemo(() => {
    const required = completionItems.filter((item) => !item.optional);
    const completed = required.filter((item) => item.completed);
    return Math.round((completed.length / Math.max(required.length, 1)) * 100);
  }, [completionItems]);

  useEffect(() => {
    if (!dirty) return undefined;

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    setAutoSaveStatus('saving');

    autoSaveTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ form, savedAt: new Date().toISOString() }),
        );
        setHasLocalDraft(true);
        setAutoSaveStatus('saved');
      } catch {
        setAutoSaveStatus('error');
      }
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [dirty, form, storageKey]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!dirty || loadingAction) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty, loadingAction]);

  const restoreLocalDraft = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        toast.error('Không tìm thấy bản tự lưu.');
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed?.form) throw new Error('Invalid local draft');

      setForm((current) => normalizeStoredDraft(current, parsed.form));
      setRestoredDraft(true);
      toast.success('Đã khôi phục bản tự lưu trên thiết bị.');
    } catch {
      toast.error('Không thể khôi phục bản tự lưu.');
    }
  }, [storageKey, toast]);

  const clearLocalDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
      setHasLocalDraft(false);
      setRestoredDraft(false);
      setAutoSaveStatus('idle');
      toast.success('Đã xóa bản tự lưu.');
    } catch {
      toast.error('Không thể xóa bản tự lưu.');
    }
  }, [storageKey, toast]);

  const resetForm = useCallback(() => {
    const confirmed = window.confirm(
      'Bạn có chắc muốn bỏ các thay đổi hiện tại và quay về dữ liệu đã tải gần nhất?',
    );
    if (!confirmed) return;

    const nextForm = buildInitialForm(source);
    setForm(nextForm);
    setValidationErrors({});
    savedSnapshotRef.current = JSON.stringify(nextForm);

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Không chặn thao tác đặt lại.
    }

    setHasLocalDraft(false);
    setRestoredDraft(false);
    setAutoSaveStatus('idle');
    toast.success('Đã đặt lại biểu mẫu.');
  }, [source, storageKey, toast]);

  const applyContentTemplate = useCallback(
    (template) => {
      if (descriptionTextLength > 0 || requirementsTextLength > 0) {
        const confirmed = window.confirm(
          'Phần mô tả hoặc yêu cầu ứng viên hiện đã có nội dung. Bạn có muốn thay cả hai bằng mẫu được chọn không?',
        );
        if (!confirmed) return;
      }

      setForm((current) => ({
        ...current,
        jobDescriptionHtml: template.jobDescriptionHtml.trim(),
        candidateRequirementsHtml: template.candidateRequirementsHtml.trim(),
      }));
      setValidationErrors((current) => {
        const next = { ...current };
        delete next.jobDescriptionHtml;
        delete next.candidateRequirementsHtml;
        return next;
      });

      toast.success(
        `Đã chèn ${template.label.toLowerCase()} cho cả mô tả công việc và yêu cầu ứng viên.`,
      );
    },
    [descriptionTextLength, requirementsTextLength, toast],
  );

  const validate = useCallback(
    (submitAfter) => {
      const errors = {};
      const title = form.title.trim();

      if (!title) {
        errors.title = 'Vui lòng nhập tên vị trí tuyển dụng.';
      } else if (title.length < TITLE_MIN_LENGTH) {
        errors.title = `Tiêu đề cần ít nhất ${TITLE_MIN_LENGTH} ký tự.`;
      } else if (title.length > TITLE_MAX_LENGTH) {
        errors.title = `Tiêu đề không được vượt quá ${TITLE_MAX_LENGTH} ký tự.`;
      }

      if (!form.companyName.trim()) {
        errors.companyName = 'Vui lòng nhập tên công ty hoặc người tuyển dụng.';
      }

      if (form.summary.length > SUMMARY_MAX_LENGTH) {
        errors.summary = `Mô tả ngắn không được vượt quá ${SUMMARY_MAX_LENGTH} ký tự.`;
      }

      if (submitAfter && descriptionTextLength === 0) {
        errors.jobDescriptionHtml = 'Vui lòng nhập mô tả công việc.';
      }

      if (submitAfter && requirementsTextLength === 0) {
        errors.candidateRequirementsHtml = 'Vui lòng nhập yêu cầu ứng viên.';
      }

      if (form.benefits.length > BENEFITS_MAX_LENGTH) {
        errors.benefits = `Quyền lợi không được vượt quá ${BENEFITS_MAX_LENGTH} ký tự.`;
      } else if (submitAfter && benefitsCount === 0) {
        errors.benefits = 'Vui lòng bổ sung ít nhất một quyền lợi cho ứng viên.';
      }

      const salaryMin =
        form.salaryMin === '' ? null : toNumber(form.salaryMin);
      const salaryMax =
        form.salaryMax === '' ? null : toNumber(form.salaryMax);

      if (salaryMin !== null && salaryMin < 0) {
        errors.salaryMin = 'Mức lương tối thiểu không hợp lệ.';
      }

      if (salaryMax !== null && salaryMax < 0) {
        errors.salaryMax = 'Mức lương tối đa không hợp lệ.';
      }

      if (
        salaryMin !== null &&
        salaryMax !== null &&
        salaryMax < salaryMin
      ) {
        errors.salaryMax = 'Mức lương tối đa phải lớn hơn hoặc bằng mức lương tối thiểu.';
      }

      if (Number(form.positionsCount) < 1) {
        errors.positionsCount = 'Số lượng tuyển phải từ 1 trở lên.';
      }

      if (!form.deadline) {
        errors.deadline = 'Vui lòng chọn hạn nộp hồ sơ.';
      } else if (submitAfter) {
        const deadline = new Date(`${form.deadline}T23:59:59`);
        if (deadline.getTime() <= Date.now()) {
          errors.deadline = 'Hạn nộp hồ sơ phải ở tương lai.';
        }
      }

      if (!form.workLocation.trim()) {
        errors.workLocation = 'Vui lòng nhập địa điểm làm việc.';
      }

      if (form.contactEmail && !isValidEmail(form.contactEmail.trim())) {
        errors.contactEmail = 'Địa chỉ email không hợp lệ.';
      }

      if (form.contactPhone && !isValidPhone(form.contactPhone)) {
        errors.contactPhone = 'Số điện thoại không hợp lệ.';
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
      const firstError = Object.values(errors)[0];

      if (firstError) {
        formTopRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        toast.error(firstError);
        return false;
      }

      return true;
    },
    [
      benefitsCount,
      descriptionTextLength,
      form,
      requirementsTextLength,
      toast,
    ],
  );

  const buildPayload = useCallback(() => {
    const salaryMin =
      form.salaryUnit === 'negotiable' || form.salaryMin === ''
        ? null
        : toNumber(form.salaryMin);
    const salaryMax =
      form.salaryUnit === 'negotiable' || form.salaryMax === ''
        ? null
        : toNumber(form.salaryMax);

    return {
      title: form.title.trim(),
      summary: form.summary.trim() || undefined,
      bodyHtml: composeBodyHtml(
        form.jobDescriptionHtml,
        form.candidateRequirementsHtml,
        form.benefits,
      ),
      jobType: form.jobType,
      companyName: form.companyName.trim(),
      salaryMin,
      salaryMax,
      salaryUnit: form.salaryUnit,
      experienceLevel: form.experienceLevel,
      workLocation: form.workLocation.trim(),
      applicationMethod: form.applicationMethod.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      deadline: form.deadline || null,
      positionsCount: Math.max(toNumber(form.positionsCount, 1), 1),
      primaryAreaId: form.primaryAreaId || null,
      tagIds: [],
      thumbnailMediaId: normalizeId(form.thumbnailMediaId),
    };
  }, [form]);

  const save = useCallback(
    async (submitAfter = false) => {
      if (loadingAction || !validate(submitAfter)) return;

      const action = submitAfter ? 'submit' : 'draft';
      setLoadingAction(action);

      try {
        const payload = buildPayload();
        const content = editingId
          ? await jobApi.update(editingId, payload)
          : await jobApi.create(payload);

        const contentId = content?._id || content?.id || editingId;

        if (submitAfter && contentId) {
          await jobApi.submit(contentId);
        }

        savedSnapshotRef.current = JSON.stringify(form);

        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // Không chặn luồng lưu lên server.
        }

        setHasLocalDraft(false);
        setAutoSaveStatus('idle');

        toast.success(
          submitAfter
            ? 'Đã lưu và gửi tin tuyển dụng đi duyệt.'
            : 'Đã lưu bản nháp tuyển dụng.',
        );

        navigate('/tai-khoan/bai-viet');
      } catch (error) {
        toast.error(apiErrorMessage(error));
      } finally {
        setLoadingAction('');
      }
    },
    [
      buildPayload,
      editingId,
      form,
      loadingAction,
      navigate,
      storageKey,
      toast,
      validate,
    ],
  );

  const handleBack = useCallback(() => {
    if (dirty) {
      const confirmed = window.confirm(
        'Bạn đang có thay đổi chưa lưu. Bạn vẫn muốn rời khỏi trang?',
      );
      if (!confirmed) return;
    }

    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    navigate('/dang-bai');
  }, [dirty, navigate]);

  if (!editorReady) {
    return (
      <section className="job-editor-page">
        <Seo title={editingId ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng'} />
        <div className="job-editor-container">
          {loadError ? (
            <div className="job-editor-load-error">
              <AlertTriangle size={28} />
              <div>
                <h1>Không thể tải tin tuyển dụng</h1>
                <p>{loadError}</p>
                <div>
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft size={17} />
                    Quay lại
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    <RefreshCcw size={17} />
                    Tải lại
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="job-editor-loading">
              <span className="loading-spinner" />
              <strong>Đang tải đầy đủ dữ liệu tin tuyển dụng...</strong>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="job-editor-page">
      <Seo
        title={editingId ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng'}
        description="Đăng tin tuyển dụng, việc làm, thực tập và công việc thời vụ tại khu vực Hòa Lạc."
      />

      <div className="job-editor-container">
        <nav className="job-editor-breadcrumb">
          <button type="button" onClick={handleBack}>
            <ArrowLeft size={17} />
            Quay lại
          </button>
          <span>/</span>
          <Link to="/dang-bai">Trung tâm đăng nội dung</Link>
          <span>/</span>
          <span>{editingId ? 'Chỉnh sửa việc làm' : 'Đăng tin việc làm'}</span>
        </nav>

        <header className="job-editor-hero">
          <div className="job-editor-hero__icon">
            <BriefcaseBusiness size={31} />
          </div>

          <div className="job-editor-hero__content">
            <span className="job-editor-hero__eyebrow">
              <Building2 size={16} />
              Tuyển dụng tại Hòa Lạc
            </span>
            <h1>{editingId ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng'}</h1>
            <p>
              Tách rõ mô tả công việc, yêu cầu ứng viên, quyền lợi, mức lương và cách ứng tuyển để tin dễ đọc như các nền tảng tuyển dụng chuyên nghiệp.
            </p>
          </div>

          <div className="job-editor-hero__status">
            <div>
              <span>Hoàn thiện biểu mẫu</span>
              <strong>{completionPercent}%</strong>
            </div>
            <div className="job-editor-progress">
              <span style={{ width: `${completionPercent}%` }} />
            </div>
            <small>
              {autoSaveStatus === 'saving'
                ? 'Đang tự lưu...'
                : autoSaveStatus === 'saved'
                  ? 'Đã tự lưu trên thiết bị'
                  : autoSaveStatus === 'error'
                    ? 'Không thể tự lưu'
                    : dirty
                      ? 'Có thay đổi chưa lưu'
                      : 'Dữ liệu đã đồng bộ'}
            </small>
          </div>
        </header>

        {hasLocalDraft && !restoredDraft ? (
          <section className="job-editor-restore">
            <div>
              <RefreshCcw size={21} />
              <div>
                <strong>Có bản tự lưu trên thiết bị</strong>
                <p>
                  Có thể khôi phục dữ liệu đang nhập trước đó. Bản trên server vẫn được giữ nguyên cho tới khi bạn bấm lưu.
                </p>
              </div>
            </div>
            <div className="job-editor-restore__actions">
              <button type="button" onClick={restoreLocalDraft}>Khôi phục</button>
              <button type="button" onClick={clearLocalDraft}>Xóa bản tự lưu</button>
            </div>
          </section>
        ) : null}

        <div className="job-editor-layout">
          <main ref={formTopRef} className="job-editor-main">
            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span><BriefcaseBusiness size={22} /></span>
                <div>
                  <small>Bước 1</small>
                  <h2>Thông tin tuyển dụng</h2>
                  <p>Chọn loại việc và cung cấp thông tin đơn vị tuyển dụng.</p>
                </div>
              </header>

              <div className="job-editor-grid job-editor-grid--2">
                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="job-type">Loại việc <span>*</span></label>
                  </div>
                  <select
                    id="job-type"
                    value={form.jobType}
                    onChange={(event) => change('jobType', event.target.value)}
                  >
                    {Object.entries(JOB_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label">
                    <label htmlFor="company-name">Tên công ty/người tuyển <span>*</span></label>
                  </div>
                  <input
                    id="company-name"
                    value={form.companyName}
                    maxLength="200"
                    placeholder="Ví dụ: Công ty Cổ phần Kiến Trúc Hòa Lạc"
                    className={validationErrors.companyName ? 'has-error' : ''}
                    onChange={(event) => change('companyName', event.target.value)}
                  />
                  {validationErrors.companyName ? (
                    <p className="job-field-error">{validationErrors.companyName}</p>
                  ) : null}
                </div>
              </div>

              <div className="job-selected-type">
                <BriefcaseBusiness size={19} />
                <div>
                  <strong>{selectedJobType.label}</strong>
                  <p>{selectedJobType.description}</p>
                </div>
              </div>
            </section>

            <section className="job-editor-card job-editor-card--job-content">
              <header className="job-editor-card__heading">
                <span><FileText size={22} /></span>
                <div>
                  <small>Bước 2</small>
                  <h2>Nội dung vị trí tuyển dụng</h2>
                  <p>Tiêu đề, phần giới thiệu và hai khối nội dung chính được tách riêng để dễ nhập và dễ đọc.</p>
                </div>
              </header>

              <div className="job-editor-field">
                <div className="job-editor-field__label">
                  <label htmlFor="job-title">Tiêu đề tuyển dụng <span>*</span></label>
                  <small>{form.title.length}/{TITLE_MAX_LENGTH}</small>
                </div>
                <input
                  id="job-title"
                  value={form.title}
                  minLength={TITLE_MIN_LENGTH}
                  maxLength={TITLE_MAX_LENGTH}
                  placeholder="Ví dụ: Tuyển Kiến trúc sư làm việc tại Hòa Lạc"
                  className={validationErrors.title ? 'has-error' : ''}
                  onChange={(event) => change('title', event.target.value)}
                />
                {validationErrors.title ? (
                  <p className="job-field-error">{validationErrors.title}</p>
                ) : (
                  <p className="job-field-hint">Nên gồm vị trí, lĩnh vực hoặc địa điểm làm việc.</p>
                )}
              </div>

              <div className="job-editor-field">
                <div className="job-editor-field__label">
                  <label htmlFor="job-summary">Tóm tắt vị trí</label>
                  <small>{form.summary.length}/{SUMMARY_MAX_LENGTH}</small>
                </div>
                <textarea
                  id="job-summary"
                  rows="3"
                  value={form.summary}
                  maxLength={SUMMARY_MAX_LENGTH}
                  placeholder="Tóm tắt điểm nổi bật của vị trí trong 1-3 câu."
                  className={validationErrors.summary ? 'has-error' : ''}
                  onChange={(event) => change('summary', event.target.value)}
                />
                {validationErrors.summary ? (
                  <p className="job-field-error">{validationErrors.summary}</p>
                ) : null}
              </div>

              <div className="job-template-panel">
                <div className="job-template-panel__heading">
                  <Sparkles size={19} />
                  <div>
                    <strong>Mẫu nội dung nhanh</strong>
                    <p>Một lần chọn sẽ điền đồng thời “Mô tả công việc” và “Yêu cầu ứng viên”.</p>
                  </div>
                </div>
                <div className="job-template-options">
                  {JOB_CONTENT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyContentTemplate(template)}
                    >
                      <strong>{template.label}</strong>
                      <small>{template.description}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="job-editor-content-stack">
                <EditorContentBlock
                  number="01"
                  icon={BriefcaseBusiness}
                  title="Mô tả công việc"
                  description="Chỉ viết nhiệm vụ, phạm vi trách nhiệm, đầu việc và kết quả cần đạt."
                  value={form.jobDescriptionHtml}
                  onChange={(value) => change('jobDescriptionHtml', value)}
                  placeholder="Ví dụ: Lập hồ sơ dự toán; bóc tách khối lượng; phối hợp chủ đầu tư; theo dõi tiến độ..."
                  error={validationErrors.jobDescriptionHtml}
                  textLength={descriptionTextLength}
                />

                <EditorContentBlock
                  number="02"
                  icon={UsersRound}
                  title="Yêu cầu ứng viên"
                  description="Tách riêng kinh nghiệm, chuyên môn, kỹ năng, học vấn hoặc điều kiện bắt buộc."
                  value={form.candidateRequirementsHtml}
                  onChange={(value) => change('candidateRequirementsHtml', value)}
                  placeholder="Ví dụ: Tốt nghiệp chuyên ngành phù hợp; biết AutoCAD; kinh nghiệm từ 1 năm; chủ động và có trách nhiệm..."
                  error={validationErrors.candidateRequirementsHtml}
                  textLength={requirementsTextLength}
                />
              </div>

              <div className="job-editor-notice job-editor-notice--compact">
                <Info size={18} />
                <p>
                  Khi xuất bản, hệ thống tự ghép hai phần thành các mục độc lập “Mô tả công việc” và “Yêu cầu ứng viên”, không còn phải tự gõ tiêu đề bên trong trình soạn thảo.
                </p>
              </div>
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span><CircleDollarSign size={22} /></span>
                <div>
                  <small>Bước 3</small>
                  <h2>Lương và yêu cầu cơ bản</h2>
                  <p>Cung cấp mức lương, kinh nghiệm, số lượng tuyển và hạn nộp hồ sơ.</p>
                </div>
              </header>

              <div className="job-editor-grid job-editor-grid--3">
                <div className="job-editor-field">
                  <div className="job-editor-field__label"><label htmlFor="salary-min">Lương từ</label></div>
                  <input
                    id="salary-min"
                    type="number"
                    min="0"
                    step="1"
                    value={form.salaryMin}
                    disabled={form.salaryUnit === 'negotiable'}
                    placeholder="15000000"
                    className={validationErrors.salaryMin ? 'has-error' : ''}
                    onChange={(event) => change('salaryMin', event.target.value)}
                  />
                  {validationErrors.salaryMin ? <p className="job-field-error">{validationErrors.salaryMin}</p> : null}
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label"><label htmlFor="salary-max">Lương đến</label></div>
                  <input
                    id="salary-max"
                    type="number"
                    min="0"
                    step="1"
                    value={form.salaryMax}
                    disabled={form.salaryUnit === 'negotiable'}
                    placeholder="25000000"
                    className={validationErrors.salaryMax ? 'has-error' : ''}
                    onChange={(event) => change('salaryMax', event.target.value)}
                  />
                  {validationErrors.salaryMax ? <p className="job-field-error">{validationErrors.salaryMax}</p> : null}
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label"><label htmlFor="salary-unit">Đơn vị lương</label></div>
                  <select
                    id="salary-unit"
                    value={form.salaryUnit}
                    onChange={(event) => change('salaryUnit', event.target.value)}
                  >
                    {Object.entries(SALARY_UNITS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label"><label htmlFor="experience-level">Kinh nghiệm</label></div>
                  <select
                    id="experience-level"
                    value={form.experienceLevel}
                    onChange={(event) => change('experienceLevel', event.target.value)}
                  >
                    {Object.entries(EXPERIENCE_LEVELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label"><label htmlFor="positions-count">Số lượng tuyển</label></div>
                  <input
                    id="positions-count"
                    type="number"
                    min="1"
                    step="1"
                    value={form.positionsCount}
                    className={validationErrors.positionsCount ? 'has-error' : ''}
                    onChange={(event) => change('positionsCount', event.target.value)}
                  />
                  {validationErrors.positionsCount ? <p className="job-field-error">{validationErrors.positionsCount}</p> : null}
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label"><label htmlFor="job-deadline">Hạn nộp <span>*</span></label></div>
                  <div className="job-input-with-icon">
                    <CalendarDays size={18} />
                    <input
                      id="job-deadline"
                      type="date"
                      value={form.deadline}
                      className={validationErrors.deadline ? 'has-error' : ''}
                      onChange={(event) => change('deadline', event.target.value)}
                    />
                  </div>
                  {validationErrors.deadline ? <p className="job-field-error">{validationErrors.deadline}</p> : null}
                </div>
              </div>

              {form.salaryUnit === 'negotiable' ? (
                <div className="job-editor-notice">
                  <Info size={18} />
                  <p>Đang chọn mức lương thỏa thuận. Hai ô lương từ và lương đến sẽ không được gửi lên hệ thống.</p>
                </div>
              ) : null}
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span><MapPin size={22} /></span>
                <div>
                  <small>Bước 4</small>
                  <h2>Địa điểm làm việc</h2>
                  <p>Chỉ giữ thông tin thực sự cần cho tin việc làm: địa chỉ và khu vực lọc.</p>
                </div>
              </header>

              <div className="job-editor-field">
                <div className="job-editor-field__label"><label htmlFor="work-location">Địa điểm làm việc <span>*</span></label></div>
                <div className="job-input-with-icon">
                  <MapPin size={18} />
                  <input
                    id="work-location"
                    value={form.workLocation}
                    maxLength="500"
                    placeholder="Ví dụ: Khu Công nghệ cao Hòa Lạc, Hà Nội"
                    className={validationErrors.workLocation ? 'has-error' : ''}
                    onChange={(event) => change('workLocation', event.target.value)}
                  />
                </div>
                {validationErrors.workLocation ? (
                  <p className="job-field-error">{validationErrors.workLocation}</p>
                ) : (
                  <p className="job-field-hint">Nhập địa chỉ đủ rõ để ứng viên biết nơi làm việc thực tế.</p>
                )}
              </div>

              <div className="job-editor-field">
                <div className="job-editor-field__label"><label htmlFor="job-area">Khu vực</label></div>
                <select
                  id="job-area"
                  value={form.primaryAreaId}
                  onChange={(event) => change('primaryAreaId', event.target.value)}
                >
                  <option value="">Chọn khu vực để lọc tin</option>
                  {areas.map((area) => (
                    <option key={area._id} value={area._id}>{area.name}</option>
                  ))}
                </select>
                <p className="job-field-hint">
                  Khu vực chỉ dùng cho tìm kiếm/lọc việc làm, không trộn với chuyên mục tin tức.
                </p>
              </div>
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span><Gift size={22} /></span>
                <div>
                  <small>Bước 5</small>
                  <h2>Quyền lợi ứng viên</h2>
                  <p>Chọn nhanh các quyền lợi phổ biến rồi chỉnh lại cho đúng chính sách thực tế.</p>
                </div>
              </header>

              <div className="job-preset-block">
                <div className="job-preset-block__heading">
                  <BadgeCheck size={18} />
                  <strong>Chọn quyền lợi có áp dụng</strong>
                </div>
                <div className="job-preset-chips">
                  {BENEFIT_PRESETS.map((preset) => {
                    const active = hasPreset(form.benefits, preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        className={active ? 'is-active' : ''}
                        onClick={() => change('benefits', togglePresetText(form.benefits, preset))}
                      >
                        {active ? <Check size={15} /> : <span className="job-chip-dot" />}
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="job-editor-field">
                <div className="job-editor-field__label">
                  <label htmlFor="job-benefits">Quyền lợi <span>*</span></label>
                  <small>{form.benefits.length}/{BENEFITS_MAX_LENGTH}</small>
                </div>
                <textarea
                  id="job-benefits"
                  rows="6"
                  value={form.benefits}
                  maxLength={BENEFITS_MAX_LENGTH}
                  placeholder="Mỗi quyền lợi một dòng. Có thể chọn các gợi ý phía trên để điền nhanh."
                  className={validationErrors.benefits ? 'has-error' : ''}
                  onChange={(event) => change('benefits', event.target.value)}
                />
                {validationErrors.benefits ? (
                  <p className="job-field-error">{validationErrors.benefits}</p>
                ) : (
                  <p className="job-field-hint">
                    Khi xuất bản, hệ thống tự tạo thành mục “Quyền lợi ứng viên” riêng biệt.
                  </p>
                )}
              </div>
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span><Send size={22} /></span>
                <div>
                  <small>Bước 6</small>
                  <h2>Cách ứng tuyển và liên hệ</h2>
                  <p>Chọn nhanh hướng dẫn nộp hồ sơ và bổ sung thông tin liên hệ hợp lệ.</p>
                </div>
              </header>

              <div className="job-preset-block">
                <div className="job-preset-block__heading">
                  <Sparkles size={18} />
                  <strong>Mẫu cách ứng tuyển</strong>
                </div>
                <div className="job-preset-chips job-preset-chips--compact">
                  {APPLICATION_PRESETS.map((preset) => {
                    const active = hasPreset(form.applicationMethod, preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        className={active ? 'is-active' : ''}
                        onClick={() =>
                          change(
                            'applicationMethod',
                            togglePresetText(form.applicationMethod, preset),
                          )
                        }
                      >
                        {active ? <Check size={15} /> : <span className="job-chip-dot" />}
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="job-editor-field">
                <div className="job-editor-field__label"><label htmlFor="application-method">Cách ứng tuyển</label></div>
                <textarea
                  id="application-method"
                  rows="5"
                  value={form.applicationMethod}
                  maxLength="2000"
                  placeholder="Chọn mẫu phía trên hoặc nhập hướng dẫn riêng..."
                  className={validationErrors.applicationMethod ? 'has-error' : ''}
                  onChange={(event) => change('applicationMethod', event.target.value)}
                />
                {validationErrors.applicationMethod ? (
                  <p className="job-field-error">{validationErrors.applicationMethod}</p>
                ) : (
                  <p className="job-field-hint">Không yêu cầu ứng viên chuyển tiền hoặc cung cấp dữ liệu nhạy cảm không cần thiết.</p>
                )}
              </div>

              <div className="job-editor-grid job-editor-grid--2">
                <div className="job-editor-field">
                  <div className="job-editor-field__label"><label htmlFor="contact-email">Email liên hệ</label></div>
                  <div className="job-input-with-icon">
                    <Mail size={18} />
                    <input
                      id="contact-email"
                      type="email"
                      value={form.contactEmail}
                      placeholder="hr@congty.vn"
                      className={validationErrors.contactEmail ? 'has-error' : ''}
                      onChange={(event) => change('contactEmail', event.target.value)}
                    />
                  </div>
                  {validationErrors.contactEmail ? <p className="job-field-error">{validationErrors.contactEmail}</p> : null}
                </div>

                <div className="job-editor-field">
                  <div className="job-editor-field__label"><label htmlFor="contact-phone">Số điện thoại</label></div>
                  <div className="job-input-with-icon">
                    <Phone size={18} />
                    <input
                      id="contact-phone"
                      type="tel"
                      value={form.contactPhone}
                      maxLength="30"
                      placeholder="0966 709 790"
                      className={validationErrors.contactPhone ? 'has-error' : ''}
                      onChange={(event) => change('contactPhone', event.target.value)}
                    />
                  </div>
                  {validationErrors.contactPhone ? <p className="job-field-error">{validationErrors.contactPhone}</p> : null}
                </div>
              </div>
            </section>

            <section className="job-editor-card">
              <header className="job-editor-card__heading">
                <span><ImagePlus size={22} /></span>
                <div>
                  <small>Bước 7</small>
                  <h2>Ảnh đại diện tin tuyển dụng</h2>
                  <p>Có thể dùng ảnh văn phòng, môi trường làm việc hoặc hình nhận diện đơn vị tuyển dụng.</p>
                </div>
              </header>

              <MediaUploader
                value={form.thumbnailMediaId}
                onChange={(value) => change('thumbnailMediaId', value)}
              />

              <div className="job-editor-notice">
                <ImagePlus size={18} />
                <p>Ảnh đại diện là tùy chọn nhưng giúp tin tuyển dụng rõ ràng và đáng tin cậy hơn.</p>
              </div>
            </section>

            <section className="job-editor-actions">
              <div className="job-editor-actions__status">
                <button type="button" disabled={Boolean(loadingAction)} onClick={resetForm}>
                  <RefreshCcw size={17} />
                  Đặt lại
                </button>
                <span>{dirty ? 'Bạn đang có thay đổi chưa lưu.' : 'Dữ liệu hiện tại đã được đồng bộ.'}</span>
              </div>

              <div className="job-editor-actions__buttons">
                <Button
                  variant="outline"
                  loading={loadingAction === 'draft'}
                  disabled={Boolean(loadingAction)}
                  onClick={() => save(false)}
                >
                  <Save size={17} />
                  Lưu bản nháp
                </Button>
                <Button
                  loading={loadingAction === 'submit'}
                  disabled={Boolean(loadingAction)}
                  onClick={() => save(true)}
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
                  <CheckCircle2 size={20} />
                  <div>
                    <h2>Mức độ hoàn thiện</h2>
                    <p>Kiểm tra các thông tin chính trước khi gửi duyệt.</p>
                  </div>
                </div>

                <div className="job-completion-score">
                  <strong>{completionPercent}%</strong>
                  <div><span style={{ width: `${completionPercent}%` }} /></div>
                </div>

                <ul className="job-completion-list">
                  {completionItems.map((item) => (
                    <li key={item.label} className={item.completed ? 'is-completed' : ''}>
                      <CheckCircle2 size={16} />
                      <span>
                        {item.label}
                        {item.optional ? <small>Không bắt buộc</small> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="job-editor-sidebar-card">
                <div className="job-sidebar-heading">
                  <FileText size={20} />
                  <div>
                    <h2>Nội dung chính</h2>
                    <p>Hai phần quan trọng nhất đã được tách riêng.</p>
                  </div>
                </div>
                <div className="job-content-health">
                  <div className={descriptionTextLength > 0 ? 'is-ready' : ''}>
                    <BriefcaseBusiness size={17} />
                    <span>Mô tả công việc</span>
                    <strong>{descriptionTextLength > 0 ? 'Đã có' : 'Chưa có'}</strong>
                  </div>
                  <div className={requirementsTextLength > 0 ? 'is-ready' : ''}>
                    <UsersRound size={17} />
                    <span>Yêu cầu ứng viên</span>
                    <strong>{requirementsTextLength > 0 ? 'Đã có' : 'Chưa có'}</strong>
                  </div>
                </div>
              </section>

              <section className="job-editor-sidebar-card">
                <div className="job-sidebar-heading">
                  <Gift size={20} />
                  <div>
                    <h2>Quyền lợi đang có</h2>
                    <p>{benefitsCount ? `${benefitsCount} quyền lợi đã khai báo` : 'Chưa khai báo quyền lợi'}</p>
                  </div>
                </div>
                <div className="job-sidebar-highlight">
                  <strong>{benefitsCount}</strong>
                  <span>mục quyền lợi</span>
                  <small>Ưu tiên thông tin cụ thể, đúng chính sách thực tế.</small>
                </div>
              </section>

              <section className="job-editor-sidebar-card">
                <div className="job-sidebar-heading">
                  <UsersRound size={20} />
                  <div>
                    <h2>Tin tuyển dụng tốt nên có</h2>
                    <p>Những dữ liệu ứng viên thường quan tâm nhất.</p>
                  </div>
                </div>
                <ul className="job-guideline-list">
                  <li>Nhiệm vụ cụ thể và dễ hiểu.</li>
                  <li>Yêu cầu ứng viên tách riêng, không trộn vào mô tả.</li>
                  <li>Mức lương hoặc ghi rõ thỏa thuận.</li>
                  <li>Địa điểm và thời gian làm việc.</li>
                  <li>Quyền lợi và chính sách rõ ràng.</li>
                  <li>Cách ứng tuyển và đầu mối liên hệ.</li>
                </ul>
                <Link to="/quy-dinh-dang-bai" target="_blank" className="job-guideline-link">
                  Xem quy định đăng bài
                </Link>
              </section>

              <section className="job-editor-sidebar-card job-safety-card">
                <ShieldCheck size={25} />
                <small>An toàn tuyển dụng</small>
                <h2>Không thu phí ứng viên trái quy định</h2>
                <p>
                  Tin có dấu hiệu lừa đảo, yêu cầu chuyển tiền hoặc thu thập dữ liệu cá nhân không cần thiết có thể bị từ chối hoặc gỡ bỏ.
                </p>
                <div>
                  <span><Clock3 size={16} /> Nội dung chờ kiểm duyệt</span>
                  <span><ShieldCheck size={16} /> Có thể yêu cầu xác minh</span>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
