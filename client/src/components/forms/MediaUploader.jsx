import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileText,
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

const allowedDocumentTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const allowedDocumentExtensions = new Set([
  'pdf',
  'doc',
  'docx',
]);

const MAX_DOCUMENTS = 5;
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;

const documentUploaderStyles = `
  .media-uploader__documents {
    display: grid;
    gap: 12px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(26, 74, 46, 0.1);
  }

  .media-uploader__documents-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .media-uploader__documents-heading > div {
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }

  .media-uploader__documents-heading svg {
    flex: 0 0 auto;
    margin-top: 1px;
    color: #19874a;
  }

  .media-uploader__documents-heading strong,
  .media-uploader__documents-heading small {
    display: block;
  }

  .media-uploader__documents-heading strong {
    color: #213b2d;
    font-size: 13px;
    font-weight: 750;
  }

  .media-uploader__documents-heading small {
    margin-top: 3px;
    color: #738078;
    font-size: 11px;
    line-height: 1.45;
  }

  .media-uploader__document-drop {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 10px 14px;
    gap: 9px;
    border: 1px dashed rgba(25, 135, 74, 0.32);
    border-radius: 10px;
    color: #176d40;
    background: rgba(239, 248, 243, 0.72);
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
    transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
  }

  .media-uploader__document-drop:hover {
    border-color: rgba(25, 135, 74, 0.58);
    background: rgba(230, 246, 236, 0.92);
    transform: translateY(-1px);
  }

  .media-uploader__document-drop.is-disabled {
    opacity: 0.58;
    cursor: not-allowed;
    transform: none;
  }

  .media-uploader__document-drop input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .media-uploader__document-list {
    display: grid;
    gap: 8px;
  }

  .media-uploader__document-item {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    min-height: 48px;
    padding: 8px 10px;
    gap: 10px;
    border: 1px solid rgba(27, 68, 43, 0.1);
    border-radius: 10px;
    background: #fff;
  }

  .media-uploader__document-item > svg {
    color: #19874a;
  }

  .media-uploader__document-copy {
    min-width: 0;
  }

  .media-uploader__document-copy strong,
  .media-uploader__document-copy small {
    display: block;
  }

  .media-uploader__document-copy strong {
    overflow: hidden;
    color: #25382d;
    font-size: 12px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .media-uploader__document-copy small {
    margin-top: 2px;
    color: #7a867f;
    font-size: 10px;
    text-transform: uppercase;
  }

  .media-uploader__document-remove {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    color: #9b3030;
    background: transparent;
    cursor: pointer;
  }

  .media-uploader__document-remove:hover {
    background: rgba(155, 48, 48, 0.08);
  }
`;

function fileExtension(filename = '') {
  const match = String(filename || '')
    .trim()
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);

  return match?.[1] || '';
}

function isAllowedDocument(file) {
  if (allowedDocumentTypes.has(file?.type)) {
    return true;
  }

  const extension = fileExtension(file?.name);
  const mimeType = String(file?.type || '').trim().toLowerCase();

  return (
    allowedDocumentExtensions.has(extension) &&
    (!mimeType || mimeType === 'application/octet-stream')
  );
}

function normalizeItems(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}

function mediaId(item) {
  return String(item?._id || item?.id || '');
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);

  if (!value) {
    return '';
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaUploader({
  value,
  onChange,
  label = 'Ảnh đại diện',
  required = false,
}) {
  const location = useLocation();
  const allowDocuments =
    /^\/gui-tin(?:\/|$)/.test(location.pathname);

  const items = normalizeItems(value);
  const imageMedia =
    items.find((item) => item?.resourceType !== 'raw') || null;
  const documents = items.filter(
    (item) => item?.resourceType === 'raw',
  );

  const [imageLoading, setImageLoading] =
    useState(false);

  const [documentLoading, setDocumentLoading] =
    useState(false);

  const [altText, setAltText] =
    useState(imageMedia?.altText || '');

  const toast = useToast();
  const replaceInputRef = useRef(null);

  useEffect(() => {
    setAltText(imageMedia?.altText || '');
  }, [imageMedia?._id, imageMedia?.id]);

  const emitItems = (nextItems) => {
    const compact = nextItems.filter(Boolean);

    if (allowDocuments) {
      onChange(compact.length ? compact : null);
      return;
    }

    onChange(
      compact.find((item) => item?.resourceType !== 'raw') || null,
    );
  };

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

    setImageLoading(true);

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

      emitItems([
        media,
        ...documents,
      ]);
      toast.success('Đã tải ảnh lên.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setImageLoading(false);
    }
  };

  const uploadDocument = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    if (documents.length >= MAX_DOCUMENTS) {
      toast.error(
        `Chỉ được đính kèm tối đa ${MAX_DOCUMENTS} tài liệu.`,
      );
      return;
    }

    if (!isAllowedDocument(file)) {
      toast.error(
        'Chỉ hỗ trợ tài liệu PDF, DOC hoặc DOCX.',
      );
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      toast.error(
        'Tài liệu không được vượt quá 25 MB.',
      );
      return;
    }

    setDocumentLoading(true);

    try {
      const media =
        await mediaApi.uploadDocument(file);

      if (!media) {
        throw new Error(
          'Server không trả về dữ liệu tài liệu.',
        );
      }

      emitItems([
        ...(imageMedia ? [imageMedia] : []),
        ...documents,
        media,
      ]);

      toast.success(
        'Đã đính kèm tài liệu.',
      );
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setDocumentLoading(false);
    }
  };

  const removeItem = async (item) => {
    const targetId = mediaId(item);

    if (targetId) {
      try {
        await mediaApi.remove(targetId);
      } catch {
        // Có thể tệp đang được sử dụng.
      }
    }

    emitItems(
      items.filter((candidate) => {
        if (targetId) {
          return mediaId(candidate) !== targetId;
        }

        return candidate !== item;
      }),
    );
  };

  const previewUrl = mediaUrl(imageMedia);
  const imageBusy = imageLoading || documentLoading;
  const documentsFull =
    documents.length >= MAX_DOCUMENTS;

  return (
    <FormField
      label={
        allowDocuments
          ? 'Ảnh và tài liệu minh họa'
          : label
      }
      required={required}
      hint={
        allowDocuments
          ? 'Ảnh JPG, PNG, WebP, AVIF; tài liệu PDF, DOC hoặc DOCX tối đa 25 MB/tệp.'
          : 'JPG, PNG, WebP hoặc AVIF. Server sẽ chuyển ảnh sang WebP.'
      }
    >
      <style>{documentUploaderStyles}</style>

      <div className="media-uploader">
        {imageMedia && previewUrl ? (
          <div className="media-uploader__preview">
            <img
              src={previewUrl}
              alt={
                imageMedia.altText ||
                altText ||
                'Ảnh đã tải lên'
              }
            />

            <button
              type="button"
              onClick={() => removeItem(imageMedia)}
              aria-label="Xóa ảnh"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : (
          <label className="media-uploader__drop">
            {imageLoading ? (
              <span className="loading-spinner" />
            ) : (
              <UploadCloud size={30} />
            )}

            <strong>
              {imageLoading
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
              disabled={imageBusy}
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

        {imageMedia ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={imageBusy}
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
          disabled={imageBusy}
        />

        {allowDocuments ? (
          <div className="media-uploader__documents">
            <div className="media-uploader__documents-heading">
              <div>
                <FileText size={18} />
                <span>
                  <strong>
                    Tài liệu đính kèm
                  </strong>
                  <small>
                    PDF, DOC, DOCX · tối đa {MAX_DOCUMENTS} tệp
                  </small>
                </span>
              </div>

              <small>
                {documents.length}/{MAX_DOCUMENTS}
              </small>
            </div>

            <label
              className={`media-uploader__document-drop${
                documentLoading || documentsFull
                  ? ' is-disabled'
                  : ''
              }`}
            >
              {documentLoading ? (
                <span className="loading-spinner" />
              ) : (
                <UploadCloud size={18} />
              )}

              <span>
                {documentLoading
                  ? 'Đang tải tài liệu...'
                  : documentsFull
                    ? 'Đã đủ số tài liệu'
                    : 'Chọn PDF, DOC hoặc DOCX'}
              </span>

              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={uploadDocument}
                disabled={
                  documentLoading ||
                  documentsFull ||
                  imageLoading
                }
              />
            </label>

            {documents.length ? (
              <div className="media-uploader__document-list">
                {documents.map((document, index) => (
                  <div
                    key={
                      mediaId(document) ||
                      `${document.originalFilename || 'document'}-${index}`
                    }
                    className="media-uploader__document-item"
                  >
                    <FileText size={20} />

                    <div className="media-uploader__document-copy">
                      <strong>
                        {document.originalFilename ||
                          `Tài liệu ${index + 1}`}
                      </strong>
                      <small>
                        {[
                          String(
                            document.format ||
                              fileExtension(
                                document.originalFilename,
                              ),
                          ).toUpperCase(),
                          formatFileSize(
                            document.fileSize,
                          ),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="media-uploader__document-remove"
                      onClick={() =>
                        removeItem(document)
                      }
                      aria-label={`Xóa ${
                        document.originalFilename ||
                        'tài liệu'
                      }`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </FormField>
  );
}
