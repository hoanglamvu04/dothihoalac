import {
  useRef,
  useState,
} from 'react';
import {
  ImagePlus,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import Button from '../common/Button';
import FormField from '../common/FormField';
import { mediaApi } from '../../api/media.api';
import { mediaUrl } from '../../utils/media';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export default function MediaUploader({
  value,
  onChange,
  label = 'Ảnh đại diện',
  required = false,
}) {
  const [loading, setLoading] =
    useState(false);

  const [altText, setAltText] =
    useState(value?.altText || '');

  const toast = useToast();
  const replaceInputRef = useRef(null);

  const upload = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    if (!allowedImageTypes.has(file.type)) {
      toast.error(
        'Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc AVIF.',
      );
      return;
    }

    setLoading(true);

    try {
      const media =
        await mediaApi.uploadImage(
          file,
          altText.trim(),
        );

      if (!media) {
        throw new Error(
          'Server không trả về dữ liệu ảnh.',
        );
      }

      onChange(media);
      toast.success('Đã tải ảnh lên.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (value?._id) {
      try {
        await mediaApi.remove(value._id);
      } catch {
        // Có thể ảnh đang được sử dụng.
      }
    }

    onChange(null);
  };

  const previewUrl = mediaUrl(value);

  return (
    <FormField
      label={label}
      required={required}
      hint="JPG, PNG, WebP hoặc AVIF. Server sẽ chuyển ảnh sang WebP."
    >
      <div className="media-uploader">
        {value && previewUrl ? (
          <div className="media-uploader__preview">
            <img
              src={previewUrl}
              alt={
                value.altText ||
                altText ||
                'Ảnh đã tải lên'
              }
            />

            <button
              type="button"
              onClick={remove}
              aria-label="Xóa ảnh"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : (
          <label className="media-uploader__drop">
            {loading ? (
              <span className="loading-spinner" />
            ) : (
              <UploadCloud size={30} />
            )}

            <strong>
              {loading
                ? 'Đang tải ảnh...'
                : 'Chọn ảnh từ máy'}
            </strong>

            <small>
              Nhấn để tải một ảnh lên
            </small>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
              onChange={upload}
              disabled={loading}
            />
          </label>
        )}

        <div className="media-uploader__alt">
          <ImagePlus size={17} />

          <input
            value={altText}
            onChange={(event) =>
              setAltText(event.target.value)
            }
            placeholder="Mô tả ảnh cho SEO và trợ năng"
            maxLength={300}
          />
        </div>

        {value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() =>
              replaceInputRef.current?.click()
            }
          >
            Thay ảnh
          </Button>
        ) : null}

        <input
          ref={replaceInputRef}
          className="visually-hidden"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
          onChange={upload}
          disabled={loading}
        />
      </div>
    </FormField>
  );
}