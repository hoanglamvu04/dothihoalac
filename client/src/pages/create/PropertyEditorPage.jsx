import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  BadgeCheck,
  Bath,
  BedDouble,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Compass,
  FileText,
  ImagePlus,
  Info,
  LandPlot,
  LoaderCircle,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  Ruler,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import RichTextEditor from '../../components/forms/RichTextEditor';
import MediaUploader from '../../components/forms/MediaUploader';
import TaxonomyFields from '../../components/forms/TaxonomyFields';

import { propertyApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import {
  DIRECTIONS,
  LEGAL_STATUS,
  OWNER_TYPES,
  PRICE_UNITS,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from '../../utils/constants';

import { toNumber } from '../../utils/validators';

import './PropertyEditorPage.css';

const REQUIRED_COMPLETION_FIELDS = [
  'title',
  'summary',
  'bodyHtml',
  'price',
  'landArea',
  'primaryAreaId',
  'addressText',
  'thumbnailMediaId',
  'contactName',
  'contactPhone',
];

function getId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || '';
}

function getMediaId(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || null;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function serializeForm(form) {
  return JSON.stringify({
    ...form,
    thumbnailMediaId:
      getMediaId(form.thumbnailMediaId),
    tagIds: Array.isArray(form.tagIds)
      ? [...form.tagIds].sort()
      : [],
  });
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '';
  }

  return new Intl.NumberFormat(
    'vi-VN',
    {
      maximumFractionDigits: 2,
    },
  ).format(number);
}

function EditorField({
  label,
  required = false,
  hint = '',
  error = '',
  counter = '',
  className = '',
  children,
}) {
  return (
    <div
      className={[
        'property-editor-field',
        error ? 'has-error' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="property-editor-field__heading">
        <label>
          {label}

          {required ? (
            <em>*</em>
          ) : null}
        </label>

        {counter ? (
          <span>{counter}</span>
        ) : null}
      </div>

      {children}

      {error ? (
        <small className="property-editor-field__error">
          {error}
        </small>
      ) : hint ? (
        <small className="property-editor-field__hint">
          {hint}
        </small>
      ) : null}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
  badge = '',
}) {
  return (
    <div className="property-editor-section__heading">
      <span className="property-editor-section__icon">
        <Icon size={21} />
      </span>

      <div>
        <div className="property-editor-section__title-row">
          <h2>{title}</h2>

          {badge ? (
            <span>{badge}</span>
          ) : null}
        </div>

        <p>{description}</p>
      </div>
    </div>
  );
}

export default function PropertyEditorPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [params] = useSearchParams();

  const editingId =
    params.get('edit');

  const source =
    location.state?.item || {};

  const phoneVerified = Boolean(
    user?.phoneVerifiedAt ||
      user?.phoneVerified ||
      user?.isPhoneVerified,
  );

  const initialForm = useMemo(
    () => ({
      title:
        source.title || '',

      summary:
        source.summary ||
        source.excerpt ||
        '',

      bodyHtml:
        source.bodyHtml ||
        source.body?.html ||
        '',

      transactionType:
        source.transactionType ||
        'sale',

      propertyType:
        source.propertyType ||
        'residential_land',

      ownerType:
        source.ownerType ||
        'owner',

      price:
        source.price ?? '',

      priceUnit:
        source.priceUnit ||
        'total',

      isNegotiable:
        Boolean(
          source.isNegotiable,
        ),

      landArea:
        source.landArea ?? '',

      usableArea:
        source.usableArea ?? '',

      bedrooms:
        source.bedrooms ?? '',

      bathrooms:
        source.bathrooms ?? '',

      frontage:
        source.frontage ?? '',

      roadWidth:
        source.roadWidth ?? '',

      direction:
        source.direction ||
        'unknown',

      legalStatus:
        source.legalStatus ||
        'unknown',

      addressText:
        source.addressText ||
        source.address ||
        '',

      contactName:
        source.contactName ||
        user?.displayName ||
        '',

      contactPhone:
        source.contactPhone ||
        user?.phone ||
        '',

      contactEmail:
        source.contactEmail ||
        user?.email ||
        '',

      primaryAreaId:
        getId(
          source.primaryAreaId,
        ),

      tagIds:
        Array.isArray(source.tagIds)
          ? source.tagIds
              .map(getId)
              .filter(Boolean)
          : [],

      thumbnailMediaId:
        source.thumbnailMediaId ||
        source.thumbnail ||
        null,

      latitude:
        source.latitude ?? '',

      longitude:
        source.longitude ?? '',
    }),
    [
      source,
      user?.displayName,
      user?.email,
      user?.phone,
    ],
  );

  const [form, setForm] =
    useState(initialForm);

  const [
    initialSnapshot,
    setInitialSnapshot,
  ] = useState(() =>
    serializeForm(initialForm),
  );

  const [errors, setErrors] =
    useState({});

  const [
    loadingAction,
    setLoadingAction,
  ] = useState('');

  const change = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => ({
      ...current,
      [key]: '',
    }));
  };

  const hasChanges =
    useMemo(
      () =>
        serializeForm(form) !==
        initialSnapshot,
      [form, initialSnapshot],
    );

  useEffect(() => {
    if (!hasChanges) {
      return undefined;
    }

    const handleBeforeUnload = (
      event,
    ) => {
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
  }, [hasChanges]);

  const completion = useMemo(() => {
    const completed =
      REQUIRED_COMPLETION_FIELDS.filter(
        (field) => {
          const value = form[field];

          if (
            field ===
            'thumbnailMediaId'
          ) {
            return Boolean(
              getMediaId(value),
            );
          }

          if (
            field === 'bodyHtml'
          ) {
            return Boolean(
              stripHtml(value),
            );
          }

          return Boolean(
            String(value ?? '').trim(),
          );
        },
      ).length;

    return Math.round(
      (completed /
        REQUIRED_COMPLETION_FIELDS.length) *
        100,
    );
  }, [form]);

  const pricePreview = useMemo(() => {
    if (
      form.isNegotiable &&
      !form.price
    ) {
      return 'Giá thỏa thuận';
    }

    if (!form.price) {
      return 'Chưa nhập giá';
    }

    const unitLabel =
      PRICE_UNITS[
        form.priceUnit
      ] || '';

    return `${formatNumber(
      form.price,
    )} ${unitLabel}`.trim();
  }, [
    form.isNegotiable,
    form.price,
    form.priceUnit,
  ]);

  const propertyLabel =
    PROPERTY_TYPES[
      form.propertyType
    ] || 'Bất động sản';

  const transactionLabel =
    TRANSACTION_TYPES[
      form.transactionType
    ] || 'Đăng tin';

  const validate = (
    submitAfter,
  ) => {
    const nextErrors = {};

    const cleanTitle =
      form.title.trim();

    if (!cleanTitle) {
      nextErrors.title =
        'Vui lòng nhập tiêu đề.';
    } else if (
      submitAfter &&
      cleanTitle.length < 10
    ) {
      nextErrors.title =
        'Tiêu đề cần có ít nhất 10 ký tự để gửi duyệt.';
    } else if (
      cleanTitle.length > 250
    ) {
      nextErrors.title =
        'Tiêu đề không được vượt quá 250 ký tự.';
    }

    if (
      form.summary.length > 1000
    ) {
      nextErrors.summary =
        'Mô tả ngắn không được vượt quá 1.000 ký tự.';
    }

    if (
      submitAfter &&
      !stripHtml(form.bodyHtml)
    ) {
      nextErrors.bodyHtml =
        'Vui lòng nhập mô tả chi tiết.';
    }

    if (
      submitAfter &&
      !form.isNegotiable &&
      (
        form.price === '' ||
        Number(form.price) < 0
      )
    ) {
      nextErrors.price =
        'Vui lòng nhập mức giá hợp lệ.';
    }

    if (
      submitAfter &&
      (
        form.landArea === '' ||
        Number(form.landArea) <= 0
      )
    ) {
      nextErrors.landArea =
        'Diện tích đất phải lớn hơn 0.';
    }

    if (
      submitAfter &&
      !form.primaryAreaId
    ) {
      nextErrors.primaryAreaId =
        'Vui lòng chọn khu vực.';
    }

    if (
      submitAfter &&
      form.addressText.trim().length <
        3
    ) {
      nextErrors.addressText =
        'Vui lòng nhập địa chỉ mô tả.';
    }

    if (
      submitAfter &&
      !getMediaId(
        form.thumbnailMediaId,
      )
    ) {
      nextErrors.thumbnailMediaId =
        'Vui lòng tải ảnh đại diện cho tin đăng.';
    }

    if (
      submitAfter &&
      !form.contactName.trim()
    ) {
      nextErrors.contactName =
        'Vui lòng nhập tên liên hệ.';
    }

    if (
      submitAfter &&
      !form.contactPhone.trim()
    ) {
      nextErrors.contactPhone =
        'Tài khoản chưa có số điện thoại.';
    }

    if (
      form.contactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.contactEmail,
      )
    ) {
      nextErrors.contactEmail =
        'Địa chỉ email không hợp lệ.';
    }

    setErrors(nextErrors);

    const firstError =
      Object.keys(nextErrors)[0];

    if (firstError) {
      window.setTimeout(() => {
        document
          .querySelector(
            `[data-field="${firstError}"]`,
          )
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
      }, 0);
    }

    return (
      Object.keys(nextErrors).length ===
      0
    );
  };

  const buildPayload = () => ({
    ...form,

    title:
      form.title.trim(),

    summary:
      form.summary.trim(),

    addressText:
      form.addressText.trim(),

    contactName:
      form.contactName.trim(),

    contactPhone:
      form.contactPhone.trim(),

    contactEmail:
      form.contactEmail.trim(),

    price:
      form.price === ''
        ? null
        : toNumber(form.price),

    landArea:
      form.landArea === ''
        ? null
        : toNumber(
            form.landArea,
          ),

    usableArea:
      form.usableArea === ''
        ? null
        : toNumber(
            form.usableArea,
          ),

    bedrooms:
      form.bedrooms === ''
        ? null
        : toNumber(
            form.bedrooms,
          ),

    bathrooms:
      form.bathrooms === ''
        ? null
        : toNumber(
            form.bathrooms,
          ),

    frontage:
      form.frontage === ''
        ? null
        : toNumber(
            form.frontage,
          ),

    roadWidth:
      form.roadWidth === ''
        ? null
        : toNumber(
            form.roadWidth,
          ),

    latitude:
      form.latitude === ''
        ? undefined
        : toNumber(
            form.latitude,
          ),

    longitude:
      form.longitude === ''
        ? undefined
        : toNumber(
            form.longitude,
          ),

    primaryAreaId:
      form.primaryAreaId ||
      null,

    thumbnailMediaId:
      getMediaId(
        form.thumbnailMediaId,
      ),

    bodyHtml:
      form.bodyHtml ||
      undefined,
  });

  const save = async (
    submitAfter = false,
  ) => {
    if (
      loadingAction ||
      !validate(submitAfter)
    ) {
      return;
    }

    setLoadingAction(
      submitAfter
        ? 'submit'
        : 'draft',
    );

    try {
      const data =
        buildPayload();

      let content;

      if (editingId) {
        content =
          await propertyApi.update(
            editingId,
            data,
          );
      } else {
        content =
          await propertyApi.create({
            ...data,
            bodyHtml:
              form.bodyHtml ||
              undefined,
          });
      }

      const contentId =
        content?._id ||
        content?.id ||
        editingId;

      if (
        submitAfter &&
        contentId
      ) {
        await propertyApi.submit(
          contentId,
        );
      }

      setInitialSnapshot(
        serializeForm(form),
      );

      toast.success(
        submitAfter
          ? 'Đã lưu và gửi tin đi duyệt.'
          : 'Đã lưu tin nháp.',
      );

      navigate(
        '/tai-khoan/tin-nha-dat',
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error),
      );
    } finally {
      setLoadingAction('');
    }
  };

  if (!phoneVerified) {
    return (
      <main className="property-verification-page">
        <Seo title="Xác thực số điện thoại" />

        <section className="property-verification-card">
          <span className="property-verification-card__icon">
            <Phone size={31} />
          </span>

          <span className="property-verification-card__eyebrow">
            Điều kiện đăng tin
          </span>

          <h1>
            Xác thực số điện thoại
          </h1>

          <p>
            Tin bất động sản chỉ được đăng
            bằng số điện thoại đã xác thực
            để hạn chế tin rác và bảo vệ
            người dùng.
          </p>

          <div className="property-verification-card__note">
            <ShieldCheck size={19} />

            <span>
              Số điện thoại xác thực sẽ
              được sử dụng làm thông tin
              liên hệ chính trên tin đăng.
            </span>
          </div>

          <div className="property-verification-card__actions">
            <Link
              className="property-editor-button property-editor-button--secondary"
              to="/tai-khoan/tin-nha-dat"
            >
              <ArrowLeft size={17} />
              Quay lại
            </Link>

            <Link
              className="property-editor-button property-editor-button--primary"
              to="/xac-thuc-so-dien-thoai"
            >
              <BadgeCheck size={17} />
              Xác thực số điện thoại
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="property-editor-page">
      <Seo
        title={
          editingId
            ? 'Chỉnh sửa tin nhà đất'
            : 'Đăng tin bất động sản'
        }
      />

      <div className="property-editor-container">
        <header className="property-editor-hero">
          <div>
            <Link
              className="property-editor-back"
              to="/tai-khoan/tin-nha-dat"
            >
              <ArrowLeft size={17} />
              Tin bất động sản của tôi
            </Link>

            <span className="property-editor-eyebrow">
              <Building2 size={16} />
              Trung tâm đăng tin
            </span>

            <h1>
              {editingId
                ? 'Chỉnh sửa tin nhà đất'
                : 'Đăng tin nhà đất'}
            </h1>

            <p>
              Cung cấp thông tin chính xác,
              hình ảnh rõ ràng và mô tả đầy
              đủ để tin đăng dễ tiếp cận
              người quan tâm.
            </p>
          </div>

          <div className="property-editor-hero__status">
            <span>
              {editingId
                ? 'Đang chỉnh sửa'
                : 'Tin mới'}
            </span>

            <strong>
              {completion}%
            </strong>

            <small>
              Mức độ hoàn thiện
            </small>
          </div>
        </header>

        {editingId &&
        !source.bodyHtml ? (
          <div className="property-editor-warning">
            <Info size={19} />

            <div>
              <strong>
                Chưa tải được nội dung chi
                tiết cũ
              </strong>

              <p>
                Server hiện chưa cung cấp
                API lấy nội dung HTML của
                bản nháp. Những trường khác
                vẫn có thể chỉnh sửa bình
                thường.
              </p>
            </div>
          </div>
        ) : null}

        <div className="property-editor-layout">
          <form
            className="property-editor-main"
            onSubmit={(event) => {
              event.preventDefault();
              save(true);
            }}
            noValidate
          >
            <section className="property-editor-section">
              <SectionHeading
                icon={FileText}
                title="Thông tin cơ bản"
                description="Xác định loại tin và nội dung chính mà người xem nhìn thấy."
                badge="Bước 1"
              />

              <div className="property-editor-grid property-editor-grid--3">
                <EditorField
                  label="Nhu cầu"
                  required
                >
                  <div className="property-editor-input">
                    <WalletCards size={18} />

                    <select
                      value={
                        form.transactionType
                      }
                      onChange={(event) =>
                        change(
                          'transactionType',
                          event.target.value,
                        )
                      }
                    >
                      {Object.entries(
                        TRANSACTION_TYPES,
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
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
                </EditorField>

                <EditorField
                  label="Loại bất động sản"
                  required
                >
                  <div className="property-editor-input">
                    <Building2 size={18} />

                    <select
                      value={
                        form.propertyType
                      }
                      onChange={(event) =>
                        change(
                          'propertyType',
                          event.target.value,
                        )
                      }
                    >
                      {Object.entries(
                        PROPERTY_TYPES,
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
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
                </EditorField>

                <EditorField
                  label="Người đăng"
                  required
                >
                  <div className="property-editor-input">
                    <UserRound size={18} />

                    <select
                      value={
                        form.ownerType
                      }
                      onChange={(event) =>
                        change(
                          'ownerType',
                          event.target.value,
                        )
                      }
                    >
                      {Object.entries(
                        OWNER_TYPES,
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
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
                </EditorField>
              </div>

              <div data-field="title">
                <EditorField
                  label="Tiêu đề tin"
                  required
                  error={errors.title}
                  counter={`${form.title.length}/250`}
                  hint="Nêu rõ loại bất động sản, khu vực và đặc điểm nổi bật."
                >
                  <div className="property-editor-input">
                    <FileText size={18} />

                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) =>
                        change(
                          'title',
                          event.target.value,
                        )
                      }
                      placeholder="Ví dụ: Bán lô đất 120 m² tại Yên Bình, đường ô tô vào tận nơi"
                      maxLength={250}
                      disabled={Boolean(
                        loadingAction,
                      )}
                    />
                  </div>
                </EditorField>
              </div>

              <EditorField
                label="Mô tả ngắn"
                counter={`${form.summary.length}/1000`}
                error={errors.summary}
                hint="Tóm tắt ưu điểm chính trong 2–4 câu."
              >
                <textarea
                  className="property-editor-textarea"
                  rows={4}
                  value={form.summary}
                  onChange={(event) =>
                    change(
                      'summary',
                      event.target.value,
                    )
                  }
                  placeholder="Mô tả ngắn về vị trí, diện tích, pháp lý và điểm nổi bật..."
                  maxLength={1000}
                  disabled={Boolean(
                    loadingAction,
                  )}
                />
              </EditorField>

              <div data-field="bodyHtml">
                <EditorField
                  label="Mô tả chi tiết"
                  required={!editingId}
                  error={errors.bodyHtml}
                  hint="Trình bày đầy đủ hiện trạng, tiện ích, đường đi, quy hoạch và điều kiện giao dịch."
                >
                  <div className="property-editor-richtext">
                    <RichTextEditor
                      value={
                        form.bodyHtml
                      }
                      onChange={(value) =>
                        change(
                          'bodyHtml',
                          value,
                        )
                      }
                    />
                  </div>
                </EditorField>
              </div>
            </section>

            <section className="property-editor-section">
              <SectionHeading
                icon={WalletCards}
                title="Giá và diện tích"
                description="Thông tin giá rõ ràng giúp tin đăng nhận được nhiều liên hệ phù hợp hơn."
                badge="Bước 2"
              />

              <div className="property-editor-grid property-editor-grid--3">
                <div data-field="price">
                  <EditorField
                    label="Giá"
                    required={
                      !form.isNegotiable
                    }
                    error={errors.price}
                  >
                    <div className="property-editor-input">
                      <WalletCards
                        size={18}
                      />

                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={form.price}
                        onChange={(event) =>
                          change(
                            'price',
                            event.target.value,
                          )
                        }
                        placeholder="Nhập giá"
                        disabled={
                          Boolean(
                            loadingAction,
                          ) ||
                          form.isNegotiable
                        }
                      />
                    </div>
                  </EditorField>
                </div>

                <EditorField label="Đơn vị giá">
                  <div className="property-editor-input">
                    <WalletCards
                      size={18}
                    />

                    <select
                      value={
                        form.priceUnit
                      }
                      onChange={(event) =>
                        change(
                          'priceUnit',
                          event.target.value,
                        )
                      }
                      disabled={
                        Boolean(
                          loadingAction,
                        ) ||
                        form.isNegotiable
                      }
                    >
                      {Object.entries(
                        PRICE_UNITS,
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
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
                </EditorField>

                <div data-field="landArea">
                  <EditorField
                    label="Diện tích đất"
                    required
                    error={
                      errors.landArea
                    }
                  >
                    <div className="property-editor-input property-editor-input--suffix">
                      <LandPlot size={18} />

                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={
                          form.landArea
                        }
                        onChange={(event) =>
                          change(
                            'landArea',
                            event.target.value,
                          )
                        }
                        placeholder="0"
                      />

                      <span>m²</span>
                    </div>
                  </EditorField>
                </div>
              </div>

              <label className="property-editor-toggle-card">
                <span className="property-editor-toggle-card__icon">
                  <Sparkles size={20} />
                </span>

                <span className="property-editor-toggle-card__content">
                  <strong>
                    Giá có thể thỏa thuận
                  </strong>

                  <small>
                    Người mua sẽ liên hệ
                    trực tiếp để trao đổi
                    mức giá phù hợp.
                  </small>
                </span>

                <input
                  type="checkbox"
                  checked={
                    form.isNegotiable
                  }
                  onChange={(event) =>
                    change(
                      'isNegotiable',
                      event.target.checked,
                    )
                  }
                />

                <span className="property-editor-switch">
                  <span />
                </span>
              </label>

              <div className="property-editor-grid property-editor-grid--3 property-editor-grid--specs">
                <EditorField label="Diện tích sử dụng">
                  <div className="property-editor-input property-editor-input--suffix">
                    <Maximize2 size={18} />

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        form.usableArea
                      }
                      onChange={(event) =>
                        change(
                          'usableArea',
                          event.target.value,
                        )
                      }
                      placeholder="0"
                    />

                    <span>m²</span>
                  </div>
                </EditorField>

                <EditorField label="Phòng ngủ">
                  <div className="property-editor-input">
                    <BedDouble size={18} />

                    <input
                      type="number"
                      min="0"
                      value={
                        form.bedrooms
                      }
                      onChange={(event) =>
                        change(
                          'bedrooms',
                          event.target.value,
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </EditorField>

                <EditorField label="Phòng tắm">
                  <div className="property-editor-input">
                    <Bath size={18} />

                    <input
                      type="number"
                      min="0"
                      value={
                        form.bathrooms
                      }
                      onChange={(event) =>
                        change(
                          'bathrooms',
                          event.target.value,
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </EditorField>

                <EditorField label="Mặt tiền">
                  <div className="property-editor-input property-editor-input--suffix">
                    <Ruler size={18} />

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        form.frontage
                      }
                      onChange={(event) =>
                        change(
                          'frontage',
                          event.target.value,
                        )
                      }
                      placeholder="0"
                    />

                    <span>m</span>
                  </div>
                </EditorField>

                <EditorField label="Đường vào">
                  <div className="property-editor-input property-editor-input--suffix">
                    <Ruler size={18} />

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        form.roadWidth
                      }
                      onChange={(event) =>
                        change(
                          'roadWidth',
                          event.target.value,
                        )
                      }
                      placeholder="0"
                    />

                    <span>m</span>
                  </div>
                </EditorField>

                <EditorField label="Hướng">
                  <div className="property-editor-input">
                    <Compass size={18} />

                    <select
                      value={
                        form.direction
                      }
                      onChange={(event) =>
                        change(
                          'direction',
                          event.target.value,
                        )
                      }
                    >
                      {Object.entries(
                        DIRECTIONS,
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
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
                </EditorField>

                <EditorField label="Tình trạng pháp lý">
                  <div className="property-editor-input">
                    <ShieldCheck size={18} />

                    <select
                      value={
                        form.legalStatus
                      }
                      onChange={(event) =>
                        change(
                          'legalStatus',
                          event.target.value,
                        )
                      }
                    >
                      {Object.entries(
                        LEGAL_STATUS,
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
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
                </EditorField>
              </div>
            </section>

            <section className="property-editor-section">
              <SectionHeading
                icon={MapPin}
                title="Vị trí bất động sản"
                description="Chọn đúng khu vực và mô tả vị trí đủ rõ để người xem dễ hình dung."
                badge="Bước 3"
              />

              <div
                data-field="primaryAreaId"
                className={
                  errors.primaryAreaId
                    ? 'property-editor-taxonomy has-error'
                    : 'property-editor-taxonomy'
                }
              >
                <TaxonomyFields
                  scope="property"
                  categoryId={null}
                  areaId={
                    form.primaryAreaId
                  }
                  tagIds={form.tagIds}
                  onChange={change}
                  areaRequired
                />

                {errors.primaryAreaId ? (
                  <small className="property-editor-field__error">
                    {
                      errors.primaryAreaId
                    }
                  </small>
                ) : null}
              </div>

              <div data-field="addressText">
                <EditorField
                  label="Địa chỉ mô tả"
                  required
                  error={
                    errors.addressText
                  }
                  hint="Không nên công khai số nhà nếu bạn muốn bảo vệ vị trí chính xác."
                >
                  <div className="property-editor-input">
                    <MapPin size={18} />

                    <input
                      type="text"
                      value={
                        form.addressText
                      }
                      onChange={(event) =>
                        change(
                          'addressText',
                          event.target.value,
                        )
                      }
                      placeholder="Ví dụ: Gần Đại học Quốc gia Hà Nội, xã Thạch Hòa"
                      maxLength={500}
                    />
                  </div>
                </EditorField>
              </div>

              <details className="property-editor-coordinates">
                <summary>
                  <MapPin size={17} />
                  Thêm tọa độ bản đồ
                </summary>

                <div className="property-editor-grid property-editor-grid--2">
                  <EditorField
                    label="Vĩ độ"
                    hint="Ví dụ: 21.012345"
                  >
                    <div className="property-editor-input">
                      <MapPin size={18} />

                      <input
                        type="number"
                        step="any"
                        value={
                          form.latitude
                        }
                        onChange={(event) =>
                          change(
                            'latitude',
                            event.target.value,
                          )
                        }
                        placeholder="21.000000"
                      />
                    </div>
                  </EditorField>

                  <EditorField
                    label="Kinh độ"
                    hint="Ví dụ: 105.512345"
                  >
                    <div className="property-editor-input">
                      <MapPin size={18} />

                      <input
                        type="number"
                        step="any"
                        value={
                          form.longitude
                        }
                        onChange={(event) =>
                          change(
                            'longitude',
                            event.target.value,
                          )
                        }
                        placeholder="105.500000"
                      />
                    </div>
                  </EditorField>
                </div>
              </details>
            </section>

            <section className="property-editor-section">
              <SectionHeading
                icon={ImagePlus}
                title="Hình ảnh tin đăng"
                description="Ảnh rõ nét và đúng thực tế giúp tăng độ tin cậy của tin đăng."
                badge="Bước 4"
              />

              <div
                data-field="thumbnailMediaId"
                className={[
                  'property-editor-media',
                  errors.thumbnailMediaId
                    ? 'has-error'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <MediaUploader
                  label="Ảnh đại diện tin đăng"
                  value={
                    form.thumbnailMediaId
                  }
                  onChange={(value) =>
                    change(
                      'thumbnailMediaId',
                      value,
                    )
                  }
                  required
                />

                {errors.thumbnailMediaId ? (
                  <small className="property-editor-field__error">
                    {
                      errors.thumbnailMediaId
                    }
                  </small>
                ) : (
                  <div className="property-editor-media__note">
                    <Info size={16} />

                    <span>
                      Nên dùng ảnh ngang,
                      rõ nét, không chứa số
                      điện thoại hoặc nội
                      dung quảng cáo quá
                      lớn.
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section className="property-editor-section">
              <SectionHeading
                icon={UserRound}
                title="Thông tin liên hệ"
                description="Thông tin này được sử dụng để người quan tâm liên hệ về tin đăng."
                badge="Bước 5"
              />

              <div className="property-editor-grid property-editor-grid--2">
                <div data-field="contactName">
                  <EditorField
                    label="Tên liên hệ"
                    required
                    error={
                      errors.contactName
                    }
                  >
                    <div className="property-editor-input">
                      <UserRound
                        size={18}
                      />

                      <input
                        type="text"
                        value={
                          form.contactName
                        }
                        onChange={(event) =>
                          change(
                            'contactName',
                            event.target.value,
                          )
                        }
                        placeholder="Tên người liên hệ"
                        maxLength={120}
                      />
                    </div>
                  </EditorField>
                </div>

                <div data-field="contactPhone">
                  <EditorField
                    label="Số điện thoại"
                    required
                    error={
                      errors.contactPhone
                    }
                    hint="Số điện thoại đã được xác thực với tài khoản."
                  >
                    <div className="property-editor-input property-editor-input--readonly">
                      <Phone size={18} />

                      <input
                        type="text"
                        value={
                          form.contactPhone
                        }
                        readOnly
                      />

                      <BadgeCheck
                        size={18}
                      />
                    </div>
                  </EditorField>
                </div>

                <div data-field="contactEmail">
                  <EditorField
                    label="Email"
                    error={
                      errors.contactEmail
                    }
                    hint="Email không bắt buộc phải hiển thị công khai."
                  >
                    <div className="property-editor-input">
                      <Mail size={18} />

                      <input
                        type="email"
                        value={
                          form.contactEmail
                        }
                        onChange={(event) =>
                          change(
                            'contactEmail',
                            event.target.value,
                          )
                        }
                        placeholder="email@example.com"
                      />
                    </div>
                  </EditorField>
                </div>
              </div>

              <div className="property-editor-verified-note">
                <ShieldCheck size={19} />

                <div>
                  <strong>
                    Thông tin đã xác thực
                  </strong>

                  <p>
                    Muốn thay đổi số điện
                    thoại đã xác thực, vui
                    lòng liên hệ quản trị
                    viên.
                  </p>
                </div>
              </div>
            </section>

            <div className="property-editor-mobile-actions">
              <button
                type="button"
                className="property-editor-button property-editor-button--secondary"
                disabled={Boolean(
                  loadingAction,
                )}
                onClick={() =>
                  save(false)
                }
              >
                {loadingAction ===
                'draft' ? (
                  <>
                    <LoaderCircle
                      className="is-spinning"
                      size={18}
                    />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Lưu nháp
                  </>
                )}
              </button>

              <button
                type="submit"
                className="property-editor-button property-editor-button--primary"
                disabled={Boolean(
                  loadingAction,
                )}
              >
                {loadingAction ===
                'submit' ? (
                  <>
                    <LoaderCircle
                      className="is-spinning"
                      size={18}
                    />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Lưu và gửi duyệt
                  </>
                )}
              </button>
            </div>
          </form>

          <aside className="property-editor-sidebar">
            <section className="property-editor-summary-card">
              <div className="property-editor-summary-card__header">
                <span>
                  <CheckCircle2
                    size={20}
                  />
                </span>

                <div>
                  <strong>
                    Độ hoàn thiện
                  </strong>

                  <small>
                    {completion}% thông tin
                    quan trọng
                  </small>
                </div>
              </div>

              <div className="property-editor-progress">
                <span
                  style={{
                    width: `${completion}%`,
                  }}
                />
              </div>

              <p>
                {completion >= 90
                  ? 'Tin đăng đã khá đầy đủ và sẵn sàng để gửi kiểm duyệt.'
                  : 'Hãy bổ sung các trường còn thiếu trước khi gửi kiểm duyệt.'}
              </p>
            </section>

            <section className="property-editor-preview-card">
              <span className="property-editor-preview-card__label">
                Xem trước thông tin
              </span>

              <h3>
                {form.title.trim() ||
                  `${transactionLabel} ${propertyLabel}`}
              </h3>

              <div className="property-editor-preview-card__price">
                {pricePreview}
              </div>

              <div className="property-editor-preview-card__meta">
                <span>
                  <LandPlot size={15} />

                  {form.landArea
                    ? `${formatNumber(
                        form.landArea,
                      )} m²`
                    : 'Chưa nhập diện tích'}
                </span>

                <span>
                  <MapPin size={15} />

                  {form.addressText ||
                    'Chưa nhập vị trí'}
                </span>

                <span>
                  <BriefcaseBusiness
                    size={15}
                  />

                  {OWNER_TYPES[
                    form.ownerType
                  ] || 'Người đăng'}
                </span>
              </div>
            </section>

            <section className="property-editor-tip-card">
              <span>
                <Sparkles size={19} />
              </span>

              <div>
                <strong>
                  Mẹo đăng tin hiệu quả
                </strong>

                <ul>
                  <li>
                    Tiêu đề nên có loại BĐS,
                    diện tích và khu vực.
                  </li>

                  <li>
                    Không đăng ảnh sai thực
                    tế hoặc ảnh có watermark
                    lớn.
                  </li>

                  <li>
                    Mô tả rõ pháp lý, đường
                    vào và tình trạng quy
                    hoạch.
                  </li>
                </ul>
              </div>
            </section>

            <section className="property-editor-action-card">
              <div className="property-editor-action-card__status">
                {hasChanges ? (
                  <>
                    <Info size={17} />

                    <span>
                      Có thay đổi chưa lưu
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={17}
                    />

                    <span>
                      Chưa có thay đổi mới
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                className="property-editor-button property-editor-button--secondary"
                disabled={Boolean(
                  loadingAction,
                )}
                onClick={() =>
                  save(false)
                }
              >
                {loadingAction ===
                'draft' ? (
                  <>
                    <LoaderCircle
                      className="is-spinning"
                      size={18}
                    />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Lưu bản nháp
                  </>
                )}
              </button>

              <button
                type="button"
                className="property-editor-button property-editor-button--primary"
                disabled={Boolean(
                  loadingAction,
                )}
                onClick={() =>
                  save(true)
                }
              >
                {loadingAction ===
                'submit' ? (
                  <>
                    <LoaderCircle
                      className="is-spinning"
                      size={18}
                    />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Lưu và gửi duyệt
                  </>
                )}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}