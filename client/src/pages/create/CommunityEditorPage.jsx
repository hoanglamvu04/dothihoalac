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
  CheckCircle2,
  Clock3,
  FilePenLine,
  FileText,
  ImagePlus,
  Info,
  MapPin,
  MessageCircle,
  RefreshCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Tags,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import RichTextEditor from '../../components/forms/RichTextEditor';
import MediaUploader from '../../components/forms/MediaUploader';
import TaxonomyFields from '../../components/forms/TaxonomyFields';

import { communityApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { COMMUNITY_TYPES } from '../../utils/constants';

import './CommunityEditorPage.css';

const TITLE_MIN_LENGTH = 5;
const TITLE_MAX_LENGTH = 250;
const SUMMARY_MAX_LENGTH = 1000;

const POST_TYPE_DESCRIPTIONS = {
  discussion:
    'Trao đổi quan điểm, thông tin hoặc vấn đề đang được cộng đồng quan tâm.',

  question:
    'Đặt câu hỏi để nhận chia sẻ và hỗ trợ từ các thành viên.',

  report:
    'Phản ánh một sự việc, vấn đề hoặc hiện trạng cụ thể tại địa phương.',

  sharing:
    'Chia sẻ kinh nghiệm, kiến thức, hình ảnh hoặc câu chuyện hữu ích.',

  review:
    'Đánh giá địa điểm, dịch vụ hoặc trải nghiệm thực tế tại Hòa Lạc.',
};

const POST_TYPE_ICONS = {
  discussion: MessageCircle,
  question: UsersRound,
  report: AlertTriangle,
  sharing: Sparkles,
  review: Star,
};

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
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getStorageKey(editingId) {
  return editingId
    ? `community-editor-draft:${editingId}`
    : 'community-editor-draft:new';
}

function buildInitialForm(source = {}) {
  return {
    title: source.title || '',
    summary: source.summary || '',
    bodyHtml: extractBodyHtml(source),

    postType:
      source.community?.postType ||
      source.postType ||
      'discussion',

    primaryCategoryId: normalizeId(
      source.primaryCategoryId,
    ),

    primaryAreaId: normalizeId(
      source.primaryAreaId,
    ),

    tagIds: normalizeIds(
      source.tagIds,
    ),

    thumbnailMediaId:
      source.thumbnailMediaId || null,

    allowComments:
      source.allowComments !== false,

    incidentTime:
      source.community?.incidentTime ||
      source.incidentTime ||
      '',

    locationText:
      source.community?.locationText ||
      source.locationText ||
      '',

    rating:
      source.community?.rating ||
      source.rating ||
      '',
  };
}

export default function CommunityEditorPage() {
  const [params] = useSearchParams();

  const editingId = params.get('edit');

  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const formTopRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const savedSnapshotRef = useRef('');

  const source = location.state?.item || {};

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

  const [validationErrors, setValidationErrors] =
    useState({});

  const [autoSaveStatus, setAutoSaveStatus] =
    useState('idle');

  const [hasLocalDraft, setHasLocalDraft] =
    useState(false);

  const [restoredDraft, setRestoredDraft] =
    useState(false);

  const [showGuidelines, setShowGuidelines] =
    useState(true);

  const formSnapshot = useMemo(
    () => JSON.stringify(form),
    [form],
  );

  const dirty =
    formSnapshot !== savedSnapshotRef.current;

  const selectedPostType = useMemo(
    () => {
      const Icon =
        POST_TYPE_ICONS[form.postType] ||
        MessageCircle;

      return {
        icon: Icon,

        label:
          COMMUNITY_TYPES[form.postType] ||
          'Bài cộng đồng',

        description:
          POST_TYPE_DESCRIPTIONS[
            form.postType
          ] ||
          'Nội dung dành cho cộng đồng Hòa Lạc.',
      };
    },
    [form.postType],
  );

  const SelectedPostTypeIcon =
    selectedPostType.icon;

  const bodyTextLength = useMemo(
    () => stripHtml(form.bodyHtml).length,
    [form.bodyHtml],
  );

  const completionItems = useMemo(
    () => [
      {
        label: 'Tiêu đề',
        completed:
          form.title.trim().length >=
          TITLE_MIN_LENGTH,
      },
      {
        label: 'Nội dung',
        completed:
          bodyTextLength > 0 ||
          Boolean(editingId),
      },
      {
        label: 'Chuyên mục',
        completed: Boolean(
          form.primaryCategoryId,
        ),
      },
      {
        label: 'Khu vực',
        completed:
          form.postType !== 'report' ||
          Boolean(form.primaryAreaId),
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
      form.postType,
      form.primaryAreaId,
      form.primaryCategoryId,
      form.thumbnailMediaId,
      form.title,
    ],
  );

  const completionPercent = useMemo(() => {
    const requiredItems =
      completionItems.filter(
        (item) => !item.optional,
      );

    const completed =
      requiredItems.filter(
        (item) => item.completed,
      ).length;

    return Math.round(
      (completed /
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
    const initialSnapshot =
      JSON.stringify(initialForm);

    savedSnapshotRef.current =
      initialSnapshot;

    setForm(initialForm);
    setValidationErrors({});
    setRestoredDraft(false);

    try {
      const localValue =
        window.localStorage.getItem(
          storageKey,
        );

      setHasLocalDraft(
        Boolean(localValue),
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
        const localValue =
          window.localStorage.getItem(
            storageKey,
          );

        if (!localValue) {
          toast.error(
            'Không tìm thấy dữ liệu tự lưu.',
          );

          return;
        }

        const parsed =
          JSON.parse(localValue);

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
          'Đã khôi phục nội dung tự lưu.',
        );
      } catch {
        toast.error(
          'Không thể khôi phục nội dung tự lưu.',
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
          'Đã xóa dữ liệu tự lưu.',
        );
      } catch {
        toast.error(
          'Không thể xóa dữ liệu tự lưu.',
        );
      }
    }, [
      storageKey,
      toast,
    ]);

  const resetForm = useCallback(() => {
    const confirmed =
      window.confirm(
        'Bạn có chắc muốn xóa các thay đổi chưa lưu và đưa biểu mẫu về trạng thái ban đầu?',
      );

    if (!confirmed) {
      return;
    }

    setForm(initialForm);
    setValidationErrors({});
    clearLocalDraft();

    savedSnapshotRef.current =
      JSON.stringify(initialForm);

    toast.success(
      'Đã đặt lại biểu mẫu.',
    );
  }, [
    clearLocalDraft,
    initialForm,
    toast,
  ]);

  const validate = useCallback(
    (submitAfter) => {
      const errors = {};

      const title =
        form.title.trim();

      if (!title) {
        errors.title =
          'Vui lòng nhập tiêu đề.';
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

      if (
        form.summary.length >
        SUMMARY_MAX_LENGTH
      ) {
        errors.summary =
          `Mô tả không được vượt quá ${SUMMARY_MAX_LENGTH} ký tự.`;
      }

      if (
        submitAfter &&
        !editingId &&
        bodyTextLength === 0
      ) {
        errors.bodyHtml =
          'Vui lòng nhập nội dung bài viết.';
      }

      if (
        submitAfter &&
        form.postType === 'report' &&
        !form.primaryAreaId
      ) {
        errors.primaryAreaId =
          'Bài phản ánh cần chọn khu vực.';
      }

      if (
        form.postType === 'review' &&
        form.rating &&
        ![1, 2, 3, 4, 5].includes(
          Number(form.rating),
        )
      ) {
        errors.rating =
          'Điểm đánh giá không hợp lệ.';
      }

      setValidationErrors(errors);

      const firstErrorKey =
        Object.keys(errors)[0];

      if (firstErrorKey) {
        formTopRef.current?.scrollIntoView(
          {
            behavior: 'smooth',
            block: 'start',
          },
        );

        toast.error(
          errors[firstErrorKey],
        );

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
      const thumbnailMediaId =
        normalizeId(
          form.thumbnailMediaId,
        );

      const payload = {
        title: form.title.trim(),

        summary:
          form.summary.trim() ||
          undefined,

        postType: form.postType,

        primaryCategoryId:
          form.primaryCategoryId ||
          null,

        primaryAreaId:
          form.primaryAreaId ||
          null,

        tagIds: normalizeIds(
          form.tagIds,
        ),

        thumbnailMediaId,

        allowComments:
          Boolean(
            form.allowComments,
          ),

        incidentTime:
          form.postType === 'report'
            ? form.incidentTime ||
              null
            : null,

        locationText:
          form.postType === 'report'
            ? form.locationText.trim() ||
              ''
            : '',

        rating:
          form.postType === 'review' &&
          form.rating
            ? Number(form.rating)
            : null,
      };

      const normalizedBody =
        form.bodyHtml?.trim();

      if (
        normalizedBody ||
        !editingId
      ) {
        payload.bodyHtml =
          normalizedBody || '';
      }

      return payload;
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
            await communityApi.update(
              editingId,
              nextPayload,
            );
        } else {
          content =
            await communityApi.create(
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
          await communityApi.submit(
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
            ? 'Đã lưu và gửi bài đi duyệt.'
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
            'Bạn đang có thay đổi chưa lưu. Bạn vẫn muốn rời trang?',
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
    <section className="community-editor-page">
      <Seo
        title={
          editingId
            ? 'Sửa bài cộng đồng'
            : 'Đăng bài cộng đồng'
        }
        description="Tạo bài thảo luận, hỏi đáp, phản ánh, chia sẻ hoặc đánh giá dành cho cộng đồng Hòa Lạc."
      />

      <div className="community-editor-container">
        <nav className="community-editor-breadcrumb">
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
              ? 'Chỉnh sửa bài'
              : 'Bài cộng đồng'}
          </span>
        </nav>

        <header className="community-editor-hero">
          <div className="community-editor-hero__icon">
            <FilePenLine size={34} />
          </div>

          <div className="community-editor-hero__content">
            <span className="community-editor-hero__eyebrow">
              <UsersRound size={16} />
              Cộng đồng Hòa Lạc
            </span>

            <h1>
              {editingId
                ? 'Chỉnh sửa bài viết'
                : 'Tạo bài viết cộng đồng'}
            </h1>

            <p>
              Nội dung cần rõ ràng, đúng
              khu vực, có giá trị trao đổi
              và tuân thủ quy định cộng
              đồng.
            </p>
          </div>

          <div className="community-editor-hero__status">
            <div>
              <span>
                Hoàn thiện biểu mẫu
              </span>

              <strong>
                {completionPercent}%
              </strong>
            </div>

            <div className="community-editor-progress">
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
          <section className="community-editor-restore">
            <div>
              <RefreshCcw size={21} />

              <div>
                <strong>
                  Có nội dung tự lưu trên
                  thiết bị
                </strong>

                <p>
                  Bạn có thể khôi phục phần
                  nội dung đã nhập trước đó
                  hoặc tiếp tục với biểu
                  mẫu hiện tại.
                </p>
              </div>
            </div>

            <div className="community-editor-restore__actions">
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
                onClick={
                  clearLocalDraft
                }
              >
                Xóa bản tự lưu
              </button>
            </div>
          </section>
        ) : null}

        <div className="community-editor-layout">
          <main
            ref={formTopRef}
            className="community-editor-main"
          >
            <section className="community-editor-card">
              <header className="community-editor-card__heading">
                <span>
                  <MessageCircle
                    size={21}
                  />
                </span>

                <div>
                  <small>
                    Bước 1
                  </small>

                  <h2>
                    Loại bài viết
                  </h2>

                  <p>
                    Chọn loại phù hợp để
                    hệ thống hiển thị đúng
                    trường thông tin.
                  </p>
                </div>
              </header>

              <div className="community-type-grid">
                {Object.entries(
                  COMMUNITY_TYPES,
                ).map(
                  ([value, label]) => {
                    const TypeIcon =
                      POST_TYPE_ICONS[
                        value
                      ] ||
                      MessageCircle;

                    const selected =
                      form.postType ===
                      value;

                    return (
                      <button
                        type="button"
                        key={value}
                        className={
                          selected
                            ? 'is-selected'
                            : ''
                        }
                        onClick={() =>
                          change(
                            'postType',
                            value,
                          )
                        }
                      >
                        <span>
                          <TypeIcon
                            size={21}
                          />
                        </span>

                        <strong>
                          {label}
                        </strong>

                        <small>
                          {POST_TYPE_DESCRIPTIONS[
                            value
                          ] ||
                            'Bài viết dành cho cộng đồng.'}
                        </small>

                        {selected ? (
                          <CheckCircle2
                            size={18}
                          />
                        ) : null}
                      </button>
                    );
                  },
                )}
              </div>

              <div className="community-selected-type">
                <SelectedPostTypeIcon
                  size={19}
                />

                <div>
                  <strong>
                    {
                      selectedPostType.label
                    }
                  </strong>

                  <p>
                    {
                      selectedPostType.description
                    }
                  </p>
                </div>
              </div>

              {form.postType ===
              'review' ? (
                <div className="community-review-rating">
                  <FormField
                    label="Điểm đánh giá"
                    required
                  >
                    <select
                      value={form.rating}
                      onChange={(event) =>
                        change(
                          'rating',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="">
                        Chọn điểm đánh giá
                      </option>

                      {[5, 4, 3, 2, 1].map(
                        (value) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {value}/5 sao
                          </option>
                        ),
                      )}
                    </select>
                  </FormField>

                  {validationErrors.rating ? (
                    <p className="community-field-error">
                      {
                        validationErrors.rating
                      }
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="community-editor-card">
              <header className="community-editor-card__heading">
                <span>
                  <FileText size={21} />
                </span>

                <div>
                  <small>
                    Bước 2
                  </small>

                  <h2>
                    Nội dung bài viết
                  </h2>

                  <p>
                    Viết tiêu đề rõ ràng,
                    mô tả ngắn gọn và nội
                    dung đầy đủ.
                  </p>
                </div>
              </header>

              <div className="community-editor-field">
                <div className="community-editor-field__label">
                  <label htmlFor="community-title">
                    Tiêu đề
                    <span>*</span>
                  </label>

                  <small
                    className={
                      form.title.length >
                      TITLE_MAX_LENGTH
                        ? 'is-over-limit'
                        : ''
                    }
                  >
                    {form.title.length}/
                    {TITLE_MAX_LENGTH}
                  </small>
                </div>

                <input
                  id="community-title"
                  value={form.title}
                  minLength={
                    TITLE_MIN_LENGTH
                  }
                  maxLength={
                    TITLE_MAX_LENGTH
                  }
                  placeholder="Ví dụ: Tuyến đường vào khu dân cư đang xuống cấp, cần đơn vị kiểm tra"
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
                  <p className="community-field-error">
                    {
                      validationErrors.title
                    }
                  </p>
                ) : (
                  <p className="community-field-hint">
                    Nêu đúng vấn đề chính,
                    hạn chế viết hoa toàn bộ
                    hoặc dùng tiêu đề gây
                    hiểu nhầm.
                  </p>
                )}
              </div>

              <div className="community-editor-field">
                <div className="community-editor-field__label">
                  <label htmlFor="community-summary">
                    Mô tả ngắn
                  </label>

                  <small
                    className={
                      form.summary.length >
                      SUMMARY_MAX_LENGTH
                        ? 'is-over-limit'
                        : ''
                    }
                  >
                    {form.summary.length}/
                    {SUMMARY_MAX_LENGTH}
                  </small>
                </div>

                <textarea
                  id="community-summary"
                  rows="4"
                  value={form.summary}
                  maxLength={
                    SUMMARY_MAX_LENGTH
                  }
                  placeholder="Tóm tắt nội dung để người đọc nhanh chóng hiểu bài viết đang nói về vấn đề gì."
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
                  <p className="community-field-error">
                    {
                      validationErrors.summary
                    }
                  </p>
                ) : null}
              </div>

              <div className="community-editor-field">
                <div className="community-editor-field__label">
                  <label>
                    Nội dung
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
                      ? 'community-rich-editor has-error'
                      : 'community-rich-editor'
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
                  <p className="community-field-error">
                    {
                      validationErrors.bodyHtml
                    }
                  </p>
                ) : (
                  <p className="community-field-hint">
                    Cung cấp đủ bối cảnh,
                    thời gian, địa điểm và
                    nguồn thông tin khi có.
                  </p>
                )}
              </div>
            </section>

            <section className="community-editor-card">
              <header className="community-editor-card__heading">
                <span>
                  <Tags size={21} />
                </span>

                <div>
                  <small>
                    Bước 3
                  </small>

                  <h2>
                    Phân loại nội dung
                  </h2>

                  <p>
                    Chọn chuyên mục, khu vực
                    và thẻ nội dung để bài
                    viết dễ được tìm thấy.
                  </p>
                </div>
              </header>

              <div className="community-taxonomy-wrapper">
                <TaxonomyFields
                  scope="community"
                  categoryId={
                    form.primaryCategoryId
                  }
                  areaId={
                    form.primaryAreaId
                  }
                  tagIds={form.tagIds}
                  onChange={change}
                  areaRequired={
                    form.postType ===
                    'report'
                  }
                />
              </div>

              {validationErrors.primaryAreaId ? (
                <p className="community-field-error">
                  {
                    validationErrors.primaryAreaId
                  }
                </p>
              ) : null}
            </section>

            {form.postType ===
            'report' ? (
              <section className="community-editor-card community-report-card">
                <header className="community-editor-card__heading">
                  <span>
                    <AlertTriangle
                      size={21}
                    />
                  </span>

                  <div>
                    <small>
                      Thông tin phản ánh
                    </small>

                    <h2>
                      Thời gian và địa điểm
                    </h2>

                    <p>
                      Thông tin cụ thể giúp
                      cộng đồng và đơn vị
                      liên quan dễ xác minh.
                    </p>
                  </div>
                </header>

                <div className="community-report-grid">
                  <FormField label="Thời gian xảy ra">
                    <div className="community-input-with-icon">
                      <Clock3 size={18} />

                      <input
                        type="datetime-local"
                        value={
                          form.incidentTime
                        }
                        onChange={(event) =>
                          change(
                            'incidentTime',
                            event.target
                              .value,
                          )
                        }
                      />
                    </div>
                  </FormField>

                  <FormField label="Địa điểm cụ thể">
                    <div className="community-input-with-icon">
                      <MapPin size={18} />

                      <input
                        value={
                          form.locationText
                        }
                        maxLength="500"
                        placeholder="Tên đường, thôn, xã hoặc mốc địa điểm gần nhất"
                        onChange={(event) =>
                          change(
                            'locationText',
                            event.target
                              .value,
                          )
                        }
                      />
                    </div>
                  </FormField>
                </div>

                <div className="community-report-notice">
                  <ShieldCheck size={19} />

                  <p>
                    Chỉ phản ánh sự việc bạn
                    có căn cứ hoặc trải
                    nghiệm thực tế. Không
                    công khai dữ liệu cá
                    nhân của người khác.
                  </p>
                </div>
              </section>
            ) : null}

            <section className="community-editor-card">
              <header className="community-editor-card__heading">
                <span>
                  <ImagePlus size={21} />
                </span>

                <div>
                  <small>
                    Bước 4
                  </small>

                  <h2>
                    Ảnh đại diện
                  </h2>

                  <p>
                    Chọn hình ảnh liên quan
                    trực tiếp đến nội dung
                    bài viết.
                  </p>
                </div>
              </header>

              <div className="community-media-wrapper">
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
              </div>

              <div className="community-image-guidance">
                <Info size={18} />

                <p>
                  Nên dùng ảnh rõ nét, đúng
                  hiện trạng và không chứa
                  thông tin cá nhân nhạy cảm.
                </p>
              </div>
            </section>

            <section className="community-editor-card community-settings-card">
              <header className="community-editor-card__heading">
                <span>
                  <MessageCircle
                    size={21}
                  />
                </span>

                <div>
                  <small>
                    Thiết lập bài viết
                  </small>

                  <h2>
                    Bình luận và tương tác
                  </h2>
                </div>
              </header>

              <label className="community-comments-setting">
                <input
                  type="checkbox"
                  checked={
                    form.allowComments
                  }
                  onChange={(event) =>
                    change(
                      'allowComments',
                      event.target.checked,
                    )
                  }
                />

                <span className="community-comments-setting__control" />

                <span>
                  <strong>
                    Cho phép thành viên bình
                    luận
                  </strong>

                  <small>
                    Thành viên có thể trao
                    đổi và phản hồi bên dưới
                    bài viết.
                  </small>
                </span>
              </label>
            </section>

            {editingId &&
            !extractBodyHtml(source) ? (
              <div className="community-editor-warning">
                <AlertTriangle
                  size={20}
                />

                <div>
                  <strong>
                    Chưa tải được nội dung
                    HTML của bản nháp
                  </strong>

                  <p>
                    Các trường bạn nhập lại
                    trên trang này sẽ được
                    cập nhật. Trường nội
                    dung chỉ được gửi lên
                    server khi bạn nhập hoặc
                    chỉnh sửa lại.
                  </p>
                </div>
              </div>
            ) : null}

            <section className="community-editor-actions">
              <div>
                <button
                  type="button"
                  className="community-reset-button"
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

              <div>
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

          <aside className="community-editor-sidebar">
            <div className="community-editor-sidebar__content">
              <section className="community-editor-sidebar-card community-completion-card">
                <div className="community-sidebar-heading">
                  <CheckCircle2
                    size={20}
                  />

                  <div>
                    <h2>
                      Mức độ hoàn thiện
                    </h2>

                    <p>
                      Kiểm tra các thông tin
                      chính trước khi gửi.
                    </p>
                  </div>
                </div>

                <div className="community-completion-score">
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

                <ul>
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

              <section className="community-editor-sidebar-card">
                <div className="community-sidebar-heading">
                  <FilePenLine
                    size={20}
                  />

                  <div>
                    <h2>
                      Loại bài đang chọn
                    </h2>

                    <p>
                      {
                        selectedPostType.label
                      }
                    </p>
                  </div>
                </div>

                <div className="community-type-summary">
                  <span>
                    <SelectedPostTypeIcon
                      size={24}
                    />
                  </span>

                  <strong>
                    {
                      selectedPostType.label
                    }
                  </strong>

                  <p>
                    {
                      selectedPostType.description
                    }
                  </p>
                </div>
              </section>

              <section className="community-editor-sidebar-card">
                <button
                  type="button"
                  className="community-guidelines-toggle"
                  onClick={() =>
                    setShowGuidelines(
                      (current) =>
                        !current,
                    )
                  }
                >
                  <span>
                    <ShieldCheck
                      size={20}
                    />

                    <strong>
                      Hướng dẫn đăng bài
                    </strong>
                  </span>

                  <span>
                    {showGuidelines
                      ? 'Thu gọn'
                      : 'Mở rộng'}
                  </span>
                </button>

                {showGuidelines ? (
                  <ul className="community-guidelines-list">
                    <li>
                      Viết tiêu đề đúng nội
                      dung, không gây hiểu
                      nhầm.
                    </li>

                    <li>
                      Chọn đúng khu vực và
                      chuyên mục liên quan.
                    </li>

                    <li>
                      Không đăng nội dung
                      xúc phạm hoặc chưa có
                      căn cứ.
                    </li>

                    <li>
                      Che thông tin cá nhân
                      trong hình ảnh, giấy tờ.
                    </li>

                    <li>
                      Không đăng quảng cáo
                      lặp lại hoặc liên kết
                      rác.
                    </li>
                  </ul>
                ) : null}

                <Link
                  className="community-guidelines-link"
                  to="/quy-dinh-dang-bai"
                  target="_blank"
                >
                  Xem quy định đầy đủ
                </Link>
              </section>

              <section className="community-editor-sidebar-card community-moderation-card">
                <ShieldCheck size={24} />

                <small>
                  Quy trình kiểm duyệt
                </small>

                <h2>
                  Nội dung được kiểm tra
                  trước khi xuất bản
                </h2>

                <p>
                  Bài viết có thể được yêu
                  cầu bổ sung, chỉnh sửa
                  hoặc từ chối khi không
                  phù hợp với quy định.
                </p>

                <div>
                  <span>
                    <Clock3 size={16} />
                    Trạng thái chờ duyệt
                  </span>

                  <span>
                    <MessageCircle
                      size={16}
                    />
                    Có thể nhận phản hồi
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