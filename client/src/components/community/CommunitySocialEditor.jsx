import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ImagePlus,
  X,
} from 'lucide-react';

import { api } from '../../api/http';

import '../forms/RichTextEditor.css';
import './CommunitySocialEditor.css';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const TEMP_MEDIA_PREFIX = 'community-temp-';
const temporaryMediaRegistry = new Map();

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

function temporaryMediaId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${TEMP_MEDIA_PREFIX}${crypto.randomUUID()}`;
  }

  return `${TEMP_MEDIA_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isTemporaryMediaId(id = '') {
  return String(id).startsWith(TEMP_MEDIA_PREFIX);
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
    temporary: false,
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

function createTemporaryMediaItem(file) {
  const id = temporaryMediaId();
  const src = URL.createObjectURL(file);
  const alt = fileNameToAlt(file.name);

  temporaryMediaRegistry.set(id, {
    file,
    src,
    alt,
  });

  return {
    id,
    src,
    alt,
    width: null,
    height: null,
    temporary: true,
    html: `
      <figure
        class="article-figure community-social-editor__figure"
        data-media-id="${escapeHtml(id)}"
        data-temporary-media="true"
      >
        <img
          src="${escapeHtml(src)}"
          alt="${escapeHtml(alt)}"
          data-media-id="${escapeHtml(id)}"
          loading="lazy"
          decoding="async"
        />
      </figure>
    `.trim(),
  };
}

function figureMediaId(figure) {
  const image = figure?.querySelector?.('img[data-media-id], img');
  return String(
    figure?.getAttribute?.('data-media-id') ||
      image?.getAttribute?.('data-media-id') ||
      '',
  ).trim();
}

function isTemporaryFigure(figure) {
  const id = figureMediaId(figure);
  return (
    figure?.getAttribute?.('data-temporary-media') === 'true' ||
    isTemporaryMediaId(id)
  );
}

function removeEmptySiblingAfterFigure(figure) {
  const nextSibling = figure?.nextElementSibling;

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
}

function htmlTemplate(value = '') {
  if (typeof document === 'undefined') return null;
  const template = document.createElement('template');
  template.innerHTML = String(value || '');
  return template;
}

function parseEditorValue(value = '') {
  const html = String(value || '');

  if (!html || typeof document === 'undefined') {
    return {
      textHtml: normalizeHtml(html),
      mediaItems: [],
    };
  }

  const template = htmlTemplate(html);
  const mediaItems = [];
  const figures = Array.from(template.content.querySelectorAll('figure'));

  figures.forEach((figure) => {
    const image = figure.querySelector('img[data-media-id], img');
    const id = figureMediaId(figure);
    const src = String(image?.getAttribute('src') || '').trim();

    if (!id || !src || !image) {
      return;
    }

    mediaItems.push({
      id,
      src,
      alt: String(image.getAttribute('alt') || '').trim() || 'Ảnh bài viết cộng đồng',
      width: Number(image.getAttribute('width')) || null,
      height: Number(image.getAttribute('height')) || null,
      temporary: isTemporaryFigure(figure),
      html: figure.outerHTML,
    });

    removeEmptySiblingAfterFigure(figure);
    figure.remove();
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

function releaseTemporaryMediaId(id) {
  const entry = temporaryMediaRegistry.get(String(id));
  if (!entry) return;

  if (entry.src) {
    URL.revokeObjectURL(entry.src);
  }

  temporaryMediaRegistry.delete(String(id));
}

export function stripTemporaryCommunityMedia(value = '') {
  const template = htmlTemplate(value);
  if (!template) return String(value || '');

  Array.from(template.content.querySelectorAll('figure')).forEach((figure) => {
    if (!isTemporaryFigure(figure)) return;
    removeEmptySiblingAfterFigure(figure);
    figure.remove();
  });

  return normalizeHtml(template.innerHTML);
}

export async function persistTemporaryCommunityMedia(
  value = '',
  {
    uploadFolder = 'community/inline',
    onProgress,
  } = {},
) {
  const template = htmlTemplate(value);

  if (!template) {
    return { html: String(value || ''), uploads: [] };
  }

  const figures = Array.from(template.content.querySelectorAll('figure'))
    .filter(isTemporaryFigure);

  if (!figures.length) {
    return { html: normalizeHtml(template.innerHTML), uploads: [] };
  }

  const uploads = [];

  try {
    for (let index = 0; index < figures.length; index += 1) {
      const figure = figures[index];
      const tempId = figureMediaId(figure);
      const entry = temporaryMediaRegistry.get(tempId);

      if (!entry?.file) {
        throw new Error(
          'Ảnh tạm không còn trong phiên trình duyệt. Hãy chọn hoặc dán lại ảnh trước khi đăng.',
        );
      }

      const formData = new FormData();
      formData.append('image', entry.file);
      formData.append('folder', uploadFolder);
      formData.append('altText', entry.alt);

      const response = await api.post('/media/images', formData, {
        onUploadProgress(progressEvent) {
          const fileRatio = progressEvent.total
            ? progressEvent.loaded / progressEvent.total
            : 0;
          const overallRatio = (index + fileRatio) / figures.length;
          onProgress?.({
            current: index + 1,
            total: figures.length,
            percent: Math.max(1, Math.round(overallRatio * 100)),
          });
        },
      });

      const media = response?.data?.data;
      const item = createMediaItem(media, entry.alt);

      if (!item.id || !item.src) {
        throw new Error('API upload ảnh không trả về Media ID hoặc URL.');
      }

      const replacement = htmlTemplate(item.html)?.content.firstElementChild;
      if (!replacement) {
        throw new Error('Không thể chuẩn hóa ảnh sau khi tải lên.');
      }

      figure.replaceWith(replacement);
      uploads.push({
        temporaryId: tempId,
        mediaId: item.id,
      });
    }

    onProgress?.({
      current: figures.length,
      total: figures.length,
      percent: 100,
    });

    return {
      html: normalizeHtml(template.innerHTML),
      uploads,
    };
  } catch (error) {
    await Promise.allSettled(
      uploads.map((item) => api.delete(`/media/${item.mediaId}`)),
    );
    throw error;
  }
}

export function releaseTemporaryCommunityMedia(uploads = []) {
  uploads.forEach((item) => {
    releaseTemporaryMediaId(item?.temporaryId);
  });
}

export async function rollbackTemporaryCommunityMedia(uploads = []) {
  await Promise.allSettled(
    uploads
      .filter((item) => item?.mediaId)
      .map((item) => api.delete(`/media/${item.mediaId}`)),
  );
}

export default function CommunitySocialEditor({
  value = '',
  onChange,
  placeholder = 'Có gì mới?',
  disabled = false,
  maxImages = 12,
  maxImageSizeMb = 10,
  className = '',
}) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const mediaItemsRef = useRef([]);
  const lastEmittedHtmlRef = useRef('');

  const [mediaItems, setMediaItems] = useState([]);
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

  useEffect(
    () => () => {
      mediaItemsRef.current.forEach((item) => {
        if (item.temporary) releaseTemporaryMediaId(item.id);
      });
    },
    [],
  );

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

  const stageInlineImages = useCallback(
    (files) => {
      const selected = Array.from(files || []).filter(Boolean);
      const validationMessage = validateFiles(selected);

      if (validationMessage) {
        setError(validationMessage);
        return;
      }

      saveSelection();
      setError('');

      const stagedItems = selected.map(createTemporaryMediaItem);
      const nextItems = [...mediaItemsRef.current, ...stagedItems];

      mediaItemsRef.current = nextItems;
      setMediaItems(nextItems);
      emitCombinedChange(nextItems);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [emitCombinedChange, saveSelection, validateFiles],
  );

  const removeMedia = useCallback(
    (id) => {
      if (disabled) return;

      const removed = mediaItemsRef.current.find(
        (item) => String(item.id) === String(id),
      );
      const nextItems = mediaItemsRef.current.filter(
        (item) => String(item.id) !== String(id),
      );

      if (removed?.temporary) {
        releaseTemporaryMediaId(removed.id);
      }

      mediaItemsRef.current = nextItems;
      setMediaItems(nextItems);
      setError('');
      emitCombinedChange(nextItems);
    },
    [disabled, emitCombinedChange],
  );

  const openImagePicker = useCallback(() => {
    if (disabled) return;

    saveSelection();
    setError('');
    fileInputRef.current?.click();
  }, [disabled, saveSelection]);

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
        stageInlineImages(imageFiles);
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
      stageInlineImages,
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
      stageInlineImages(imageFiles);
    },
    [disabled, saveSelection, stageInlineImages],
  );

  const temporaryCount = mediaItems.filter((item) => item.temporary).length;

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
              className={`community-social-editor__media-card${item.temporary ? ' is-temporary' : ''}`}
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
                disabled={disabled}
                onClick={() => removeMedia(item.id)}
              >
                <X size={14} />
              </button>

              <span>{item.temporary ? 'Tạm' : index + 1}</span>
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
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              openImagePicker();
            }}
          >
            <ImagePlus size={18} />
          </button>
        </div>

        {mediaItems.length ? (
          <span className="community-social-editor__media-count">
            {mediaItems.length}/{maxImages} ảnh
            {temporaryCount
              ? ` · ${temporaryCount} ảnh tạm, chỉ tải lên khi đăng`
              : ''}
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
            stageInlineImages(files);
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
