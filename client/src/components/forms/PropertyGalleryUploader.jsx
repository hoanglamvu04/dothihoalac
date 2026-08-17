import { useRef, useState } from 'react';
import {
  Check,
  ImagePlus,
  LoaderCircle,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import { mediaApi } from '../../api/media.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { mediaUrl } from '../../utils/media';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

function mediaId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
}

export default function PropertyGalleryUploader({
  value = [],
  onChange,
  max = 20,
}) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const items = Array.isArray(value) ? value.filter(Boolean) : [];

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || loading) return;

    const remaining = Math.max(0, max - items.length);
    if (!remaining) {
      toast.error(`Bạn chỉ có thể tải tối đa ${max} ảnh.`);
      return;
    }

    const selected = files.slice(0, remaining);
    const invalid = selected.find((file) => !ALLOWED_TYPES.has(file.type));

    if (invalid) {
      toast.error('Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc AVIF.');
      return;
    }

    setLoading(true);

    try {
      const uploaded = [];

      for (const file of selected) {
        // Upload tuần tự để tránh tạo quá nhiều request đồng thời khi chọn nhiều ảnh.
        // eslint-disable-next-line no-await-in-loop
        const media = await mediaApi.uploadImage(file, '');
        if (media) uploaded.push(media);
      }

      if (uploaded.length) {
        onChange?.([...items, ...uploaded]);
        toast.success(`Đã tải ${uploaded.length} ảnh lên.`);
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const removeAt = async (index) => {
    const target = items[index];
    const next = items.filter((_, itemIndex) => itemIndex !== index);
    onChange?.(next);

    const id = mediaId(target);
    if (!id || typeof target === 'string') return;

    try {
      await mediaApi.remove(id);
    } catch {
      // Ảnh có thể đang được tham chiếu bởi bản nháp cũ. Việc bỏ khỏi gallery vẫn được giữ.
    }
  };

  const setCover = (index) => {
    if (index === 0) return;
    const next = [...items];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    onChange?.(next);
  };

  return (
    <div className="property-gallery-uploader">
      <button
        type="button"
        className={[
          'property-gallery-uploader__drop',
          dragging ? 'is-dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          uploadFiles(event.dataTransfer.files);
        }}
        disabled={loading || items.length >= max}
      >
        <span>
          {loading ? (
            <LoaderCircle className="is-spinning" size={28} />
          ) : (
            <UploadCloud size={28} />
          )}
        </span>

        <div>
          <strong>
            {loading
              ? 'Đang tải ảnh...'
              : `Kéo thả hoặc chọn ảnh (${items.length}/${max})`}
          </strong>
          <small>JPG, PNG, WebP, AVIF · ảnh đầu tiên là ảnh đại diện</small>
        </div>

        <em>
          <ImagePlus size={17} />
          Chọn ảnh
        </em>
      </button>

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
        onChange={(event) => {
          uploadFiles(event.target.files);
          event.target.value = '';
        }}
        disabled={loading || items.length >= max}
      />

      {items.length ? (
        <div className="property-gallery-uploader__grid">
          {items.map((item, index) => {
            const src = mediaUrl(item);
            const key = mediaId(item) || `${src}-${index}`;

            return (
              <article
                className={[
                  'property-gallery-uploader__item',
                  index === 0 ? 'is-cover' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={key}
              >
                {src ? (
                  <img
                    src={src}
                    alt={item?.altText || `Ảnh bất động sản ${index + 1}`}
                  />
                ) : (
                  <div className="property-gallery-uploader__placeholder">
                    <ImagePlus size={28} />
                  </div>
                )}

                {index === 0 ? (
                  <span className="property-gallery-uploader__cover-badge">
                    <Check size={14} />
                    Ảnh đại diện
                  </span>
                ) : null}

                <div className="property-gallery-uploader__item-actions">
                  {index !== 0 ? (
                    <button
                      type="button"
                      onClick={() => setCover(index)}
                      title="Đặt làm ảnh đại diện"
                      aria-label="Đặt làm ảnh đại diện"
                    >
                      <Star size={16} />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    title="Xóa ảnh"
                    aria-label="Xóa ảnh"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
