import {
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flag,
  MapPinned,
  Share2,
  X,
  ZoomIn,
} from 'lucide-react';

import ContentImage from '../content/ContentImage';
import { bookmarkApi, reportApi } from '../../api/interaction.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

import './PropertyDetailTools.css';

const REPORT_REASONS = [
  ['false_information', 'Thông tin không chính xác'],
  ['scam', 'Có dấu hiệu lừa đảo'],
  ['spam', 'Tin rác / quảng cáo sai mục đích'],
  ['duplicate', 'Tin đăng trùng lặp'],
  ['wrong_category', 'Sai danh mục'],
  ['privacy', 'Vi phạm quyền riêng tư'],
  ['copyright', 'Vi phạm bản quyền'],
  ['harassment', 'Quấy rối / nội dung không phù hợp'],
  ['other', 'Lý do khác'],
];

export function PropertyUtilityActions({
  contentId,
  address,
  onShare,
  initialBookmarked = false,
}) {
  const toast = useToast();
  const [saved, setSaved] = useState(Boolean(initialBookmarked));
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('false_information');
  const [reportDescription, setReportDescription] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    setSaved(Boolean(initialBookmarked));
  }, [initialBookmarked, contentId]);

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address || 'Hòa Lạc',
  )}`;

  const handleSave = async () => {
    if (!contentId || saving) return;

    setSaving(true);

    try {
      if (saved) {
        await bookmarkApi.remove(contentId);
        setSaved(false);
        toast.success('Đã bỏ tin khỏi danh sách đã lưu.');
      } else {
        await bookmarkApi.put(contentId);
        setSaved(true);
        toast.success('Đã lưu tin bất động sản.');
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async (event) => {
    event.preventDefault();

    if (!contentId || reporting) return;

    setReporting(true);

    try {
      await reportApi.create({
        targetType: 'content',
        targetId: contentId,
        reason: reportReason,
        ...(reportDescription.trim()
          ? { description: reportDescription.trim() }
          : {}),
      });

      setReportOpen(false);
      setReportReason('false_information');
      setReportDescription('');
      toast.success('Đã gửi báo cáo. Cảm ơn bạn đã phản hồi.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setReporting(false);
    }
  };

  return (
    <>
      <section className="property-utility-actions" aria-label="Tiện ích tin bất động sản">
        <a href={directionsUrl} target="_blank" rel="noreferrer">
          <MapPinned size={20} />
          <span>Xem đường đi</span>
        </a>

        <button
          type="button"
          className={saved ? 'is-active' : ''}
          disabled={saving}
          onClick={handleSave}
        >
          <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
          <span>{saved ? 'Đã lưu' : 'Lưu'}</span>
        </button>

        <button type="button" onClick={onShare}>
          <Share2 size={20} />
          <span>Chia sẻ</span>
        </button>

        <button type="button" onClick={() => setReportOpen(true)}>
          <Flag size={20} />
          <span>Báo cáo</span>
        </button>
      </section>

      {reportOpen
        ? createPortal(
          <div
            className="property-report-dialog"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setReportOpen(false);
            }}
          >
            <form className="property-report-dialog__card" onSubmit={submitReport}>
              <div className="property-report-dialog__header">
                <div>
                  <strong>Báo cáo tin đăng</strong>
                  <span>Chọn lý do phù hợp để Ban quản trị kiểm tra.</span>
                </div>

                <button
                  type="button"
                  aria-label="Đóng báo cáo"
                  onClick={() => setReportOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <label>
                <span>Lý do</span>
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                >
                  {REPORT_REASONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Mô tả thêm</span>
                <textarea
                  value={reportDescription}
                  maxLength={3000}
                  rows={4}
                  placeholder="Thông tin bổ sung giúp Ban quản trị xử lý chính xác hơn..."
                  onChange={(event) => setReportDescription(event.target.value)}
                />
              </label>

              <div className="property-report-dialog__actions">
                <button type="button" onClick={() => setReportOpen(false)}>
                  Hủy
                </button>
                <button type="submit" disabled={reporting}>
                  {reporting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}

export function PropertyGalleryLightbox({
  gallery,
  activeIndex,
  setActiveIndex,
  title,
}) {
  const [open, setOpen] = useState(false);
  const items = Array.isArray(gallery) ? gallery : [];
  const activeMedia = items[activeIndex] || null;

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (!items.length) return;

      if (event.key === 'ArrowLeft') {
        setActiveIndex((current) => (current <= 0 ? items.length - 1 : current - 1));
      }

      if (event.key === 'ArrowRight') {
        setActiveIndex((current) => (current >= items.length - 1 ? 0 : current + 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, items.length, setActiveIndex]);

  if (!activeMedia) return null;

  const previous = () => {
    setActiveIndex((current) => (current <= 0 ? items.length - 1 : current - 1));
  };

  const next = () => {
    setActiveIndex((current) => (current >= items.length - 1 ? 0 : current + 1));
  };

  return (
    <>
      <button
        type="button"
        className="property-gallery-zoom-trigger"
        aria-label="Xem ảnh lớn"
        onClick={() => setOpen(true)}
      >
        <ZoomIn size={20} />
      </button>

      {open
        ? createPortal(
          <div className="property-gallery-lightbox" role="dialog" aria-modal="true" aria-label="Xem ảnh bất động sản">
            <button
              type="button"
              className="property-gallery-lightbox__close"
              aria-label="Đóng ảnh lớn"
              onClick={() => setOpen(false)}
            >
              <X size={25} />
            </button>

            <div className="property-gallery-lightbox__stage">
              <ContentImage
                media={activeMedia}
                alt={`${title || 'Bất động sản'} - ảnh ${activeIndex + 1}`}
              />
            </div>

            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  className="property-gallery-lightbox__previous"
                  aria-label="Ảnh trước"
                  onClick={previous}
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  className="property-gallery-lightbox__next"
                  aria-label="Ảnh tiếp theo"
                  onClick={next}
                >
                  <ChevronRight size={28} />
                </button>
              </>
            ) : null}

            <span className="property-gallery-lightbox__count">
              {activeIndex + 1} / {items.length}
            </span>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
