import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Home,
  ImagePlus,
  Info,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  RefreshCcw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import MediaUploader from '../../components/forms/MediaUploader';

import { articleApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';

import './NewsTipPage.css';

const STORAGE_KEY =
  'dothihoalac-news-tip-draft';

const TITLE_MIN_LENGTH = 10;
const TITLE_MAX_LENGTH = 250;

const DESCRIPTION_MIN_LENGTH = 20;
const DESCRIPTION_MAX_LENGTH = 10000;

const SOURCE_MAX_LENGTH = 2000;

const INITIAL_FORM = {
  title: '',
  description: '',
  areaId: '',
  eventTime: '',
  source: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  allowContact: false,
};

const SUBMISSION_GUIDELINES = [
  'Mô tả rõ sự việc, địa điểm và thời gian xảy ra.',
  'Cung cấp nguồn hoặc tài liệu đối chiếu khi có.',
  'Chỉ sử dụng hình ảnh bạn có quyền cung cấp.',
  'Không công khai giấy tờ hoặc dữ liệu cá nhân nhạy cảm.',
  'Không gửi thông tin chưa kiểm chứng với mục đích gây hiểu nhầm.',
];

function normalizeMediaId(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || null;
}

function getMediaIds(media) {
  const values = Array.isArray(media)
    ? media
    : media
      ? [media]
      : [];

  return values
    .map(normalizeMediaId)
    .filter(Boolean);
}

function isValidEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function buildInitialState() {
  return {
    form: {
      ...INITIAL_FORM,
    },
    media: null,
  };
}

export default function NewsTipPage() {
  const { areas = [] } = useTaxonomy();
  const toast = useToast();
  const navigate = useNavigate();

  const formTopRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const savedSnapshotRef = useRef('');

  const [form, setForm] = useState(
    INITIAL_FORM,
  );

  const [media, setMedia] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [done, setDone] =
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

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        form,
        media,
      }),
    [form, media],
  );

  const dirty =
    snapshot !==
    savedSnapshotRef.current;

  const completionItems = useMemo(
    () => [
      {
        label: 'Tiêu đề thông tin',
        completed:
          form.title.trim().length >=
          TITLE_MIN_LENGTH,
      },
      {
        label: 'Nội dung sự việc',
        completed:
          form.description.trim()
            .length >=
          DESCRIPTION_MIN_LENGTH,
      },
      {
        label: 'Khu vực',
        completed: Boolean(
          form.areaId,
        ),
        optional: true,
      },
      {
        label: 'Thời gian xảy ra',
        completed: Boolean(
          form.eventTime,
        ),
        optional: true,
      },
      {
        label: 'Nguồn thông tin',
        completed: Boolean(
          form.source.trim(),
        ),
        optional: true,
      },
      {
        label: 'Ảnh minh họa',
        completed:
          getMediaIds(media).length >
          0,
        optional: true,
      },
      {
        label: 'Thông tin liên hệ',
        completed: Boolean(
          form.contactName.trim() ||
            form.contactPhone.trim() ||
            form.contactEmail.trim(),
        ),
        optional: true,
      },
    ],
    [form, media],
  );

  const completionPercent = useMemo(() => {
    const requiredItems =
      completionItems.filter(
        (item) => !item.optional,
      );

    const optionalItems =
      completionItems.filter(
        (item) => item.optional,
      );

    const requiredScore =
      requiredItems.filter(
        (item) => item.completed,
      ).length *
      35;

    const optionalCompleted =
      optionalItems.filter(
        (item) => item.completed,
      ).length;

    const optionalScore =
      optionalItems.length > 0
        ? Math.round(
            (optionalCompleted /
              optionalItems.length) *
              30,
          )
        : 0;

    return Math.min(
      requiredScore + optionalScore,
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
    const initialState =
      buildInitialState();

    savedSnapshotRef.current =
      JSON.stringify(initialState);

    try {
      const stored =
        window.localStorage.getItem(
          STORAGE_KEY,
        );

      setHasLocalDraft(
        Boolean(stored),
      );
    } catch {
      setHasLocalDraft(false);
    }
  }, []);

  useEffect(() => {
    if (
      !dirty ||
      done
    ) {
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
            STORAGE_KEY,
            JSON.stringify({
              form,
              media,
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
    done,
    form,
    media,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (
      event,
    ) => {
      if (
        !dirty ||
        loading ||
        done
      ) {
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
    done,
    loading,
  ]);

  const restoreLocalDraft =
    useCallback(() => {
      try {
        const stored =
          window.localStorage.getItem(
            STORAGE_KEY,
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
          ...INITIAL_FORM,
          ...parsed.form,
        });

        setMedia(
          parsed.media || null,
        );

        setRestoredDraft(true);

        toast.success(
          'Đã khôi phục thông tin tự lưu.',
        );
      } catch {
        toast.error(
          'Không thể khôi phục bản tự lưu.',
        );
      }
    }, [toast]);

  const clearLocalDraft =
    useCallback(() => {
      try {
        window.localStorage.removeItem(
          STORAGE_KEY,
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
    }, [toast]);

  const resetForm = useCallback(() => {
    const confirmed =
      window.confirm(
        'Bạn có chắc muốn xóa toàn bộ thông tin đang nhập?',
      );

    if (!confirmed) {
      return;
    }

    const initialState =
      buildInitialState();

    setForm(initialState.form);
    setMedia(initialState.media);
    setValidationErrors({});
    setDone(false);
    setRestoredDraft(false);
    setHasLocalDraft(false);
    setAutoSaveStatus('idle');

    savedSnapshotRef.current =
      JSON.stringify(initialState);

    try {
      window.localStorage.removeItem(
        STORAGE_KEY,
      );
    } catch {
      // Không chặn thao tác đặt lại biểu mẫu.
    }

    toast.success(
      'Đã đặt lại biểu mẫu.',
    );
  }, [toast]);

  const validate = useCallback(() => {
    const errors = {};

    const title =
      form.title.trim();

    const description =
      form.description.trim();

    if (!title) {
      errors.title =
        'Vui lòng nhập tiêu đề thông tin.';
    } else if (
      title.length <
      TITLE_MIN_LENGTH
    ) {
      errors.title =
        `Tiêu đề cần ít nhất ${TITLE_MIN_LENGTH} ký tự.`;
    } else if (
      title.length >
      TITLE_MAX_LENGTH
    ) {
      errors.title =
        `Tiêu đề không được vượt quá ${TITLE_MAX_LENGTH} ký tự.`;
    }

    if (!description) {
      errors.description =
        'Vui lòng mô tả nội dung sự việc.';
    } else if (
      description.length <
      DESCRIPTION_MIN_LENGTH
    ) {
      errors.description =
        `Nội dung cần ít nhất ${DESCRIPTION_MIN_LENGTH} ký tự.`;
    } else if (
      description.length >
      DESCRIPTION_MAX_LENGTH
    ) {
      errors.description =
        `Nội dung không được vượt quá ${DESCRIPTION_MAX_LENGTH} ký tự.`;
    }

    if (
      form.source.length >
      SOURCE_MAX_LENGTH
    ) {
      errors.source =
        `Nguồn thông tin không được vượt quá ${SOURCE_MAX_LENGTH} ký tự.`;
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
      form.allowContact &&
      !form.contactPhone.trim() &&
      !form.contactEmail.trim()
    ) {
      errors.allowContact =
        'Vui lòng cung cấp số điện thoại hoặc email để Ban biên tập liên hệ.';
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
  }, [form, toast]);

  const buildPayload =
    useCallback(
      () => ({
        title: form.title.trim(),

        description:
          form.description.trim(),

        areaId:
          form.areaId || null,

        eventTime:
          form.eventTime || null,

        source:
          form.source.trim() ||
          undefined,

        contactName:
          form.contactName.trim() ||
          undefined,

        contactPhone:
          form.contactPhone.trim() ||
          undefined,

        contactEmail:
          form.contactEmail.trim() ||
          undefined,

        allowContact:
          Boolean(
            form.allowContact,
          ),

        mediaIds:
          getMediaIds(media),
      }),
      [form, media],
    );

  const submit = useCallback(
    async (event) => {
      event.preventDefault();

      if (
        loading ||
        !validate()
      ) {
        return;
      }

      setLoading(true);

      try {
        await articleApi.submitTip(
          buildPayload(),
        );

        const initialState =
          buildInitialState();

        savedSnapshotRef.current =
          JSON.stringify(initialState);

        try {
          window.localStorage.removeItem(
            STORAGE_KEY,
          );
        } catch {
          // Không chặn trạng thái gửi thành công.
        }

        setHasLocalDraft(false);
        setAutoSaveStatus('idle');
        setDone(true);

        toast.success(
          'Đã gửi thông tin tới Ban biên tập.',
        );

        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
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
      loading,
      toast,
      validate,
    ],
  );

  const sendAnotherTip =
    useCallback(() => {
      const initialState =
        buildInitialState();

      setForm(initialState.form);
      setMedia(initialState.media);
      setValidationErrors({});
      setDone(false);
      setRestoredDraft(false);
      setHasLocalDraft(false);
      setAutoSaveStatus('idle');

      savedSnapshotRef.current =
        JSON.stringify(initialState);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, []);

  const handleBack =
    useCallback(() => {
      if (
        dirty &&
        !done
      ) {
        const confirmed =
          window.confirm(
            'Bạn đang có thông tin chưa gửi. Bạn vẫn muốn rời trang?',
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
      done,
      navigate,
    ]);

  return (
    <section className="news-tip-page">
      <Seo
        title="Gửi tin cho Ban biên tập"
        description="Cung cấp sự kiện, hình ảnh, thông báo hoặc nguồn tin đáng chú ý tại Hòa Lạc cho Ban biên tập."
      />

      <div className="news-tip-container">
        <nav className="news-tip-breadcrumb">
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
            Gửi tin địa phương
          </span>
        </nav>

        {done ? (
          <section className="news-tip-success">
            <div className="news-tip-success__visual">
              <div>
                <CheckCircle2
                  size={58}
                />
              </div>

              <span>
                Đã gửi thành công
              </span>
            </div>

            <div className="news-tip-success__content">
              <span className="news-tip-success__eyebrow">
                <FileCheck2 size={17} />
                Ban biên tập đã tiếp nhận
              </span>

              <h1>
                Cảm ơn bạn đã cung cấp
                thông tin
              </h1>

              <p>
                Nguồn tin sẽ được kiểm tra,
                xác minh và biên tập trước
                khi xuất bản. Ban biên tập
                có thể liên hệ khi cần làm
                rõ thêm thông tin.
              </p>

              <div className="news-tip-success__notice">
                <ShieldCheck
                  size={20}
                />

                <div>
                  <strong>
                    Thông tin liên hệ không
                    tự động công khai
                  </strong>

                  <p>
                    Dữ liệu liên hệ chỉ được
                    sử dụng cho việc xác minh
                    nguồn tin bạn vừa gửi.
                  </p>
                </div>
              </div>

              <div className="news-tip-success__actions">
                <button
                  type="button"
                  onClick={sendAnotherTip}
                >
                  <RefreshCcw
                    size={18}
                  />
                  Gửi thêm thông tin
                </button>

                <Link to="/">
                  <Home size={18} />
                  Về trang chủ
                </Link>

                <Link to="/tin-tuc">
                  Xem tin mới
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            <header className="news-tip-hero">
              <div className="news-tip-hero__content">
                <span className="news-tip-hero__eyebrow">
                  <Newspaper size={17} />
                  Nguồn tin cộng đồng
                </span>

                <h1>
                  Gửi tin cho Ban biên tập
                </h1>

                <p>
                  Cung cấp sự kiện, hình ảnh,
                  văn bản hoặc thông tin đáng
                  chú ý tại Hòa Lạc. Nội dung
                  sẽ được kiểm tra trước khi
                  xuất bản.
                </p>

                <div className="news-tip-hero__actions">
                  <a
                    href="#news-tip-form"
                    className="news-tip-primary-action"
                  >
                    <Send size={18} />
                    Điền thông tin
                  </a>

                  <Link
                    to="/quy-dinh-dang-bai"
                    className="news-tip-secondary-action"
                  >
                    <ShieldCheck
                      size={18}
                    />
                    Quy định cung cấp tin
                  </Link>
                </div>
              </div>

              <div className="news-tip-hero__status">
                <div className="news-tip-hero__status-heading">
                  <span>
                    <Sparkles
                      size={22}
                    />
                  </span>

                  <div>
                    <strong>
                      Mức độ hoàn thiện
                    </strong>

                    <small>
                      Thông tin càng đầy đủ,
                      quá trình xác minh càng
                      thuận lợi
                    </small>
                  </div>
                </div>

                <div className="news-tip-hero__score">
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

                <p>
                  {autoSaveStatus ===
                  'saving'
                    ? 'Đang tự lưu biểu mẫu...'
                    : autoSaveStatus ===
                        'saved'
                      ? 'Đã tự lưu trên thiết bị'
                      : autoSaveStatus ===
                          'error'
                        ? 'Không thể tự lưu'
                        : dirty
                          ? 'Có thay đổi chưa lưu'
                          : 'Chưa có nội dung mới'}
                </p>
              </div>
            </header>

            {hasLocalDraft &&
            !restoredDraft ? (
              <section className="news-tip-restore">
                <div>
                  <RefreshCcw size={21} />

                  <div>
                    <strong>
                      Có thông tin tự lưu trên
                      thiết bị
                    </strong>

                    <p>
                      Bạn có thể khôi phục nội
                      dung đã nhập trước đó
                      hoặc xóa bản tự lưu để
                      bắt đầu lại.
                    </p>
                  </div>
                </div>

                <div className="news-tip-restore__actions">
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

            <div className="news-tip-layout">
              <main
                ref={formTopRef}
                className="news-tip-main"
              >
                <form
                  id="news-tip-form"
                  className="news-tip-form"
                  onSubmit={submit}
                >
                  <section className="news-tip-card">
                    <header className="news-tip-card__heading">
                      <span>
                        <FileText
                          size={22}
                        />
                      </span>

                      <div>
                        <small>
                          Bước 1
                        </small>

                        <h2>
                          Nội dung nguồn tin
                        </h2>

                        <p>
                          Nêu rõ sự việc và
                          những thông tin Ban
                          biên tập cần kiểm tra.
                        </p>
                      </div>
                    </header>

                    <div className="news-tip-field">
                      <div className="news-tip-field__label">
                        <label htmlFor="tip-title">
                          Tiêu đề thông tin
                          <span>*</span>
                        </label>

                        <small>
                          {form.title.length}/
                          {TITLE_MAX_LENGTH}
                        </small>
                      </div>

                      <input
                        id="tip-title"
                        value={form.title}
                        minLength={
                          TITLE_MIN_LENGTH
                        }
                        maxLength={
                          TITLE_MAX_LENGTH
                        }
                        placeholder="Ví dụ: Sự kiện trồng cây cộng đồng tại xã Thạch Hòa cuối tuần này"
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
                        <p className="news-tip-field-error">
                          {
                            validationErrors.title
                          }
                        </p>
                      ) : (
                        <p className="news-tip-field-hint">
                          Tiêu đề nên thể hiện
                          rõ sự việc, địa điểm
                          hoặc thời gian đáng
                          chú ý.
                        </p>
                      )}
                    </div>

                    <div className="news-tip-field">
                      <div className="news-tip-field__label">
                        <label htmlFor="tip-description">
                          Nội dung sự việc
                          <span>*</span>
                        </label>

                        <small>
                          {
                            form.description
                              .length
                          }
                          /
                          {
                            DESCRIPTION_MAX_LENGTH
                          }
                        </small>
                      </div>

                      <textarea
                        id="tip-description"
                        rows="10"
                        value={
                          form.description
                        }
                        minLength={
                          DESCRIPTION_MIN_LENGTH
                        }
                        maxLength={
                          DESCRIPTION_MAX_LENGTH
                        }
                        placeholder="Mô tả sự việc, những người hoặc đơn vị liên quan, thời gian, địa điểm và thông tin cần được kiểm tra..."
                        className={
                          validationErrors.description
                            ? 'has-error'
                            : ''
                        }
                        onChange={(event) =>
                          change(
                            'description',
                            event.target.value,
                          )
                        }
                      />

                      {validationErrors.description ? (
                        <p className="news-tip-field-error">
                          {
                            validationErrors.description
                          }
                        </p>
                      ) : (
                        <p className="news-tip-field-hint">
                          Trình bày khách quan,
                          tránh kết luận khi
                          chưa có đầy đủ căn cứ.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="news-tip-card">
                    <header className="news-tip-card__heading">
                      <span>
                        <MapPin size={22} />
                      </span>

                      <div>
                        <small>
                          Bước 2
                        </small>

                        <h2>
                          Khu vực và thời gian
                        </h2>

                        <p>
                          Các thông tin này
                          giúp Ban biên tập
                          xác minh sự việc
                          chính xác hơn.
                        </p>
                      </div>
                    </header>

                    <div className="news-tip-grid news-tip-grid--2">
                      <div className="news-tip-field">
                        <div className="news-tip-field__label">
                          <label htmlFor="tip-area">
                            Khu vực
                          </label>
                        </div>

                        <div className="news-tip-input-with-icon">
                          <MapPin size={18} />

                          <select
                            id="tip-area"
                            value={form.areaId}
                            onChange={(event) =>
                              change(
                                'areaId',
                                event.target.value,
                              )
                            }
                          >
                            <option value="">
                              Chưa xác định
                            </option>

                            {areas.map(
                              (area) => (
                                <option
                                  key={
                                    area._id ||
                                    area.id
                                  }
                                  value={
                                    area._id ||
                                    area.id
                                  }
                                >
                                  {area.name}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="news-tip-field">
                        <div className="news-tip-field__label">
                          <label htmlFor="tip-event-time">
                            Thời gian xảy ra
                          </label>
                        </div>

                        <div className="news-tip-input-with-icon">
                          <CalendarDays
                            size={18}
                          />

                          <input
                            id="tip-event-time"
                            type="datetime-local"
                            value={
                              form.eventTime
                            }
                            onChange={(event) =>
                              change(
                                'eventTime',
                                event.target
                                  .value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="news-tip-notice">
                      <Info size={18} />

                      <p>
                        Trường hợp không nhớ
                        chính xác thời gian,
                        bạn có thể mô tả khoảng
                        thời gian trong phần
                        nội dung sự việc.
                      </p>
                    </div>
                  </section>

                  <section className="news-tip-card">
                    <header className="news-tip-card__heading">
                      <span>
                        <ShieldCheck
                          size={22}
                        />
                      </span>

                      <div>
                        <small>
                          Bước 3
                        </small>

                        <h2>
                          Nguồn và tài liệu
                          minh họa
                        </h2>

                        <p>
                          Cho biết nguồn bạn
                          tiếp cận thông tin và
                          bổ sung hình ảnh khi
                          có.
                        </p>
                      </div>
                    </header>

                    <div className="news-tip-field">
                      <div className="news-tip-field__label">
                        <label htmlFor="tip-source">
                          Nguồn thông tin
                        </label>

                        <small>
                          {form.source.length}/
                          {SOURCE_MAX_LENGTH}
                        </small>
                      </div>

                      <textarea
                        id="tip-source"
                        rows="4"
                        value={form.source}
                        maxLength={
                          SOURCE_MAX_LENGTH
                        }
                        placeholder="Ví dụ: Trực tiếp chứng kiến, thông báo của đơn vị tổ chức, văn bản, đường dẫn nguồn..."
                        className={
                          validationErrors.source
                            ? 'has-error'
                            : ''
                        }
                        onChange={(event) =>
                          change(
                            'source',
                            event.target.value,
                          )
                        }
                      />

                      {validationErrors.source ? (
                        <p className="news-tip-field-error">
                          {
                            validationErrors.source
                          }
                        </p>
                      ) : null}
                    </div>

                    <div className="news-tip-media">
                      <div className="news-tip-media__heading">
                        <ImagePlus
                          size={20}
                        />

                        <div>
                          <strong>
                            Ảnh minh họa
                          </strong>

                          <p>
                            Sử dụng ảnh đúng
                            sự việc, rõ nét và
                            không chứa dữ liệu
                            cá nhân nhạy cảm.
                          </p>
                        </div>
                      </div>

                      <MediaUploader
                        label="Ảnh minh họa"
                        value={media}
                        onChange={setMedia}
                      />
                    </div>
                  </section>

                  <section className="news-tip-card">
                    <header className="news-tip-card__heading">
                      <span>
                        <UserRound
                          size={22}
                        />
                      </span>

                      <div>
                        <small>
                          Bước 4
                        </small>

                        <h2>
                          Thông tin liên hệ
                          riêng
                        </h2>

                        <p>
                          Thông tin này không
                          tự động hiển thị công
                          khai trên website.
                        </p>
                      </div>
                    </header>

                    <div className="news-tip-grid news-tip-grid--2">
                      <div className="news-tip-field">
                        <div className="news-tip-field__label">
                          <label htmlFor="tip-contact-name">
                            Họ tên
                          </label>
                        </div>

                        <div className="news-tip-input-with-icon">
                          <UserRound
                            size={18}
                          />

                          <input
                            id="tip-contact-name"
                            value={
                              form.contactName
                            }
                            maxLength="200"
                            placeholder="Tên người cung cấp tin"
                            onChange={(event) =>
                              change(
                                'contactName',
                                event.target
                                  .value,
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="news-tip-field">
                        <div className="news-tip-field__label">
                          <label htmlFor="tip-contact-phone">
                            Số điện thoại
                          </label>
                        </div>

                        <div className="news-tip-input-with-icon">
                          <Phone size={18} />

                          <input
                            id="tip-contact-phone"
                            type="tel"
                            value={
                              form.contactPhone
                            }
                            maxLength="30"
                            placeholder="0966 709 790"
                            onChange={(event) =>
                              change(
                                'contactPhone',
                                event.target
                                  .value,
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="news-tip-field news-tip-field--full">
                        <div className="news-tip-field__label">
                          <label htmlFor="tip-contact-email">
                            Email
                          </label>
                        </div>

                        <div className="news-tip-input-with-icon">
                          <Mail size={18} />

                          <input
                            id="tip-contact-email"
                            type="email"
                            value={
                              form.contactEmail
                            }
                            placeholder="email@example.com"
                            className={
                              validationErrors.contactEmail
                                ? 'has-error'
                                : ''
                            }
                            onChange={(event) =>
                              change(
                                'contactEmail',
                                event.target
                                  .value,
                              )
                            }
                          />
                        </div>

                        {validationErrors.contactEmail ? (
                          <p className="news-tip-field-error">
                            {
                              validationErrors.contactEmail
                            }
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <label className="news-tip-contact-permission">
                      <input
                        type="checkbox"
                        checked={
                          form.allowContact
                        }
                        onChange={(event) =>
                          change(
                            'allowContact',
                            event.target
                              .checked,
                          )
                        }
                      />

                      <span className="news-tip-contact-permission__control" />

                      <span>
                        <strong>
                          Đồng ý để Ban biên
                          tập liên hệ xác minh
                        </strong>

                        <small>
                          Ban biên tập có thể
                          sử dụng số điện thoại
                          hoặc email để làm rõ
                          thông tin nguồn tin.
                        </small>
                      </span>
                    </label>

                    {validationErrors.allowContact ? (
                      <p className="news-tip-field-error">
                        {
                          validationErrors.allowContact
                        }
                      </p>
                    ) : null}

                    <div className="news-tip-privacy-notice">
                      <ShieldCheck
                        size={19}
                      />

                      <p>
                        Thông tin liên hệ chỉ
                        được sử dụng để xác
                        minh nội dung bạn chủ
                        động gửi và không tự
                        động công khai cùng bài
                        viết.
                      </p>
                    </div>
                  </section>

                  <section className="news-tip-form-actions">
                    <div>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={resetForm}
                      >
                        <RotateCcw
                          size={17}
                        />
                        Đặt lại
                      </button>

                      <span>
                        {dirty
                          ? 'Bạn đang có thay đổi chưa gửi.'
                          : 'Biểu mẫu chưa có thay đổi mới.'}
                      </span>
                    </div>

                    <Button
                      type="submit"
                      loading={loading}
                      disabled={loading}
                    >
                      <Send size={18} />
                      Gửi thông tin
                    </Button>
                  </section>
                </form>
              </main>

              <aside className="news-tip-sidebar">
                <div className="news-tip-sidebar__content">
                  <section className="news-tip-sidebar-card">
                    <div className="news-tip-sidebar-heading">
                      <CheckCircle2
                        size={20}
                      />

                      <div>
                        <h2>
                          Mức độ hoàn thiện
                        </h2>

                        <p>
                          Kiểm tra thông tin
                          trước khi gửi.
                        </p>
                      </div>
                    </div>

                    <div className="news-tip-completion-score">
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

                    <ul className="news-tip-completion-list">
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

                  <section className="news-tip-sidebar-card">
                    <div className="news-tip-sidebar-heading">
                      <FileText
                        size={20}
                      />

                      <div>
                        <h2>
                          Thông tin nên có
                        </h2>

                        <p>
                          Dữ liệu giúp Ban biên
                          tập xác minh nhanh
                          hơn.
                        </p>
                      </div>
                    </div>

                    <ul className="news-tip-guideline-list">
                      {SUBMISSION_GUIDELINES.map(
                        (guideline) => (
                          <li key={guideline}>
                            {guideline}
                          </li>
                        ),
                      )}
                    </ul>

                    <Link
                      to="/quy-dinh-dang-bai"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Xem quy định đầy đủ
                    </Link>
                  </section>

                  <section className="news-tip-sidebar-card">
                    <div className="news-tip-sidebar-heading">
                      <Clock3 size={20} />

                      <div>
                        <h2>
                          Quy trình xử lý
                        </h2>

                        <p>
                          Nguồn tin không được
                          xuất bản tự động.
                        </p>
                      </div>
                    </div>

                    <ol className="news-tip-process-list">
                      <li>
                        <span>01</span>

                        <div>
                          <strong>
                            Tiếp nhận
                          </strong>

                          <p>
                            Hệ thống ghi nhận
                            thông tin và tài
                            liệu bạn gửi.
                          </p>
                        </div>
                      </li>

                      <li>
                        <span>02</span>

                        <div>
                          <strong>
                            Kiểm tra
                          </strong>

                          <p>
                            Ban biên tập đối
                            chiếu nguồn và xác
                            minh sự việc.
                          </p>
                        </div>
                      </li>

                      <li>
                        <span>03</span>

                        <div>
                          <strong>
                            Biên tập
                          </strong>

                          <p>
                            Nội dung phù hợp
                            được biên tập trước
                            khi xuất bản.
                          </p>
                        </div>
                      </li>
                    </ol>
                  </section>

                  <section className="news-tip-sidebar-card news-tip-security-card">
                    <ShieldCheck
                      size={25}
                    />

                    <small>
                      Bảo vệ nguồn tin
                    </small>

                    <h2>
                      Thông tin liên hệ không
                      tự động công khai
                    </h2>

                    <p>
                      Dữ liệu liên hệ chỉ hỗ
                      trợ quá trình xác minh.
                      Nội dung được xuất bản
                      có thể được biên tập để
                      bảo vệ người cung cấp
                      tin.
                    </p>

                    <div>
                      <span>
                        <ShieldCheck
                          size={16}
                        />
                        Không công khai tự động
                      </span>

                      <span>
                        <Newspaper
                          size={16}
                        />
                        Kiểm duyệt trước khi
                        đăng
                      </span>
                    </div>
                  </section>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </section>
  );
}