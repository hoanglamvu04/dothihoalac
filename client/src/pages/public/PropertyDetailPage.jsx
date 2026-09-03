import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Link, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Copy,
  Eye,
  FileCheck2,
  Home,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  Ruler,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import ContentImage from '../../components/content/ContentImage';
import ArticleBody from '../../components/content/ArticleBody';
import CommentsSection from '../../components/content/CommentsSection';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';
import LeadForm from '../../components/forms/LeadForm';
import {
  PropertyGalleryLightbox,
  PropertyUtilityActions,
} from '../../components/property/PropertyDetailTools';

import { propertyApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

import {
  DIRECTIONS,
  LEGAL_STATUS,
  OWNER_TYPES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from '../../utils/constants';

import {
  formatCurrency,
  formatDate,
  formatNumber,
} from '../../utils/formatters';

import './PropertyDetailPage.css';

function getMediaKey(media, index) {
  if (!media) return `media-${index}`;
  if (typeof media === 'string') return media;

  return String(
    media._id ||
    media.id ||
    media.url ||
    media.secureUrl ||
    `media-${index}`,
  );
}

function buildGallery(item) {
  const property = item?.property || {};

  const source = [
    item?.thumbnailMediaId,
    ...(Array.isArray(item?.mediaIds) ? item.mediaIds : []),
    ...(Array.isArray(property?.mediaIds) ? property.mediaIds : []),
    ...(Array.isArray(property?.galleryMediaIds) ? property.galleryMediaIds : []),
  ].filter(Boolean);

  const seen = new Set();

  return source.filter((media, index) => {
    const key = getMediaKey(media, index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getFeatureItems(property) {
  const source = property?.featureIds || [];
  if (!Array.isArray(source)) return [];

  return source
    .map((feature, index) => {
      if (!feature) return null;

      if (typeof feature === 'string') {
        return { id: feature, name: feature };
      }

      const name = feature.name || feature.title || feature.label;
      if (!name) return null;

      return {
        id: feature._id || feature.id || `${name}-${index}`,
        name,
      };
    })
    .filter(Boolean);
}

function getTaxonomyValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.slug || value._id || value.id || '';
}

function getViewCount(item) {
  return Number(item?.stats?.viewCount ?? item?.viewCount ?? 0);
}

function getCommentCount(item) {
  return Number(
    item?.stats?.commentCount ??
    item?.commentCount ??
    item?.commentsCount ??
    0,
  );
}

function getPriceLabel(property) {
  const hasPrice =
    property?.price !== undefined &&
    property?.price !== null &&
    Number(property.price) > 0;

  if (!hasPrice) return 'Giá thỏa thuận';
  return formatCurrency(property.price, property.priceUnit);
}

function getPropertyAddress(item) {
  const property = item?.property || {};
  return property.addressText || item?.primaryAreaId?.name || 'Hòa Lạc';
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export default function PropertyDetailPage() {
  const { slug } = useParams();
  const toast = useToast();
  const pageRef = useRef(null);

  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    let active = true;

    setItem(null);
    setError(null);
    setPhoneVisible(false);
    setPhoneLoading(false);
    setActiveImageIndex(0);
    setReadingProgress(0);

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    propertyApi
      .detail(slug)
      .then((result) => {
        if (active) setItem(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const property = item?.property || {};
  const gallery = useMemo(() => buildGallery(item), [item]);
  const features = useMemo(() => getFeatureItems(property), [property]);

  const activeMedia =
    gallery[activeImageIndex] || item?.thumbnailMediaId || null;

  const priceLabel = getPriceLabel(property);
  const address = getPropertyAddress(item);
  const areaValue = getTaxonomyValue(item?.primaryAreaId);
  const viewCount = getViewCount(item);
  const commentCount = getCommentCount(item);
  const publishedAt = item?.publishedAt || item?.createdAt;
  const contactName =
    property.contactName || item?.authorId?.displayName || 'Người đăng tin';

  const transactionLabel =
    TRANSACTION_TYPES[property.transactionType] || 'Bất động sản';
  const ownerLabel = OWNER_TYPES[property.ownerType] || 'Người đăng';
  const propertyTypeLabel =
    PROPERTY_TYPES[property.propertyType] || 'Bất động sản';
  const legalLabel =
    LEGAL_STATUS[property.legalStatus] || 'Chưa cập nhật';
  const directionLabel =
    DIRECTIONS[property.direction] || 'Chưa cập nhật';

  const initialBookmarked = Boolean(
    item?.viewer?.bookmarked ||
    item?.viewer?.isBookmarked ||
    item?.bookmarked ||
    item?.isBookmarked,
  );

  useEffect(() => {
    if (!item) return undefined;

    let animationFrame = null;

    const calculateProgress = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);

      animationFrame = requestAnimationFrame(() => {
        const root = pageRef.current;
        if (!root) return;

        const rootTop = root.getBoundingClientRect().top + window.scrollY;
        const rootHeight = root.offsetHeight;
        const start = rootTop - 100;
        const end = rootTop + rootHeight - window.innerHeight * 0.7;
        const distance = Math.max(end - start, 1);
        const progress = (window.scrollY - start) / distance;

        setReadingProgress(Math.min(Math.max(progress, 0), 1));
      });
    };

    calculateProgress();
    window.addEventListener('scroll', calculateProgress, { passive: true });
    window.addEventListener('resize', calculateProgress);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', calculateProgress);
      window.removeEventListener('resize', calculateProgress);
    };
  }, [item]);

  const revealPhone = useCallback(async () => {
    if (phoneLoading || phoneVisible || !property.contactPhone) return;

    setPhoneLoading(true);

    try {
      if (typeof propertyApi.contact === 'function') {
        await propertyApi.contact(item._id, 'reveal_phone');
      }
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    } finally {
      setPhoneVisible(true);
      setPhoneLoading(false);
    }
  }, [
    item?._id,
    phoneLoading,
    phoneVisible,
    property.contactPhone,
    toast,
  ]);

  const handleCopyLink = useCallback(async () => {
    try {
      await copyText(window.location.href);
      setCopied(true);
      toast.success('Đã sao chép liên kết tin đăng.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Không thể sao chép liên kết.');
    }
  }, [toast]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: item?.title,
      text: item?.summary || `${transactionLabel} tại ${address}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (shareError) {
        if (shareError?.name !== 'AbortError') {
          toast.error('Không thể mở chức năng chia sẻ.');
        }
      }
      return;
    }

    await handleCopyLink();
  }, [address, handleCopyLink, item, toast, transactionLabel]);

  const showPreviousImage = useCallback(() => {
    setActiveImageIndex((current) =>
      current <= 0 ? gallery.length - 1 : current - 1,
    );
  }, [gallery.length]);

  const showNextImage = useCallback(() => {
    setActiveImageIndex((current) =>
      current >= gallery.length - 1 ? 0 : current + 1,
    );
  }, [gallery.length]);

  if (!item && !error) return <PageLoading />;

  if (error) {
    return (
      <section className="property-detail-error">
        <div className="property-detail-container">
          <ErrorState error={error} />
        </div>
      </section>
    );
  }

  return (
    <section ref={pageRef} className="property-detail-page">
      <Seo title={item.title} description={item.summary} />

      <div className="property-reading-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${readingProgress})` }} />
      </div>

      <div className="property-detail-container">
        <nav
          className="property-detail-breadcrumb"
          aria-label="Điều hướng bất động sản"
        >
          <Link to="/nha-dat">
            <ArrowLeft size={16} />
            Bất động sản
          </Link>
          <span>/</span>
          {property.propertyType ? (
            <Link
              to={`/nha-dat?propertyType=${encodeURIComponent(
                property.propertyType,
              )}`}
            >
              {propertyTypeLabel}
            </Link>
          ) : (
            <span>{propertyTypeLabel}</span>
          )}
        </nav>

        <header className="property-detail-header">
          <div className="property-detail-header__content">
            <div className="property-detail-labels">
              <Badge tone="accent">{transactionLabel}</Badge>
              <Badge tone="dark">{ownerLabel}</Badge>
              {property.legalStatus ? (
                <span className="property-legal-badge">
                  <ShieldCheck size={15} />
                  {legalLabel}
                </span>
              ) : null}
            </div>

            <h1>{item.title}</h1>

            <div className="property-detail-location">
              <MapPin size={18} />
              {areaValue ? (
                <Link
                  to={`/nha-dat?area=${encodeURIComponent(areaValue)}`}
                >
                  {address}
                </Link>
              ) : (
                <span>{address}</span>
              )}
            </div>

            <div className="property-detail-meta">
              <span>
                <CalendarDays size={16} />
                Đăng ngày {formatDate(publishedAt)}
              </span>
              <span>
                <Eye size={16} />
                {viewCount.toLocaleString('vi-VN')} lượt xem
              </span>
              <span>
                <MessageCircle size={16} />
                {commentCount.toLocaleString('vi-VN')} bình luận
              </span>
            </div>
          </div>

          <div className="property-detail-price-box">
            <span>Mức giá</span>
            <strong>{priceLabel}</strong>
            {property.priceNegotiable || property.isNegotiable ? (
              <small>Có thể thương lượng</small>
            ) : (
              <small>Theo thông tin người đăng</small>
            )}

            <div>
              <button type="button" onClick={handleShare}>
                <Share2 size={17} />
                Chia sẻ
              </button>
              <button type="button" onClick={handleCopyLink}>
                {copied ? <Check size={17} /> : <Copy size={17} />}
                {copied ? 'Đã sao chép' : 'Sao chép link'}
              </button>
            </div>
          </div>
        </header>

        <section className="property-gallery">
          <div className="property-gallery__main">
            {activeMedia ? (
              <ContentImage
                media={activeMedia}
                alt={`${item.title} - ảnh ${activeImageIndex + 1}`}
                ratio="hero"
              />
            ) : (
              <div className="property-gallery__placeholder">
                <Building2 size={48} />
                <span>Tin đăng chưa có hình ảnh</span>
              </div>
            )}

            {activeMedia ? (
              <PropertyGalleryLightbox
                gallery={gallery}
                activeIndex={activeImageIndex}
                setActiveIndex={setActiveImageIndex}
                title={item.title}
              />
            ) : null}

            {gallery.length > 1 ? (
              <>
                <button
                  type="button"
                  className="property-gallery__previous"
                  aria-label="Ảnh trước"
                  onClick={showPreviousImage}
                >
                  <ChevronLeft size={23} />
                </button>
                <button
                  type="button"
                  className="property-gallery__next"
                  aria-label="Ảnh tiếp theo"
                  onClick={showNextImage}
                >
                  <ChevronRight size={23} />
                </button>
                <span className="property-gallery__counter">
                  {activeImageIndex + 1} / {gallery.length}
                </span>
              </>
            ) : null}
          </div>

          {gallery.length > 1 ? (
            <div className="property-gallery__thumbnails">
              {gallery.map((media, index) => (
                <button
                  type="button"
                  key={getMediaKey(media, index)}
                  className={activeImageIndex === index ? 'is-active' : ''}
                  aria-label={`Xem ảnh ${index + 1}`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <ContentImage
                    media={media}
                    alt={`${item.title} - ảnh thu nhỏ ${index + 1}`}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="property-detail-layout">
          <main className="property-detail-main">
            <section className="property-facts-section">
              <div className="property-section-heading">
                <span><Home size={20} /></span>
                <div>
                  <h2>Thông số bất động sản</h2>
                  <p>Các thông tin chính do người đăng cung cấp.</p>
                </div>
              </div>

              <div className="property-facts-grid">
                <article>
                  <span><Maximize2 size={22} /></span>
                  <div>
                    <small>Diện tích đất</small>
                    <strong>
                      {property.landArea
                        ? `${formatNumber(property.landArea)} m²`
                        : 'Chưa cập nhật'}
                    </strong>
                  </div>
                </article>
                <article>
                  <span><Ruler size={22} /></span>
                  <div>
                    <small>Diện tích sử dụng</small>
                    <strong>
                      {property.usableArea
                        ? `${formatNumber(property.usableArea)} m²`
                        : 'Chưa cập nhật'}
                    </strong>
                  </div>
                </article>
                <article>
                  <span><BedDouble size={22} /></span>
                  <div>
                    <small>Phòng ngủ</small>
                    <strong>{property.bedrooms ?? '—'}</strong>
                  </div>
                </article>
                <article>
                  <span><Bath size={22} /></span>
                  <div>
                    <small>Phòng tắm</small>
                    <strong>{property.bathrooms ?? '—'}</strong>
                  </div>
                </article>
                <article>
                  <span><Compass size={22} /></span>
                  <div>
                    <small>Hướng</small>
                    <strong>{directionLabel}</strong>
                  </div>
                </article>
                <article>
                  <span><ShieldCheck size={22} /></span>
                  <div>
                    <small>Pháp lý</small>
                    <strong>{legalLabel}</strong>
                  </div>
                </article>
              </div>
            </section>

            <section className="property-description-section">
              <div className="property-section-heading">
                <span><FileCheck2 size={20} /></span>
                <div>
                  <h2>Thông tin mô tả</h2>
                  <p>Nội dung chi tiết về bất động sản và điều kiện giao dịch.</p>
                </div>
              </div>

              {item.summary ? (
                <p className="property-description-lead">{item.summary}</p>
              ) : null}

              <div className="property-description-body">
                <ArticleBody html={item.body?.bodyHtml || item.bodyHtml} />
              </div>
            </section>

            <section className="property-specification-section">
              <div className="property-section-heading">
                <span><Building2 size={20} /></span>
                <div>
                  <h2>Thông tin chi tiết</h2>
                  <p>Thông số kỹ thuật và trạng thái của tin đăng.</p>
                </div>
              </div>

              <dl className="property-spec-table">
                <div><dt>Loại bất động sản</dt><dd>{propertyTypeLabel}</dd></div>
                <div><dt>Hình thức giao dịch</dt><dd>{transactionLabel}</dd></div>
                <div><dt>Người đăng</dt><dd>{ownerLabel}</dd></div>
                <div><dt>Pháp lý</dt><dd>{legalLabel}</dd></div>
                <div>
                  <dt>Mặt tiền</dt>
                  <dd>
                    {property.frontage
                      ? `${formatNumber(property.frontage)} m`
                      : 'Chưa cập nhật'}
                  </dd>
                </div>
                <div>
                  <dt>Đường vào</dt>
                  <dd>
                    {property.roadWidth
                      ? `${formatNumber(property.roadWidth)} m`
                      : 'Chưa cập nhật'}
                  </dd>
                </div>
                <div><dt>Số tầng</dt><dd>{property.floors ?? 'Chưa cập nhật'}</dd></div>
                <div><dt>Hướng nhà đất</dt><dd>{directionLabel}</dd></div>
                <div><dt>Ngày đăng</dt><dd>{formatDate(publishedAt)}</dd></div>
                <div>
                  <dt>Ngày hết hạn</dt>
                  <dd>
                    {property.expiresAt
                      ? formatDate(property.expiresAt)
                      : 'Chưa cập nhật'}
                  </dd>
                </div>
              </dl>
            </section>

            {features.length ? (
              <section className="property-features-section">
                <div className="property-section-heading">
                  <span><Sparkles size={20} /></span>
                  <div>
                    <h2>Đặc điểm và tiện ích</h2>
                    <p>Các điểm nổi bật được người đăng lựa chọn.</p>
                  </div>
                </div>

                <div className="property-feature-list">
                  {features.map((feature) => (
                    <span key={feature.id}>
                      <Check size={15} />
                      {feature.name}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="property-safety-notice">
              <span><ShieldAlert size={23} /></span>
              <div>
                <strong>Lưu ý an toàn khi giao dịch</strong>
                <p>
                  Hãy kiểm tra giấy tờ pháp lý, xác minh người đăng, khảo sát
                  thực tế và không chuyển tiền đặt cọc khi chưa có thỏa thuận
                  rõ ràng.
                </p>
              </div>
            </section>

            <PropertyUtilityActions
              contentId={item._id}
              address={address}
              onShare={handleShare}
              initialBookmarked={initialBookmarked}
            />

            <section
              id="property-comments"
              className="property-comments-section"
            >
              <div className="property-section-heading">
                <span><MessageCircle size={20} /></span>
                <div>
                  <h2>Bình luận và trao đổi</h2>
                  <p>Trao đổi thêm thông tin liên quan đến tin đăng.</p>
                </div>
              </div>

              <CommentsSection
                contentId={item._id}
                allowComments={item.allowComments}
              />
            </section>
          </main>

          <aside className="property-detail-sidebar">
            <div className="property-detail-sidebar__content">
              <section className="property-contact-card">
                <div className="property-contact-card__heading">
                  <span><UserRound size={21} /></span>
                  <div>
                    <small>Liên hệ người đăng</small>
                    <h2>{contactName}</h2>
                    <p>{ownerLabel}</p>
                  </div>
                </div>

                <div className="property-contact-price">
                  <span>Mức giá</span>
                  <strong>{priceLabel}</strong>
                </div>

                {property.contactPhone ? (
                  phoneVisible ? (
                    <a
                      className="property-contact-phone"
                      href={`tel:${property.contactPhone}`}
                    >
                      <Phone size={19} />
                      <span>
                        <small>Gọi người đăng</small>
                        <strong>{property.contactPhone}</strong>
                      </span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="property-contact-reveal"
                      disabled={phoneLoading}
                      onClick={revealPhone}
                    >
                      <Phone size={18} />
                      {phoneLoading
                        ? 'Đang lấy số điện thoại...'
                        : 'Hiện số điện thoại'}
                    </button>
                  )
                ) : (
                  <div className="property-contact-unavailable">
                    <Phone size={17} />
                    Chưa có số điện thoại
                  </div>
                )}

                {property.contactEmail ? (
                  <a
                    className="property-contact-email"
                    href={`mailto:${property.contactEmail}`}
                  >
                    <Mail size={17} />
                    <span>{property.contactEmail}</span>
                  </a>
                ) : null}

                <small className="property-contact-note">
                  Khi liên hệ, hãy nói bạn xem tin trên Đô Thị Hòa Lạc để
                  người đăng dễ nhận biết.
                </small>
              </section>

              <section className="property-sidebar-card property-sidebar-info">
                <div className="property-sidebar-heading">
                  <Building2 size={19} />
                  <h2>Tóm tắt tin đăng</h2>
                </div>

                <dl>
                  <div>
                    <dt><Home size={16} />Loại BĐS</dt>
                    <dd>{propertyTypeLabel}</dd>
                  </div>
                  <div>
                    <dt><WalletCards size={16} />Giao dịch</dt>
                    <dd>{transactionLabel}</dd>
                  </div>
                  <div>
                    <dt><Maximize2 size={16} />Diện tích</dt>
                    <dd>
                      {property.landArea
                        ? `${formatNumber(property.landArea)} m²`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt><ShieldCheck size={16} />Pháp lý</dt>
                    <dd>{legalLabel}</dd>
                  </div>
                  <div>
                    <dt><MapPin size={16} />Khu vực</dt>
                    <dd>{item.primaryAreaId?.name || 'Hòa Lạc'}</dd>
                  </div>
                </dl>
              </section>

              <section className="property-sidebar-card property-sidebar-architecture">
                <span>Kiến Trúc Hòa Lạc</span>
                <h2>Cần xây dựng trên khu đất này?</h2>
                <p>
                  Nhận tư vấn phương án kiến trúc, công năng và dự toán sơ bộ
                  theo nhu cầu thực tế.
                </p>
                <Link
                  to={`/tu-van?type=architecture_design&source=${item._id}`}
                >
                  Nhận tư vấn xây dựng
                  <ArrowLeft size={17} />
                </Link>
              </section>

              <section className="property-sidebar-card property-sidebar-lead">
                <div className="property-sidebar-heading">
                  <MessageCircle size={19} />
                  <div>
                    <h2>Tư vấn nhanh</h2>
                    <p>Để lại thông tin để được hỗ trợ.</p>
                  </div>
                </div>
                <LeadForm compact sourceContentId={item._id} />
              </section>
            </div>
          </aside>
        </div>
      </div>

      {readingProgress > 0.35 ? (
        <button
          type="button"
          className="property-scroll-top"
          aria-label="Quay lên đầu trang"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        >
          <ChevronUp size={21} />
        </button>
      ) : null}
    </section>
  );
}
