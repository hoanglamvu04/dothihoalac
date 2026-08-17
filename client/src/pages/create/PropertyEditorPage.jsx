import { useEffect, useMemo, useState } from 'react';

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
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Eye,
  FileText,
  Home,
  ImagePlus,
  Info,
  KeyRound,
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
  Star,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import RichTextEditor from '../../components/forms/RichTextEditor';
import PropertyGalleryUploader from '../../components/forms/PropertyGalleryUploader';
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

import { mediaUrl } from '../../utils/media';
import { toNumber } from '../../utils/validators';

import './PropertyEditorPage.css';

const STEPS = [
  {
    id: 1,
    label: 'Thông tin BĐS',
    shortLabel: 'Thông tin',
    icon: Home,
  },
  {
    id: 2,
    label: 'Hình ảnh',
    shortLabel: 'Hình ảnh',
    icon: ImagePlus,
  },
  {
    id: 3,
    label: 'Hạng tin & xuất bản',
    shortLabel: 'Xuất bản',
    icon: Star,
  },
];

const LISTING_TIERS = [
  {
    id: 'diamond',
    label: 'VIP Kim Cương',
    referencePrice: 310500,
    multiplier: 'x30',
    description: 'Ưu tiên hiển thị cao nhất',
  },
  {
    id: 'gold',
    label: 'VIP Vàng',
    referencePrice: 122400,
    multiplier: 'x15',
    description: 'Ưu tiên sau VIP Kim Cương',
  },
  {
    id: 'silver',
    label: 'VIP Bạc',
    referencePrice: 56600,
    multiplier: 'x8',
    description: 'Tăng khả năng tiếp cận',
  },
  {
    id: 'standard',
    label: 'Tin Thường',
    referencePrice: 2800,
    multiplier: '',
    description: 'Hiển thị tiêu chuẩn',
  },
];

const DURATION_OPTIONS = [15, 30, 60];

const REQUIRED_COMPLETION_FIELDS = [
  'title',
  'bodyHtml',
  'price',
  'landArea',
  'primaryAreaId',
  'addressText',
  'thumbnailMediaId',
  'contactName',
  'contactPhone',
];

const TRANSACTION_ICONS = {
  sale: WalletCards,
  rent: KeyRound,
  transfer: BriefcaseBusiness,
  wanted_buy: Home,
  wanted_rent: KeyRound,
};

function getId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
}

function getMediaId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value._id || value.id || null;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatMoney(value) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} đ`;
}

function formatDateInput(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeGallery(source, thumbnail) {
  const raw = Array.isArray(source) ? source.filter(Boolean) : [];
  const usable = raw.filter((item) => {
    if (typeof item !== 'string') return true;
    return /^(https?:\/\/|\/|data:|blob:)/i.test(item);
  });

  if (usable.length) return usable;
  return thumbnail ? [thumbnail] : [];
}

function serializeForm(form) {
  return JSON.stringify({
    ...form,
    thumbnailMediaId: getMediaId(form.thumbnailMediaId),
    galleryMediaIds: Array.isArray(form.galleryMediaIds)
      ? form.galleryMediaIds.map(getMediaId).filter(Boolean)
      : [],
    tagIds: Array.isArray(form.tagIds) ? [...form.tagIds].sort() : [],
  });
}

function EditorField({
  label,
  required = false,
  hint = '',
  error = '',
  counter = '',
  children,
}) {
  return (
    <div className={error ? 'property-post-field has-error' : 'property-post-field'}>
      <div className="property-post-field__heading">
        <label>
          {label}
          {required ? <em>*</em> : null}
        </label>
        {counter ? <span>{counter}</span> : null}
      </div>

      {children}

      {error ? (
        <small className="property-post-field__error">{error}</small>
      ) : hint ? (
        <small className="property-post-field__hint">{hint}</small>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  description = '',
  icon: Icon,
  children,
  className = '',
}) {
  return (
    <section
      className={['property-post-card', className].filter(Boolean).join(' ')}
    >
      <header className="property-post-card__header">
        <span className="property-post-card__icon">
          <Icon size={20} />
        </span>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function StepperField({ label, value, onChange, icon: Icon }) {
  const number = Number(value || 0);

  return (
    <div className="property-post-stepper-field">
      <span>
        {Icon ? <Icon size={18} /> : null}
        {label}
      </span>

      <div>
        <button
          type="button"
          aria-label={`Giảm ${label}`}
          onClick={() => onChange(Math.max(0, number - 1) || '')}
          disabled={number <= 0}
        >
          −
        </button>
        <strong>{number}</strong>
        <button
          type="button"
          aria-label={`Tăng ${label}`}
          onClick={() => onChange(number + 1)}
        >
          +
        </button>
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

  const editingId = params.get('edit');
  const source = location.state?.item || {};
  const propertySource = source.property || source;

  const phoneVerified = Boolean(
    user?.phoneVerifiedAt || user?.phoneVerified || user?.isPhoneVerified,
  );

  const initialForm = useMemo(() => {
    const thumbnail = source.thumbnailMediaId || source.thumbnail || null;
    const gallery = normalizeGallery(
      propertySource.galleryMediaIds || source.galleryMediaIds,
      thumbnail,
    );

    return {
      title: source.title || '',
      summary: source.summary || source.excerpt || '',
      bodyHtml: source.bodyHtml || source.body?.html || '',
      transactionType: propertySource.transactionType || 'sale',
      propertyType: propertySource.propertyType || 'residential_land',
      ownerType: propertySource.ownerType || 'owner',
      price: propertySource.price ?? '',
      priceUnit: propertySource.priceUnit || 'total',
      isNegotiable: Boolean(propertySource.isNegotiable),
      landArea: propertySource.landArea ?? '',
      usableArea: propertySource.usableArea ?? '',
      bedrooms: propertySource.bedrooms ?? '',
      bathrooms: propertySource.bathrooms ?? '',
      frontage: propertySource.frontage ?? '',
      roadWidth: propertySource.roadWidth ?? '',
      direction: propertySource.direction || 'unknown',
      legalStatus: propertySource.legalStatus || 'unknown',
      addressText: propertySource.addressText || source.address || '',
      contactName: propertySource.contactName || user?.displayName || '',
      contactPhone: propertySource.contactPhone || user?.phone || '',
      contactEmail: propertySource.contactEmail || user?.email || '',
      primaryAreaId: getId(source.primaryAreaId || propertySource.primaryAreaId),
      tagIds: Array.isArray(source.tagIds)
        ? source.tagIds.map(getId).filter(Boolean)
        : [],
      thumbnailMediaId: gallery[0] || thumbnail,
      galleryMediaIds: gallery,
      latitude:
        propertySource.latitude ??
        propertySource.location?.coordinates?.[1] ??
        '',
      longitude:
        propertySource.longitude ??
        propertySource.location?.coordinates?.[0] ??
        '',
      listingTier: propertySource.listingTier || 'standard',
      listingDurationDays: Number(propertySource.listingDurationDays) || 15,
      listingStartAt: formatDateInput(propertySource.listingStartAt || new Date()),
    };
  }, [
    propertySource,
    source,
    user?.displayName,
    user?.email,
    user?.phone,
  ]);

  const [form, setForm] = useState(initialForm);
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    serializeForm(initialForm),
  );
  const [errors, setErrors] = useState({});
  const [loadingAction, setLoadingAction] = useState('');
  const [step, setStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);

  const change = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const changeGallery = (next) => {
    const gallery = Array.isArray(next) ? next : [];
    setForm((current) => ({
      ...current,
      galleryMediaIds: gallery,
      thumbnailMediaId: gallery[0] || null,
    }));
    setErrors((current) => ({ ...current, thumbnailMediaId: '' }));
  };

  const hasChanges = useMemo(
    () => serializeForm(form) !== initialSnapshot,
    [form, initialSnapshot],
  );

  useEffect(() => {
    if (!hasChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    if (!previewOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const close = (event) => {
      if (event.key === 'Escape') setPreviewOpen(false);
    };

    document.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', close);
    };
  }, [previewOpen]);

  const completion = useMemo(() => {
    const completed = REQUIRED_COMPLETION_FIELDS.filter((field) => {
      const value = form[field];
      if (field === 'thumbnailMediaId') return Boolean(getMediaId(value));
      if (field === 'bodyHtml') return Boolean(stripHtml(value));
      if (field === 'price' && form.isNegotiable) return true;
      return Boolean(String(value ?? '').trim());
    }).length;

    return Math.round((completed / REQUIRED_COMPLETION_FIELDS.length) * 100);
  }, [form]);

  const selectedTier =
    LISTING_TIERS.find((item) => item.id === form.listingTier) ||
    LISTING_TIERS[LISTING_TIERS.length - 1];

  const referenceTotal =
    selectedTier.referencePrice * Number(form.listingDurationDays || 15);

  const pricePreview = useMemo(() => {
    if (form.isNegotiable && !form.price) return 'Giá thỏa thuận';
    if (!form.price) return 'Chưa nhập giá';

    const unitLabel = PRICE_UNITS[form.priceUnit] || '';
    return `${formatNumber(form.price)} ${unitLabel}`.trim();
  }, [form.isNegotiable, form.price, form.priceUnit]);

  const propertyLabel = PROPERTY_TYPES[form.propertyType] || 'Bất động sản';
  const transactionLabel = TRANSACTION_TYPES[form.transactionType] || 'Đăng tin';
  const previewImage = mediaUrl(form.thumbnailMediaId);

  const scrollToError = (nextErrors) => {
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];

    if (!firstError) return true;

    window.setTimeout(() => {
      document
        .querySelector(`[data-field="${firstError}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);

    return false;
  };

  const validateInformation = () => {
    const nextErrors = {};
    const cleanTitle = form.title.trim();

    if (!cleanTitle) nextErrors.title = 'Vui lòng nhập tiêu đề.';
    else if (cleanTitle.length < 10) {
      nextErrors.title = 'Tiêu đề cần có ít nhất 10 ký tự.';
    } else if (cleanTitle.length > 250) {
      nextErrors.title = 'Tiêu đề không được vượt quá 250 ký tự.';
    }

    if (form.summary.length > 1000) {
      nextErrors.summary = 'Mô tả ngắn không được vượt quá 1.000 ký tự.';
    }

    if (!stripHtml(form.bodyHtml)) {
      nextErrors.bodyHtml = 'Vui lòng nhập mô tả chi tiết.';
    }

    if (!form.isNegotiable && (form.price === '' || Number(form.price) <= 0)) {
      nextErrors.price = 'Vui lòng nhập mức giá lớn hơn 0.';
    }

    if (form.landArea === '' || Number(form.landArea) <= 0) {
      nextErrors.landArea = 'Diện tích phải lớn hơn 0.';
    }

    if (!form.primaryAreaId) nextErrors.primaryAreaId = 'Vui lòng chọn khu vực.';

    if (form.addressText.trim().length < 3) {
      nextErrors.addressText = 'Vui lòng nhập địa chỉ mô tả.';
    }

    if (!form.contactName.trim()) {
      nextErrors.contactName = 'Vui lòng nhập tên liên hệ.';
    }

    if (!form.contactPhone.trim()) {
      nextErrors.contactPhone = 'Tài khoản chưa có số điện thoại.';
    }

    if (
      form.contactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)
    ) {
      nextErrors.contactEmail = 'Địa chỉ email không hợp lệ.';
    }

    return scrollToError(nextErrors);
  };

  const validateMedia = () => {
    if (getMediaId(form.thumbnailMediaId)) {
      setErrors((current) => ({ ...current, thumbnailMediaId: '' }));
      return true;
    }

    return scrollToError({
      thumbnailMediaId: 'Vui lòng tải ít nhất một ảnh cho tin đăng.',
    });
  };

  const validateAll = () => {
    if (!validateInformation()) {
      setStep(1);
      return false;
    }

    if (!getMediaId(form.thumbnailMediaId)) {
      setErrors((current) => ({
        ...current,
        thumbnailMediaId: 'Vui lòng tải ít nhất một ảnh cho tin đăng.',
      }));
      setStep(2);
      window.setTimeout(() => {
        document
          .querySelector('[data-field="thumbnailMediaId"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    summary: form.summary.trim(),
    bodyHtml: form.bodyHtml,
    transactionType: form.transactionType,
    propertyType: form.propertyType,
    ownerType: form.ownerType,
    price: form.price === '' ? 0 : toNumber(form.price),
    priceUnit: form.isNegotiable ? 'negotiable' : form.priceUnit,
    isNegotiable: form.isNegotiable,
    landArea: toNumber(form.landArea),
    usableArea: form.usableArea === '' ? null : toNumber(form.usableArea),
    bedrooms: form.bedrooms === '' ? null : toNumber(form.bedrooms),
    bathrooms: form.bathrooms === '' ? null : toNumber(form.bathrooms),
    frontage: form.frontage === '' ? null : toNumber(form.frontage),
    roadWidth: form.roadWidth === '' ? null : toNumber(form.roadWidth),
    direction: form.direction,
    legalStatus: form.legalStatus,
    addressText: form.addressText.trim(),
    contactName: form.contactName.trim(),
    contactPhone: form.contactPhone.trim(),
    contactEmail: form.contactEmail.trim(),
    primaryAreaId: form.primaryAreaId,
    tagIds: form.tagIds,
    thumbnailMediaId: getMediaId(form.thumbnailMediaId),
    galleryMediaIds: form.galleryMediaIds.map(getMediaId).filter(Boolean),
    latitude: form.latitude === '' ? undefined : toNumber(form.latitude),
    longitude: form.longitude === '' ? undefined : toNumber(form.longitude),
    listingTier: form.listingTier,
    listingDurationDays: Number(form.listingDurationDays),
    listingStartAt: form.listingStartAt || undefined,
  });

  const save = async (submitAfter = false) => {
    if (loadingAction || !validateAll()) return;

    setLoadingAction(submitAfter ? 'submit' : 'draft');

    try {
      const data = buildPayload();
      const content = editingId
        ? await propertyApi.update(editingId, data)
        : await propertyApi.create(data);

      const contentId = content?._id || content?.id || editingId;

      if (submitAfter && contentId) {
        await propertyApi.submit(contentId);
      }

      setInitialSnapshot(serializeForm(form));
      toast.success(
        submitAfter
          ? 'Đã lưu và gửi tin đi duyệt. Phí đăng tin hiện tại: 0đ.'
          : 'Đã lưu tin nháp.',
      );
      navigate('/tai-khoan/tin-nha-dat');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoadingAction('');
    }
  };

  const goNext = () => {
    if (step === 1 && !validateInformation()) return;
    if (step === 2 && !validateMedia()) return;

    const next = Math.min(3, step + 1);
    setStep(next);
    setFurthestStep((current) => Math.max(current, next));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep((current) => Math.max(1, current - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToStep = (target) => {
    if (target < step || target <= furthestStep) {
      setStep(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 1 && validateInformation()) {
      setStep(2);
      setFurthestStep((current) => Math.max(current, 2));
    } else if (step === 2 && validateMedia()) {
      setStep(3);
      setFurthestStep(3);
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
          <h1>Xác thực số điện thoại</h1>
          <p>
            Tin bất động sản chỉ được đăng bằng số điện thoại đã xác thực để
            hạn chế tin rác và bảo vệ người dùng.
          </p>

          <div className="property-verification-card__note">
            <ShieldCheck size={19} />
            <span>
              Số điện thoại xác thực sẽ được sử dụng làm thông tin liên hệ
              chính trên tin đăng.
            </span>
          </div>

          <div className="property-verification-card__actions">
            <Link
              className="property-post-button property-post-button--ghost"
              to="/tai-khoan/tin-nha-dat"
            >
              <ArrowLeft size={17} />
              Quay lại
            </Link>
            <Link
              className="property-post-button property-post-button--primary"
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
        title={editingId ? 'Chỉnh sửa tin bất động sản' : 'Tạo tin bất động sản'}
      />

      <div className="property-post-shell">
        <header className="property-post-topbar">
          <div>
            <span className="property-post-topbar__eyebrow">
              <Building2 size={16} />
              Đô Thị Hòa Lạc · Bất động sản
            </span>
            <h1>{editingId ? 'Chỉnh sửa tin đăng' : 'Tạo tin đăng'}</h1>
            <p>
              {hasChanges ? 'Có thay đổi chưa lưu' : 'Thông tin đã đồng bộ'} ·{' '}
              {completion}% hoàn thiện
            </p>
          </div>

          <div className="property-post-topbar__actions">
            <button
              type="button"
              className="property-post-button property-post-button--ghost"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye size={18} />
              Xem trước
            </button>
            <Link
              className="property-post-button property-post-button--ghost"
              to="/tai-khoan/tin-nha-dat"
            >
              <X size={18} />
              Thoát
            </Link>
          </div>
        </header>

        <nav className="property-post-progress" aria-label="Các bước đăng tin">
          {STEPS.map((item) => {
            const Icon = item.icon;
            const active = item.id === step;
            const done = item.id < step || item.id < furthestStep;

            return (
              <button
                type="button"
                key={item.id}
                className={[
                  active ? 'is-active' : '',
                  done ? 'is-done' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => jumpToStep(item.id)}
              >
                <span>{done && !active ? <Check size={17} /> : <Icon size={17} />}</span>
                <div>
                  <small>Bước {item.id}</small>
                  <strong>{item.label}</strong>
                </div>
              </button>
            );
          })}
        </nav>

        {editingId && !source.bodyHtml ? (
          <div className="property-post-notice property-post-notice--warning">
            <Info size={19} />
            <div>
              <strong>Chưa tải được phần mô tả chi tiết cũ</strong>
              <p>
                Những trường khác vẫn chỉnh sửa bình thường. Hãy bổ sung lại
                phần mô tả trước khi gửi duyệt nếu cần.
              </p>
            </div>
          </div>
        ) : null}

        <form
          className="property-post-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (step < 3) goNext();
            else save(true);
          }}
          noValidate
        >
          {step === 1 ? (
            <div className="property-post-step" data-step="1">
              <div className="property-post-step__intro">
                <span>Bước 1</span>
                <h2>Thông tin bất động sản</h2>
                <p>
                  Chỉ nhập các thông tin cần thiết trước. Những thông số nâng cao
                  được gom vào một phần riêng để màn hình bớt rối.
                </p>
              </div>

              <SectionCard
                icon={WalletCards}
                title="Nhu cầu"
                description="Chọn mục đích của tin đăng."
              >
                <div className="property-post-choice-grid">
                  {Object.entries(TRANSACTION_TYPES).map(([value, label]) => {
                    const Icon = TRANSACTION_ICONS[value] || Home;
                    const selected = form.transactionType === value;

                    return (
                      <button
                        type="button"
                        key={value}
                        className={selected ? 'is-selected' : ''}
                        onClick={() => change('transactionType', value)}
                      >
                        <span><Icon size={21} /></span>
                        <strong>{label}</strong>
                        {selected ? <CheckCircle2 size={20} /> : null}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                icon={MapPin}
                title="Địa chỉ"
                description="Chọn khu vực trước, sau đó mô tả vị trí đủ rõ cho người xem."
              >
                <div
                  data-field="primaryAreaId"
                  className={
                    errors.primaryAreaId
                      ? 'property-post-taxonomy has-error'
                      : 'property-post-taxonomy'
                  }
                >
                  <TaxonomyFields
                    scope="property"
                    categoryId={null}
                    areaId={form.primaryAreaId}
                    tagIds={form.tagIds}
                    onChange={change}
                    areaRequired
                  />
                  {errors.primaryAreaId ? (
                    <small className="property-post-field__error">
                      {errors.primaryAreaId}
                    </small>
                  ) : null}
                </div>

                <div data-field="addressText">
                  <EditorField
                    label="Địa chỉ mô tả"
                    required
                    error={errors.addressText}
                    hint="Ví dụ: gần ĐHQGHN, xã Thạch Hòa. Không cần công khai số nhà nếu không muốn."
                  >
                    <div className="property-post-input">
                      <MapPin size={18} />
                      <input
                        type="text"
                        value={form.addressText}
                        onChange={(event) => change('addressText', event.target.value)}
                        placeholder="Nhập địa chỉ hoặc mô tả vị trí"
                        maxLength={500}
                      />
                    </div>
                  </EditorField>
                </div>

                <details className="property-post-collapsible property-post-collapsible--small">
                  <summary>
                    <span>
                      <Compass size={17} />
                      Thêm tọa độ bản đồ
                    </span>
                    <ChevronDown size={18} />
                  </summary>
                  <div className="property-post-grid property-post-grid--2">
                    <EditorField label="Vĩ độ">
                      <div className="property-post-input">
                        <MapPin size={18} />
                        <input
                          type="number"
                          step="any"
                          value={form.latitude}
                          onChange={(event) => change('latitude', event.target.value)}
                          placeholder="21.000000"
                        />
                      </div>
                    </EditorField>
                    <EditorField label="Kinh độ">
                      <div className="property-post-input">
                        <MapPin size={18} />
                        <input
                          type="number"
                          step="any"
                          value={form.longitude}
                          onChange={(event) => change('longitude', event.target.value)}
                          placeholder="105.500000"
                        />
                      </div>
                    </EditorField>
                  </div>
                </details>
              </SectionCard>

              <SectionCard
                icon={Building2}
                title="Thông tin chính"
                description="Loại bất động sản, diện tích và mức giá."
              >
                <div className="property-post-grid property-post-grid--2">
                  <EditorField label="Loại bất động sản" required>
                    <div className="property-post-input">
                      <Building2 size={18} />
                      <select
                        value={form.propertyType}
                        onChange={(event) => change('propertyType', event.target.value)}
                      >
                        {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </EditorField>

                  <div data-field="landArea">
                    <EditorField
                      label="Diện tích"
                      required
                      error={errors.landArea}
                    >
                      <div className="property-post-input property-post-input--suffix">
                        <LandPlot size={18} />
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={form.landArea}
                          onChange={(event) => change('landArea', event.target.value)}
                          placeholder="Nhập diện tích"
                        />
                        <span>m²</span>
                      </div>
                    </EditorField>
                  </div>

                  <div data-field="price">
                    <EditorField
                      label="Giá"
                      required={!form.isNegotiable}
                      error={errors.price}
                    >
                      <div className="property-post-input">
                        <CircleDollarSign size={18} />
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={form.price}
                          onChange={(event) => change('price', event.target.value)}
                          placeholder={form.isNegotiable ? 'Giá thỏa thuận' : 'Nhập giá'}
                          disabled={form.isNegotiable}
                        />
                      </div>
                    </EditorField>
                  </div>

                  <EditorField label="Đơn vị giá">
                    <div className="property-post-input">
                      <WalletCards size={18} />
                      <select
                        value={form.priceUnit}
                        onChange={(event) => change('priceUnit', event.target.value)}
                        disabled={form.isNegotiable}
                      >
                        {Object.entries(PRICE_UNITS)
                          .filter(([value]) => value !== 'negotiable')
                          .map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                      </select>
                    </div>
                  </EditorField>
                </div>

                <label className="property-post-switch-row">
                  <span>
                    <Sparkles size={18} />
                    <div>
                      <strong>Giá thỏa thuận</strong>
                      <small>Không bắt buộc nhập giá cụ thể.</small>
                    </div>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.isNegotiable}
                    onChange={(event) => change('isNegotiable', event.target.checked)}
                  />
                  <i><b /></i>
                </label>
              </SectionCard>

              <details className="property-post-collapsible property-post-card">
                <summary>
                  <span>
                    <span className="property-post-card__icon"><Ruler size={20} /></span>
                    <div>
                      <strong>Thông tin khác</strong>
                      <small>Pháp lý, phòng ngủ, mặt tiền, hướng... (không bắt buộc)</small>
                    </div>
                  </span>
                  <ChevronDown size={20} />
                </summary>

                <div className="property-post-grid property-post-grid--2 property-post-collapsible__content">
                  <EditorField label="Giấy tờ pháp lý">
                    <div className="property-post-input">
                      <ShieldCheck size={18} />
                      <select
                        value={form.legalStatus}
                        onChange={(event) => change('legalStatus', event.target.value)}
                      >
                        {Object.entries(LEGAL_STATUS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </EditorField>

                  <EditorField label="Người đăng">
                    <div className="property-post-input">
                      <UserRound size={18} />
                      <select
                        value={form.ownerType}
                        onChange={(event) => change('ownerType', event.target.value)}
                      >
                        {Object.entries(OWNER_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </EditorField>

                  <EditorField label="Diện tích sử dụng">
                    <div className="property-post-input property-post-input--suffix">
                      <Maximize2 size={18} />
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.usableArea}
                        onChange={(event) => change('usableArea', event.target.value)}
                        placeholder="0"
                      />
                      <span>m²</span>
                    </div>
                  </EditorField>

                  <EditorField label="Hướng">
                    <div className="property-post-input">
                      <Compass size={18} />
                      <select
                        value={form.direction}
                        onChange={(event) => change('direction', event.target.value)}
                      >
                        {Object.entries(DIRECTIONS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </EditorField>

                  <EditorField label="Mặt tiền">
                    <div className="property-post-input property-post-input--suffix">
                      <Ruler size={18} />
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.frontage}
                        onChange={(event) => change('frontage', event.target.value)}
                        placeholder="0"
                      />
                      <span>m</span>
                    </div>
                  </EditorField>

                  <EditorField label="Đường vào">
                    <div className="property-post-input property-post-input--suffix">
                      <Ruler size={18} />
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.roadWidth}
                        onChange={(event) => change('roadWidth', event.target.value)}
                        placeholder="0"
                      />
                      <span>m</span>
                    </div>
                  </EditorField>
                </div>

                <div className="property-post-steppers">
                  <StepperField
                    label="Số phòng ngủ"
                    value={form.bedrooms}
                    onChange={(value) => change('bedrooms', value)}
                    icon={BedDouble}
                  />
                  <StepperField
                    label="Số phòng tắm, vệ sinh"
                    value={form.bathrooms}
                    onChange={(value) => change('bathrooms', value)}
                    icon={Bath}
                  />
                </div>
              </details>

              <SectionCard
                icon={FileText}
                title="Nội dung tiêu đề & mô tả"
                description="Viết ngắn gọn, đúng thực tế và tập trung vào điểm người mua/thuê quan tâm."
              >
                <div data-field="title">
                  <EditorField
                    label="Tiêu đề"
                    required
                    error={errors.title}
                    counter={`${form.title.length}/250`}
                    hint="Nên có loại BĐS, khu vực, diện tích và điểm nổi bật."
                  >
                    <div className="property-post-input">
                      <FileText size={18} />
                      <input
                        type="text"
                        value={form.title}
                        onChange={(event) => change('title', event.target.value)}
                        placeholder="Ví dụ: Bán đất 120 m² tại Thạch Hòa, đường ô tô"
                        maxLength={250}
                      />
                    </div>
                  </EditorField>
                </div>

                <EditorField
                  label="Mô tả ngắn"
                  error={errors.summary}
                  counter={`${form.summary.length}/1000`}
                  hint="Không bắt buộc. Dùng 1–3 câu để tóm tắt ưu điểm chính."
                >
                  <textarea
                    className="property-post-textarea"
                    rows={3}
                    value={form.summary}
                    onChange={(event) => change('summary', event.target.value)}
                    placeholder="Tóm tắt vị trí, pháp lý, đường vào, ưu điểm nổi bật..."
                    maxLength={1000}
                  />
                </EditorField>

                <div data-field="bodyHtml">
                  <EditorField
                    label="Mô tả chi tiết"
                    required
                    error={errors.bodyHtml}
                  >
                    <div className="property-post-richtext">
                      <RichTextEditor
                        value={form.bodyHtml}
                        onChange={(value) => change('bodyHtml', value)}
                      />
                    </div>
                  </EditorField>
                </div>
              </SectionCard>

              <details className="property-post-collapsible property-post-card">
                <summary>
                  <span>
                    <span className="property-post-card__icon"><Phone size={20} /></span>
                    <div>
                      <strong>Thông tin liên hệ</strong>
                      <small>{form.contactPhone || 'Số điện thoại đã xác thực'}</small>
                    </div>
                  </span>
                  <ChevronDown size={20} />
                </summary>

                <div className="property-post-grid property-post-grid--2 property-post-collapsible__content">
                  <div data-field="contactName">
                    <EditorField
                      label="Tên liên hệ"
                      required
                      error={errors.contactName}
                    >
                      <div className="property-post-input">
                        <UserRound size={18} />
                        <input
                          type="text"
                          value={form.contactName}
                          onChange={(event) => change('contactName', event.target.value)}
                          placeholder="Tên người liên hệ"
                        />
                      </div>
                    </EditorField>
                  </div>

                  <div data-field="contactPhone">
                    <EditorField
                      label="Số điện thoại"
                      required
                      error={errors.contactPhone}
                    >
                      <div className="property-post-input is-readonly">
                        <Phone size={18} />
                        <input type="text" value={form.contactPhone} readOnly />
                        <BadgeCheck size={18} />
                      </div>
                    </EditorField>
                  </div>

                  <div data-field="contactEmail">
                    <EditorField label="Email" error={errors.contactEmail}>
                      <div className="property-post-input">
                        <Mail size={18} />
                        <input
                          type="email"
                          value={form.contactEmail}
                          onChange={(event) => change('contactEmail', event.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>
                    </EditorField>
                  </div>
                </div>
              </details>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="property-post-step" data-step="2">
              <div className="property-post-step__intro">
                <span>Bước 2</span>
                <h2>Hình ảnh bất động sản</h2>
                <p>
                  Tải nhiều ảnh trong một lần. Ảnh đầu tiên được dùng làm ảnh
                  đại diện; có thể đổi ảnh đại diện bằng nút ngôi sao.
                </p>
              </div>

              <SectionCard
                icon={ImagePlus}
                title="Hình ảnh"
                description="Nên dùng ảnh thật, rõ nét, đủ góc nhìn và đúng hiện trạng."
              >
                <div data-field="thumbnailMediaId">
                  <PropertyGalleryUploader
                    value={form.galleryMediaIds}
                    onChange={changeGallery}
                    max={20}
                  />

                  {errors.thumbnailMediaId ? (
                    <small className="property-post-field__error property-post-gallery-error">
                      {errors.thumbnailMediaId}
                    </small>
                  ) : null}
                </div>

                <div className="property-post-media-guidelines">
                  <div>
                    <CheckCircle2 size={18} />
                    <span>
                      <strong>Khuyến nghị</strong>
                      Ảnh ngang cho mặt tiền, ảnh dọc cho không gian nội thất.
                    </span>
                  </div>
                  <div>
                    <ShieldCheck size={18} />
                    <span>
                      <strong>Minh bạch</strong>
                      Không dùng ảnh sai thực tế hoặc chèn thông tin gây hiểu nhầm.
                    </span>
                  </div>
                  <div>
                    <Star size={18} />
                    <span>
                      <strong>Ảnh đại diện</strong>
                      Chọn ảnh sáng, rõ và thể hiện bất động sản tốt nhất.
                    </span>
                  </div>
                </div>
              </SectionCard>

              {form.galleryMediaIds.length ? (
                <div className="property-post-media-summary">
                  <span className="property-post-media-summary__thumb">
                    {previewImage ? (
                      <img src={previewImage} alt="Ảnh đại diện tin đăng" />
                    ) : (
                      <ImagePlus size={24} />
                    )}
                  </span>
                  <div>
                    <strong>{form.galleryMediaIds.length} ảnh đã sẵn sàng</strong>
                    <small>Ảnh đầu tiên sẽ xuất hiện trên danh sách BĐS.</small>
                  </div>
                  <BadgeCheck size={22} />
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="property-post-step" data-step="3">
              <div className="property-post-step__intro">
                <span>Bước 3</span>
                <h2>Chọn hạng tin & xuất bản</h2>
                <p>
                  Giá hạng tin vẫn được hiển thị để tham chiếu. Trong giai đoạn
                  hiện tại, Đô Thị Hòa Lạc miễn phí 100% phí đăng tin.
                </p>
              </div>

              <div className="property-post-free-banner">
                <span><Sparkles size={22} /></span>
                <div>
                  <strong>Đăng tin miễn phí trên Đô Thị Hòa Lạc</strong>
                  <p>
                    Bạn vẫn được chọn hạng và thời hạn hiển thị. Mức giá bên dưới
                    là giá tham chiếu; số tiền cần thanh toán hiện tại luôn là 0đ.
                  </p>
                </div>
                <b>0 ĐỒNG</b>
              </div>

              <SectionCard
                icon={Star}
                title="Chọn hạng tin"
                description="Hạng cao hơn được ưu tiên hiển thị trước trong danh sách bất động sản."
              >
                <div className="property-post-tier-grid">
                  {LISTING_TIERS.map((tier) => {
                    const selected = form.listingTier === tier.id;

                    return (
                      <button
                        type="button"
                        key={tier.id}
                        data-tier={tier.id}
                        className={selected ? 'is-selected' : ''}
                        onClick={() => change('listingTier', tier.id)}
                      >
                        <span className="property-post-tier-card__bars"><i /><i /><i /></span>
                        <strong>{tier.label}</strong>
                        <small>{tier.description}</small>
                        {tier.multiplier ? <em>{tier.multiplier} mức ưu tiên</em> : <em>Tiêu chuẩn</em>}
                        <b>{formatMoney(tier.referencePrice)}/ngày</b>
                        <mark>MIỄN PHÍ HIỆN TẠI</mark>
                        {selected ? <CheckCircle2 size={22} /> : null}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                icon={CalendarDays}
                title="Thời hạn hiển thị"
                description="Chọn thời gian tin được ưu tiên theo hạng đã chọn."
              >
                <div className="property-post-duration-grid">
                  {DURATION_OPTIONS.map((days) => (
                    <button
                      type="button"
                      key={days}
                      className={form.listingDurationDays === days ? 'is-selected' : ''}
                      onClick={() => change('listingDurationDays', days)}
                    >
                      <span>{days} ngày</span>
                      <small>
                        Giá tham chiếu {formatMoney(selectedTier.referencePrice * days)}
                      </small>
                      <strong>Miễn phí</strong>
                      {form.listingDurationDays === days ? <Check size={18} /> : null}
                    </button>
                  ))}
                </div>

                <div className="property-post-start-date">
                  <EditorField label="Ngày bắt đầu">
                    <div className="property-post-input">
                      <CalendarDays size={18} />
                      <input
                        type="date"
                        value={form.listingStartAt}
                        onChange={(event) => change('listingStartAt', event.target.value)}
                      />
                    </div>
                  </EditorField>

                  <div className="property-post-start-date__note">
                    <Info size={17} />
                    <span>Tin sẽ được gửi kiểm duyệt trước khi hiển thị công khai.</span>
                  </div>
                </div>
              </SectionCard>

              <section className="property-post-checkout">
                <div className="property-post-checkout__listing">
                  <span className="property-post-checkout__image">
                    {previewImage ? (
                      <img src={previewImage} alt="Ảnh đại diện" />
                    ) : (
                      <Building2 size={28} />
                    )}
                  </span>
                  <div>
                    <small>{transactionLabel} · {propertyLabel}</small>
                    <h3>{form.title || 'Tin bất động sản của bạn'}</h3>
                    <p>{form.addressText || 'Chưa có địa chỉ'}</p>
                    <strong>{pricePreview}</strong>
                  </div>
                </div>

                <div className="property-post-checkout__price">
                  <div>
                    <span>Hạng tin</span>
                    <strong>{selectedTier.label}</strong>
                  </div>
                  <div>
                    <span>Thời hạn</span>
                    <strong>{form.listingDurationDays} ngày</strong>
                  </div>
                  <div>
                    <span>Giá tham chiếu</span>
                    <strong>{formatMoney(referenceTotal)}</strong>
                  </div>
                  <div className="is-discount">
                    <span>Ưu đãi hệ thống</span>
                    <strong>− {formatMoney(referenceTotal)}</strong>
                  </div>
                  <div className="is-total">
                    <span>Tổng thanh toán</span>
                    <strong>0 đ</strong>
                  </div>
                  <p>
                    <CheckCircle2 size={17} />
                    Không yêu cầu thanh toán hoặc số dư tài khoản.
                  </p>
                </div>
              </section>
            </div>
          ) : null}

          <footer className="property-post-footer">
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  className="property-post-button property-post-button--ghost"
                  onClick={goBack}
                  disabled={Boolean(loadingAction)}
                >
                  <ChevronLeft size={18} />
                  Quay lại
                </button>
              ) : (
                <Link
                  className="property-post-button property-post-button--ghost"
                  to="/tai-khoan/tin-nha-dat"
                >
                  <ArrowLeft size={18} />
                  Hủy
                </Link>
              )}
            </div>

            <div className="property-post-footer__summary">
              {step === 3 ? (
                <span>
                  <small>Tổng thanh toán</small>
                  <strong>0 đ</strong>
                </span>
              ) : null}

              {step < 3 ? (
                <button
                  type="button"
                  className="property-post-button property-post-button--primary"
                  onClick={goNext}
                >
                  Tiếp tục
                  <ChevronRight size={18} />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="property-post-button property-post-button--ghost"
                    disabled={Boolean(loadingAction)}
                    onClick={() => save(false)}
                  >
                    {loadingAction === 'draft' ? (
                      <LoaderCircle className="is-spinning" size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    Lưu nháp
                  </button>

                  <button
                    type="submit"
                    className="property-post-button property-post-button--primary"
                    disabled={Boolean(loadingAction)}
                  >
                    {loadingAction === 'submit' ? (
                      <>
                        <LoaderCircle className="is-spinning" size={18} />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Đăng tin miễn phí
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </footer>
        </form>
      </div>

      {previewOpen ? (
        <div className="property-post-preview-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="property-post-preview-modal__overlay"
            aria-label="Đóng xem trước"
            onClick={() => setPreviewOpen(false)}
          />

          <section>
            <header>
              <div>
                <small>Xem trước tin đăng</small>
                <strong>{transactionLabel} · {propertyLabel}</strong>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setPreviewOpen(false)}
              >
                <X size={21} />
              </button>
            </header>

            {previewImage ? (
              <img
                className="property-post-preview-modal__image"
                src={previewImage}
                alt="Ảnh đại diện bất động sản"
              />
            ) : null}

            <div className="property-post-preview-modal__body">
              <h2>{form.title || 'Tiêu đề tin bất động sản'}</h2>
              <strong>{pricePreview}</strong>
              <div className="property-post-preview-modal__meta">
                <span><LandPlot size={16} /> {form.landArea ? `${formatNumber(form.landArea)} m²` : 'Chưa có diện tích'}</span>
                <span><MapPin size={16} /> {form.addressText || 'Chưa có địa chỉ'}</span>
                <span><UserRound size={16} /> {OWNER_TYPES[form.ownerType]}</span>
              </div>
              {form.summary ? <p>{form.summary}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
