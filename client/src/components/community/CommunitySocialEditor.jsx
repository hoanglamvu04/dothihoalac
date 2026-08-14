import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ImagePlus,
  LoaderCircle,
  X,
} from 'lucide-react';

import {
  api,
  apiErrorMessage,
} from '../../api/http';

import '../forms/RichTextEditor.css';
import './CommunitySocialEditor.css';

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

function mediaKey(item, index = 0) {
  return String(item?.id || item?.src || `community-media-${index}`);
}

function createMediaItem(media, fallbackAlt) {
  const id = String(media?._id || media?.id || '');
  const src = String(media?.secureUrl || media?.url || '');
  const alt = String(media?.altText || fallbackAlt || '').trim() || 'Ảnh bài viết cộng đồng';
  const width = Number(media?.width);
  const height = Number(media?.height);
  const widthAttribute =
    Number.isFinite(width) && width > 0
      ? ` width="${width}"`
      : '';
  const heightAttribute =
    Number.isFinite(height) && height > 0
      ? ` height="${height}"`
      : '';

  return {
    id,
    src,
    alt,
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
    html: `
      <figure class="article-figure community-social-editor__figure" data-media-id="${escapeHtml(id)}">
        <img
          src="${escapeHtml(src)}"
          alt="${escapeHtml(alt)}"
          data-media-id="${escapeHtml(id)}"
          loading="lazy"
          decoding="async"${widthAttribute}${heightAttribute}
        />
      </figure>
    `.trim(),
  };
}

function parseEditorValue(value = '') {
  const html = String(value || '');

  if (!html || typeof document === 'undefined') {
    return {
      textHtml: normalizeHtml(html),
      mediaItems: [],
    };
  }

  const template = document.createElement('template');
  template.innerHTML = html;

  const mediaItems = [];
  const figures = Array.from(template.content.querySelectorAll('figure'));

  figures.forEach((figure) => {
    const image = figure.querySelector('img[data-media-id], img');
    const id = String(
      figure.getAttribute('data-media-id') ||
        image?.getAttribute('data-media-id') ||
        '',
    ).trim();
    const src = String(image?.getAttribute('src') || '').trim();

    if (!id || !src || !image) {
      return;
    }

    const nextSibling = figure.nextElementSibling;

    mediaItems.push({
      id,
      src,
      alt: String(image.getAttribute('alt') || '').trim() || 'Ảnh bài viết cộng đồng',
      width: Number(image.getAttribute('width')) || null,
      height: Number(image.getAttribute('height')) || null,
      html: figure.outerHTML,
    });

    figure.remove();

    if (
      nextSibling?.tagName === 'P' &&
      ['', '<br>', '<br/>', '<br />'].includes(
        String(nextSibling.innerHTML || '')
          .trim()
          .toLowerCase(),
      )
    ) {
      nextSibling.remove();
    }
  });

  return {
    textHtml: normalizeHtml(template.innerHTML),
    mediaItems,
  };
}

function combineEditorHtml(textHtml, mediaItems = []) {
  return [
    normalizeHtml(textHtml),
    ...mediaItems.map((item) => String(item?.html || '').trim()),
  ]
    .filter(Boolean)
    .join('\n');
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
  const mediaItemsRef = useRef([]);
  const lastEmittedHtmlRef = useRef('');

  const [mediaItems, setMediaItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
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

  const emitCombinedChange = useCallback(
    (nextItems = mediaItemsRef.current) => {
      const editor = editorRef.current;

      if (!editor) return;

      const html = combineEditorHtml(editor.innerHTML, nextItems);
      lastEmittedHtmlRef.current = html;
      onChange?.(html);
      saveSelection();
    },
    [onChange, saveSelection],
  );

  const insertHtmlAtCursor = useCallback(
    (html) => {
      const editor = editorRef.current;

      if (!editor || disabled) return;

      restoreSelection();

      const selection = window.getSelection();

      if (!selection || !selection.rangeCount) {
        editor.insertAdjacentHTML('beforeend', html);
        placeCaretAtEnd();
        emitCombinedChange();
        return;
      }

      const range = selection.getRangeAt(0);

      if (!editor.contains(range.commonAncestorContainer)) {
        editor.insertAdjacentHTML('beforeend', html);
        placeCaretAtEnd();
        emitCombinedChange();
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

      emitCombinedChange();
    },
    [
      disabled,
      emitCombinedChange,
      placeCaretAtEnd,
      restoreSelection,
    ],
  );

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) return;

    const nextHtml = String(value || '');

    if (nextHtml === lastEmittedHtmlRef.current) {
      return;
    }

    const parsed = parseEditorValue(nextHtml);

    if (editor.innerHTML !== parsed.textHtml) {
      editor.innerHTML = parsed.textHtml;
    }

    mediaItemsRef.current = parsed.mediaItems;
    setMediaItems(parsed.mediaItems);
  }, [value]);

  const validateFiles = useCallback(
    (files) => {
      const selected = Array.from(files || []).filter(Boolean);

      if (!selected.length) {
        return 'Chưa chọn ảnh.';
      }

      if (mediaItemsRef.current.length + selected.length > maxImages) {
        return `Mỗi bài chỉ được chèn tối đa ${maxImages} ảnh.`;
      }

      for (const file of selected) {
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
          return `Ảnh “${file.name}” không đúng định dạng. Chỉ hỗ trợ JPG, PNG, WEBP, GIF hoặc AVIF.`;
        }

        if (file.size > maxImageSizeMb * 1024 * 1024) {
          return `Ảnh “${file.name}” vượt quá ${maxImageSizeMb} MB.`;
        }
      }

      return '';
    },
    [maxImageSizeMb, maxImages],
  );

  const uploadInlineImages = useCallback(
    async (files) => {
      const selected = Array.from(files || []).filter(Boolean);
      const validationMessage = validateFiles(selected);

      if (validationMessage) {
        setError(validationMessage);
        return;
      }

      saveSelection();
      setError('');
      setUploading(true);
      setUploadProgress(0);

      let nextItems = [...mediaItemsRef.current];

      try {
        for (let index = 0; index < selected.length; index += 1) {
          const file = selected[index];
          const formData = new FormData();
          const generatedAlt = fileNameToAlt(file.name);

          setUploadLabel(
            selected.length > 1
              ? `Đang tải ${index + 1}/${selected.length}`
              : 'Đang tải ảnh',
          );

          formData.append('image', file);
          formData.append('folder', uploadFolder);
          formData.append('altText', generatedAlt);

          const response = await api.post('/media/images', formData, {
            onUploadProgress(progressEvent) {
              const fileRatio = progressEvent.total
                ? progressEvent.loaded / progressEvent.total
                : 0;
              const overallRatio =
                (index + fileRatio) / selected.length;

              setUploadProgress(
                Math.max(1, Math.round(overallRatio * 100)),
              );
            },
          });

          const media = response?.data?.data;
          const item = createMediaItem(media, generatedAlt);

          if (!item.id || !item.src) {
            throw new Error(
              'API upload ảnh không trả về Media ID hoặc URL.',
            );
          }

          nextItems = [...nextItems, item];
          mediaItemsRef.current = nextItems;
          setMediaItems(nextItems);
          emitCombinedChange(nextItems);
        }

        setUploadProgress(100);
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
        setUploadLabel('');

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [
      emitCombinedChange,
      saveSelection,
      uploadFolder,
      validateFiles,
    ],
  );

  const removeMedia = useCallback(
    (id) => {
      if (disabled || uploading) return;

      const nextItems = mediaItemsRef.current.filter(
        (item) => String(item.id) !== String(id),
      );

      mediaItemsRef.current = nextItems;
      setMediaItems(nextItems);
      setError('');
      emitCombinedChange(nextItems);
    },
    [disabled, emitCombinedChange, uploading],
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
      const imageFiles = clipboardItems
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (imageFiles.length) {
        event.preventDefault();
        saveSelection();
        void uploadInlineImages(imageFiles);
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
      uploadInlineImages,
    ],
  );

  const handleDrop = useCallback(
    (event) => {
      if (disabled) return;

      const imageFiles = Array.from(
        event.dataTransfer?.files || [],
      ).filter((file) => file.type.startsWith('image/'));

      if (!imageFiles.length) return;

      event.preventDefault();
      saveSelection();
      void uploadInlineImages(imageFiles);
    },
    [disabled, saveSelection, uploadInlineImages],
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
        onInput={() => emitCombinedChange()}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onFocus={saveSelection}
        onPaste={handlePaste}
        onDrop={handleDrop}
      />

      {mediaItems.length ? (
        <div
          className="community-social-editor__media-strip"
          aria-label={`${mediaItems.length} ảnh đã chọn`}
        >
          {mediaItems.map((item, index) => (
            <figure
              className="community-social-editor__media-card"
              key={mediaKey(item, index)}
            >
              <img
                src={item.src}
                alt={item.alt}
                draggable="false"
              />

              <button
                type="button"
                aria-label={`Xóa ảnh ${index + 1}`}
                title="Xóa ảnh"
                disabled={disabled || uploading}
                onClick={() => removeMedia(item.id)}
              >
                <X size={16} />
              </button>

              <span>{index + 1}</span>
            </figure>
          ))}
        </div>
      ) : null}

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
            {uploadLabel || 'Đang tải ảnh'}
            {uploadProgress ? ` · ${uploadProgress}%` : ''}
          </span>
        ) : mediaItems.length ? (
          <span className="community-social-editor__media-count">
            {mediaItems.length}/{maxImages} ảnh · kéo ngang để xem
          </span>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        hidden
        onChange={(event) => {
          const files = event.target.files;

          if (files?.length) {
            void uploadInlineImages(files);
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
