import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ImagePlus,
  LoaderCircle,
} from 'lucide-react';

import {
  api,
  apiErrorMessage,
} from '../../api/http';

import '../forms/RichTextEditor.css';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

function normalizeHtml(value = '') {
  const html = String(value || '').trim();
  const compact = html.replace(/\s+/g, '').toLowerCase();

  if (
    !compact ||
    compact === '<br>' ||
    compact === '<p><br></p>' ||
    compact === '<div><br></div>'
  ) {
    return '';
  }

  return html;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fileNameToAlt(fileName = '') {
  return String(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Ảnh bài viết cộng đồng';
}

export default function CommunitySocialEditor({
  value = '',
  onChange,
  placeholder = 'Có gì mới?',
  disabled = false,
  maxImages = 12,
  maxImageSizeMb = 10,
  uploadFolder = 'community/inline',
  className = '',
}) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const lastEmittedHtmlRef = useRef('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const placeCaretAtEnd = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection) return;

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const savedRange = savedRangeRef.current;

    if (!editor || !selection) return;

    editor.focus();

    if (
      savedRange &&
      editor.contains(savedRange.commonAncestorContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return;
    }

    placeCaretAtEnd();
  }, [placeCaretAtEnd]);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) return;

    const html = normalizeHtml(editor.innerHTML);
    lastEmittedHtmlRef.current = html;
    onChange?.(html);
    saveSelection();
  }, [onChange, saveSelection]);

  const insertHtmlAtCursor = useCallback(
    (html) => {
      const editor = editorRef.current;

      if (!editor || disabled) return;

      restoreSelection();

      const selection = window.getSelection();

      if (!selection || !selection.rangeCount) {
        editor.insertAdjacentHTML('beforeend', html);
        placeCaretAtEnd();
        emitChange();
        return;
      }

      const range = selection.getRangeAt(0);

      if (!editor.contains(range.commonAncestorContainer)) {
        editor.insertAdjacentHTML('beforeend', html);
        placeCaretAtEnd();
        emitChange();
        return;
      }

      range.deleteContents();

      const fragment = range.createContextualFragment(html);
      const lastNode = fragment.lastChild;

      range.insertNode(fragment);

      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRangeRef.current = range.cloneRange();
      }

      emitChange();
    },
    [
      disabled,
      emitChange,
      placeCaretAtEnd,
      restoreSelection,
    ],
  );

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) return;

    const nextHtml = String(value || '');

    if (
      nextHtml !== lastEmittedHtmlRef.current &&
      editor.innerHTML !== nextHtml
    ) {
      editor.innerHTML = nextHtml;
    }
  }, [value]);

  const validateImageFile = useCallback(
    (file) => {
      if (!file) return 'Chưa chọn ảnh.';

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF hoặc AVIF.';
      }

      if (file.size > maxImageSizeMb * 1024 * 1024) {
        return `Ảnh không được vượt quá ${maxImageSizeMb} MB.`;
      }

      const imageCount =
        editorRef.current?.querySelectorAll('[data-media-id] img')
          .length || 0;

      if (imageCount >= maxImages) {
        return `Mỗi bài chỉ được chèn tối đa ${maxImages} ảnh.`;
      }

      return '';
    },
    [maxImageSizeMb, maxImages],
  );

  const uploadInlineImage = useCallback(
    async (file) => {
      const validationMessage = validateImageFile(file);

      if (validationMessage) {
        setError(validationMessage);
        return;
      }

      saveSelection();
      setError('');
      setUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        const generatedAlt = fileNameToAlt(file.name);

        formData.append('image', file);
        formData.append('folder', uploadFolder);
        formData.append('altText', generatedAlt);

        const response = await api.post('/media/images', formData, {
          onUploadProgress(progressEvent) {
            if (!progressEvent.total) return;

            setUploadProgress(
              Math.round(
                (progressEvent.loaded * 100) /
                  progressEvent.total,
              ),
            );
          },
        });

        const media = response?.data?.data;
        const mediaId = media?._id || media?.id;
        const mediaUrl = media?.secureUrl || media?.url;

        if (!mediaId || !mediaUrl) {
          throw new Error(
            'API upload ảnh không trả về Media ID hoặc URL.',
          );
        }

        const width = Number(media.width);
        const height = Number(media.height);
        const widthAttribute =
          Number.isFinite(width) && width > 0
            ? ` width="${width}"`
            : '';
        const heightAttribute =
          Number.isFinite(height) && height > 0
            ? ` height="${height}"`
            : '';

        insertHtmlAtCursor(`
          <figure class="article-figure community-social-editor__figure" data-media-id="${escapeHtml(mediaId)}">
            <img
              src="${escapeHtml(mediaUrl)}"
              alt="${escapeHtml(String(media?.altText || '').trim() || generatedAlt)}"
              data-media-id="${escapeHtml(mediaId)}"
              loading="lazy"
              decoding="async"${widthAttribute}${heightAttribute}
            />
          </figure>
          <p><br></p>
        `);
      } catch (uploadError) {
        setError(
          apiErrorMessage(
            uploadError,
            'Không thể tải ảnh lên. Vui lòng thử lại.',
          ),
        );
      } finally {
        setUploading(false);
        setUploadProgress(0);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [
      insertHtmlAtCursor,
      saveSelection,
      uploadFolder,
      validateImageFile,
    ],
  );

  const openImagePicker = useCallback(() => {
    if (disabled || uploading) return;

    saveSelection();
    setError('');
    fileInputRef.current?.click();
  }, [disabled, saveSelection, uploading]);

  const handlePaste = useCallback(
    (event) => {
      if (disabled) return;

      const clipboardItems = Array.from(
        event.clipboardData?.items || [],
      );
      const imageItem = clipboardItems.find((item) =>
        item.type.startsWith('image/'),
      );

      if (imageItem) {
        event.preventDefault();
        const file = imageItem.getAsFile();

        if (file) {
          saveSelection();
          void uploadInlineImage(file);
        }

        return;
      }

      const text = event.clipboardData?.getData('text/plain');

      if (typeof text !== 'string') return;

      event.preventDefault();
      insertHtmlAtCursor(
        escapeHtml(text).replace(/\r?\n/g, '<br>'),
      );
    },
    [
      disabled,
      insertHtmlAtCursor,
      saveSelection,
      uploadInlineImage,
    ],
  );

  const handleDrop = useCallback(
    (event) => {
      if (disabled) return;

      const imageFile = Array.from(
        event.dataTransfer?.files || [],
      ).find((file) => file.type.startsWith('image/'));

      if (!imageFile) return;

      event.preventDefault();
      saveSelection();
      void uploadInlineImage(imageFile);
    },
    [disabled, saveSelection, uploadInlineImage],
  );

  return (
    <div
      className={`rte community-social-editor ${className}`.trim()}
    >
      <div
        ref={editorRef}
        className="rte-content"
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Nội dung bài viết cộng đồng"
        data-placeholder={placeholder}
        onInput={emitChange}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onFocus={saveSelection}
        onPaste={handlePaste}
        onDrop={handleDrop}
      />

      <div
        className="rte-toolbar"
        role="toolbar"
        aria-label="Công cụ bài viết cộng đồng"
      >
        <div className="rte-toolbar__group">
          <button
            type="button"
            className="rte-tool"
            aria-label="Chèn ảnh vào nội dung"
            title="Thêm ảnh"
            disabled={disabled || uploading}
            onMouseDown={(event) => {
              event.preventDefault();
              openImagePicker();
            }}
          >
            {uploading ? (
              <LoaderCircle
                size={17}
                className="rte-spin"
              />
            ) : (
              <ImagePlus size={18} />
            )}
          </button>
        </div>

        {uploading ? (
          <span className="rte-uploading">
            Đang tải ảnh
            {uploadProgress ? ` ${uploadProgress}%` : ''}
          </span>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void uploadInlineImage(file);
          }
        }}
      />

      {error ? (
        <div className="rte-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
