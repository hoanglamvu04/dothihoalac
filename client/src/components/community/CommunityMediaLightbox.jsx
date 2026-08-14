import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

import { mediaUrl } from '../../utils/media';

import './CommunityMediaLightbox.css';

function clampIndex(value, length) {
  if (!length) return 0;
  return Math.min(Math.max(Number(value) || 0, 0), length - 1);
}

export default function CommunityMediaLightbox({
  items = [],
  startIndex = 0,
  title = 'Ảnh bài viết cộng đồng',
  authorName = '',
  onClose,
}) {
  const [index, setIndex] = useState(() =>
    clampIndex(startIndex, items.length),
  );

  useEffect(() => {
    setIndex(clampIndex(startIndex, items.length));
  }, [items.length, startIndex]);

  const current = items[index] || null;
  const currentUrl = useMemo(
    () => mediaUrl(current),
    [current],
  );

  const previous = () => {
    setIndex((value) =>
      value <= 0 ? items.length - 1 : value - 1,
    );
  };

  const next = () => {
    setIndex((value) =>
      value >= items.length - 1 ? 0 : value + 1,
    );
  };

  useEffect(() => {
    if (!items.length) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if (items.length <= 1) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [items.length, onClose]);

  if (!items.length || !current || !currentUrl || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="community-media-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh bài viết"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <header className="community-media-lightbox__header">
        <div>
          <strong>{title}</strong>
          {authorName ? <span>{authorName}</span> : null}
        </div>

        <button
          type="button"
          aria-label="Đóng ảnh"
          onClick={onClose}
        >
          <X size={23} />
        </button>
      </header>

      <div className="community-media-lightbox__stage">
        {items.length > 1 ? (
          <button
            type="button"
            className="community-media-lightbox__nav community-media-lightbox__nav--previous"
            aria-label="Ảnh trước"
            onClick={previous}
          >
            <ChevronLeft size={28} />
          </button>
        ) : null}

        <img
          src={currentUrl}
          alt={
            current?.altText ||
            current?.alt ||
            title
          }
          draggable="false"
        />

        {items.length > 1 ? (
          <button
            type="button"
            className="community-media-lightbox__nav community-media-lightbox__nav--next"
            aria-label="Ảnh tiếp theo"
            onClick={next}
          >
            <ChevronRight size={28} />
          </button>
        ) : null}
      </div>

      <footer className="community-media-lightbox__footer">
        <div>
          <strong>
            {index + 1} / {items.length}
          </strong>
          <span>
            {current?.altText || current?.alt || 'Ảnh cộng đồng'}
          </span>
        </div>

        {items.length > 1 ? (
          <div
            className="community-media-lightbox__thumbs"
            aria-label="Danh sách ảnh"
          >
            {items.map((item, itemIndex) => {
              const url = mediaUrl(item);

              if (!url) return null;

              return (
                <button
                  type="button"
                  key={String(item?._id || item?.id || url)}
                  className={itemIndex === index ? 'is-active' : ''}
                  aria-label={`Xem ảnh ${itemIndex + 1}`}
                  aria-current={itemIndex === index ? 'true' : undefined}
                  onClick={() => setIndex(itemIndex)}
                >
                  <img
                    src={url}
                    alt=""
                    draggable="false"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </footer>
    </div>,
    document.body,
  );
}
