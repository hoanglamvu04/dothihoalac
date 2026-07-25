import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  Unlink,
  X,
} from 'lucide-react';

import {
  api,
  apiErrorMessage,
} from '../../api/http';
import './RichTextEditor.css';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

function normalizeEditorHtml(value = '') {
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
    .trim();
}

function safeLink(value = '') {
  const input = String(value || '').trim();

  if (!input) return '';

  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(input)) {
    return input;
  }

  return `https://${input}`;
}

function cleanPastedHtml(value = '') {
  const template = document.createElement('template');
  template.innerHTML = String(value || '');

  template.content
    .querySelectorAll(
      'script, style, iframe, object, embed, video, audio, img, figure, figcaption',
    )
    .forEach((node) => node.remove());

  template.content.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const isSafeHref =
        node.tagName === 'A' &&
        name === 'href' &&
        safeLink(attribute.value);

      if (!isSafeHref) {
        node.removeAttribute(attribute.name);
      }
    });

    if (node.tagName === 'A') {
      const href = safeLink(node.getAttribute('href'));

      if (!href) {
        node.removeAttribute('href');
      } else {
        node.setAttribute('href', href);
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  return template.innerHTML;
}

function ToolButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  onPress,
}) {
  return (
    <button
      type="button"
      className={`rte-tool${active ? ' is-active' : ''}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();

        if (!disabled) {
          onPress?.();
        }
      }}
    >
      <Icon size={17} strokeWidth={2} />
    </button>
  );
}

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Nhập nội dung bài viết...',
  disabled = false,
  maxImages = 20,
  maxImageSizeMb = 10,
  uploadFolder = 'articles/inline',
  className = '',
}) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const lastEmittedHtmlRef = useRef('');
  const editingFigureRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [imageDialog, setImageDialog] = useState(null);
  const [stats, setStats] = useState({
    words: 0,
    characters: 0,
    images: 0,
  });
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    block: 'p',
  });

  const updateStats = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) return;

    const text = String(editor.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();

    setStats({
      words: text ? text.split(' ').filter(Boolean).length : 0,
      characters: text.length,
      images: editor.querySelectorAll('figure[data-media-id] img')
        .length,
    });
  }, []);

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const placeCaretAtEnd = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) return;

    const range = document.createRange();
    const selection = window.getSelection();

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

    if (!editor || !selection) return false;

    editor.focus();

    if (
      savedRange &&
      editor.contains(savedRange.commonAncestorContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return true;
    }

    placeCaretAtEnd();
    return false;
  }, [placeCaretAtEnd]);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) return;

    const html = normalizeEditorHtml(editor.innerHTML);
    lastEmittedHtmlRef.current = html;
    onChange?.(html);
    updateStats();
    saveSelection();
  }, [onChange, saveSelection, updateStats]);

  const refreshFormats = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    if (!editor.contains(range.commonAncestorContainer)) return;

    const block = String(
      document.queryCommandValue('formatBlock') || 'p',
    )
      .toLowerCase()
      .replace(/[<>]/g, '');

    setFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      block,
    });
  }, []);

  const runCommand = useCallback(
    (command, commandValue = null) => {
      if (disabled) return;

      restoreSelection();
      document.execCommand(command, false, commandValue);
      saveSelection();
      emitChange();
      refreshFormats();
    },
    [
      disabled,
      emitChange,
      refreshFormats,
      restoreSelection,
      saveSelection,
    ],
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
    [disabled, emitChange, placeCaretAtEnd, restoreSelection],
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
      updateStats();
    }
  }, [updateStats, value]);

  useEffect(() => {
    const onSelectionChange = () => {
      saveSelection();
      refreshFormats();
    };

    document.addEventListener('selectionchange', onSelectionChange);

    return () => {
      document.removeEventListener(
        'selectionchange',
        onSelectionChange,
      );
    };
  }, [refreshFormats, saveSelection]);

  useEffect(() => {
    if (!imageDialog) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setImageDialog(null);
        setDialogError('');
        editingFigureRef.current = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [imageDialog]);

  const handleLink = useCallback(() => {
    saveSelection();

    const input = window.prompt(
      'Nhập đường dẫn, ví dụ: https://dothihoalac.vn',
    );
    const href = safeLink(input);

    if (!href) return;

    runCommand('createLink', href);

    editorRef.current
      ?.querySelectorAll('a[href]')
      .forEach((anchor) => {
        if (/^https?:\/\//i.test(anchor.getAttribute('href'))) {
          anchor.setAttribute('target', '_blank');
          anchor.setAttribute('rel', 'noopener noreferrer');
        }
      });

    emitChange();
  }, [emitChange, runCommand, saveSelection]);

  const validateImageFile = useCallback(
    (file) => {
      if (!file) {
        return 'Chưa chọn ảnh.';
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF hoặc AVIF.';
      }

      const maxBytes = maxImageSizeMb * 1024 * 1024;

      if (file.size > maxBytes) {
        return `Ảnh không được vượt quá ${maxImageSizeMb} MB.`;
      }

      const imageCount =
        editorRef.current?.querySelectorAll(
          'figure[data-media-id] img',
        ).length || 0;

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
      setDialogError('');
      setUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', uploadFolder);
        formData.append('altText', fileNameToAlt(file.name));

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

        editingFigureRef.current = null;
        setImageDialog({
          mode: 'insert',
          media: {
            ...media,
            _id: mediaId,
            url: mediaUrl,
          },
          alt:
            String(media?.altText || '').trim() ||
            fileNameToAlt(file.name),
          caption: '',
        });
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
    [saveSelection, uploadFolder, validateImageFile],
  );

  const openImagePicker = useCallback(() => {
    if (disabled || uploading) return;

    saveSelection();
    setError('');
    fileInputRef.current?.click();
  }, [disabled, saveSelection, uploading]);

  const closeImageDialog = useCallback(() => {
    setImageDialog(null);
    setDialogError('');
    editingFigureRef.current = null;
  }, []);

  const confirmImageDialog = useCallback(
    (event) => {
      event.preventDefault();

      if (!imageDialog) return;

      const alt = String(imageDialog.alt || '').trim();
      const caption = String(imageDialog.caption || '').trim();

      if (!alt) {
        setDialogError('Vui lòng nhập văn bản thay thế cho ảnh.');
        return;
      }

      if (!caption) {
        setDialogError('Vui lòng nhập chú thích hoặc nguồn ảnh.');
        return;
      }

      if (alt.length > 300) {
        setDialogError('Văn bản thay thế không được vượt quá 300 ký tự.');
        return;
      }

      if (caption.length > 500) {
        setDialogError('Chú thích không được vượt quá 500 ký tự.');
        return;
      }

      if (imageDialog.mode === 'edit') {
        const figure = editingFigureRef.current;
        const image = figure?.querySelector('img');
        let figcaption = figure?.querySelector('figcaption');

        if (!figure || !image) {
          setDialogError('Không tìm thấy ảnh cần chỉnh sửa.');
          return;
        }

        image.setAttribute('alt', alt);
        image.setAttribute('loading', 'lazy');
        image.setAttribute('decoding', 'async');

        if (!figcaption) {
          figcaption = document.createElement('figcaption');
          figure.appendChild(figcaption);
        }

        figcaption.textContent = caption;
        closeImageDialog();
        emitChange();
        return;
      }

      const media = imageDialog.media || {};
      const mediaId = media._id || media.id;
      const mediaUrl = media.secureUrl || media.url;

      if (!mediaId || !mediaUrl) {
        setDialogError('Dữ liệu ảnh tải lên không hợp lệ.');
        return;
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

      const html = `
        <figure class="article-figure" data-media-id="${escapeHtml(mediaId)}">
          <img
            src="${escapeHtml(mediaUrl)}"
            alt="${escapeHtml(alt)}"
            data-media-id="${escapeHtml(mediaId)}"
            loading="lazy"
            decoding="async"${widthAttribute}${heightAttribute}
          />
          <figcaption>${escapeHtml(caption)}</figcaption>
        </figure>
        <p><br></p>
      `;

      closeImageDialog();
      insertHtmlAtCursor(html);
    },
    [
      closeImageDialog,
      emitChange,
      imageDialog,
      insertHtmlAtCursor,
    ],
  );

  const removeEditingImage = useCallback(() => {
    const figure = editingFigureRef.current;

    if (!figure) return;

    const paragraphAfter = figure.nextElementSibling;

    figure.remove();

    if (
      paragraphAfter?.tagName === 'P' &&
      !String(paragraphAfter.textContent || '').trim() &&
      paragraphAfter.querySelector('br')
    ) {
      paragraphAfter.remove();
    }

    closeImageDialog();
    emitChange();
  }, [closeImageDialog, emitChange]);

  const handleEditorDoubleClick = useCallback((event) => {
    const editor = editorRef.current;
    const target = event.target;

    if (!editor || !(target instanceof Element)) return;

    const figure = target.closest('figure[data-media-id]');

    if (!figure || !editor.contains(figure)) return;

    const image = figure.querySelector('img');
    const figcaption = figure.querySelector('figcaption');

    if (!image) return;

    event.preventDefault();
    editingFigureRef.current = figure;

    setDialogError('');
    setImageDialog({
      mode: 'edit',
      media: {
        _id: figure.getAttribute('data-media-id'),
        url: image.getAttribute('src'),
        width: image.getAttribute('width'),
        height: image.getAttribute('height'),
      },
      alt: image.getAttribute('alt') || '',
      caption: figcaption?.textContent?.trim() || '',
    });
  }, []);

  const setCaretFromPoint = useCallback((clientX, clientY) => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection) return;

    let range = null;

    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(clientX, clientY);
    } else if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(
        clientX,
        clientY,
      );

      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }

    if (range && editor.contains(range.startContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

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

      const html = event.clipboardData?.getData('text/html');
      const text = event.clipboardData?.getData('text/plain');

      event.preventDefault();

      if (html) {
        insertHtmlAtCursor(cleanPastedHtml(html));
        return;
      }

      const plainHtml = escapeHtml(text || '').replace(
        /\r?\n/g,
        '<br>',
      );

      insertHtmlAtCursor(plainHtml);
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
      setCaretFromPoint(event.clientX, event.clientY);
      saveSelection();
      void uploadInlineImage(imageFile);
    },
    [
      disabled,
      saveSelection,
      setCaretFromPoint,
      uploadInlineImage,
    ],
  );

  return (
    <div
      className={`rte${disabled ? ' is-disabled' : ''} ${className}`.trim()}
    >
      <div className="rte-toolbar" role="toolbar" aria-label="Công cụ soạn thảo">
        <div className="rte-toolbar__group">
          <ToolButton
            label="Hoàn tác"
            icon={Undo2}
            disabled={disabled}
            onPress={() => runCommand('undo')}
          />
          <ToolButton
            label="Làm lại"
            icon={Redo2}
            disabled={disabled}
            onPress={() => runCommand('redo')}
          />
        </div>

        <span className="rte-toolbar__divider" />

        <div className="rte-toolbar__group">
          <ToolButton
            label="Tiêu đề cấp 2"
            icon={Heading2}
            active={formats.block === 'h2'}
            disabled={disabled}
            onPress={() => runCommand('formatBlock', 'h2')}
          />
          <ToolButton
            label="Tiêu đề cấp 3"
            icon={Heading3}
            active={formats.block === 'h3'}
            disabled={disabled}
            onPress={() => runCommand('formatBlock', 'h3')}
          />
        </div>

        <span className="rte-toolbar__divider" />

        <div className="rte-toolbar__group">
          <ToolButton
            label="In đậm"
            icon={Bold}
            active={formats.bold}
            disabled={disabled}
            onPress={() => runCommand('bold')}
          />
          <ToolButton
            label="In nghiêng"
            icon={Italic}
            active={formats.italic}
            disabled={disabled}
            onPress={() => runCommand('italic')}
          />
          <ToolButton
            label="Gạch chân"
            icon={Underline}
            active={formats.underline}
            disabled={disabled}
            onPress={() => runCommand('underline')}
          />
          <ToolButton
            label="Gạch ngang"
            icon={Strikethrough}
            active={formats.strikeThrough}
            disabled={disabled}
            onPress={() => runCommand('strikeThrough')}
          />
          <ToolButton
            label="Xóa định dạng"
            icon={RemoveFormatting}
            disabled={disabled}
            onPress={() => runCommand('removeFormat')}
          />
        </div>

        <span className="rte-toolbar__divider" />

        <div className="rte-toolbar__group">
          <ToolButton
            label="Danh sách dấu chấm"
            icon={List}
            disabled={disabled}
            onPress={() => runCommand('insertUnorderedList')}
          />
          <ToolButton
            label="Danh sách đánh số"
            icon={ListOrdered}
            disabled={disabled}
            onPress={() => runCommand('insertOrderedList')}
          />
          <ToolButton
            label="Trích dẫn"
            icon={Quote}
            disabled={disabled}
            onPress={() => runCommand('formatBlock', 'blockquote')}
          />
          <ToolButton
            label="Đường phân cách"
            icon={Minus}
            disabled={disabled}
            onPress={() => runCommand('insertHorizontalRule')}
          />
        </div>

        <span className="rte-toolbar__divider" />

        <div className="rte-toolbar__group">
          <ToolButton
            label="Chèn liên kết"
            icon={Link2}
            disabled={disabled}
            onPress={handleLink}
          />
          <ToolButton
            label="Gỡ liên kết"
            icon={Unlink}
            disabled={disabled}
            onPress={() => runCommand('unlink')}
          />
          <ToolButton
            label="Chèn ảnh vào nội dung"
            icon={uploading ? LoaderCircle : ImagePlus}
            disabled={disabled || uploading}
            onPress={openImagePicker}
          />
        </div>

        {uploading ? (
          <span className="rte-uploading">
            <LoaderCircle size={15} className="rte-spin" />
            Đang tải ảnh {uploadProgress ? `${uploadProgress}%` : ''}
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

      <div
        ref={editorRef}
        className="rte-content"
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Nội dung bài viết"
        data-placeholder={placeholder}
        onInput={emitChange}
        onKeyUp={() => {
          saveSelection();
          refreshFormats();
        }}
        onMouseUp={() => {
          saveSelection();
          refreshFormats();
        }}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDoubleClick={handleEditorDoubleClick}
      />

      <div className="rte-footer">
        <span>{stats.words} từ</span>
        <span>{stats.characters} ký tự</span>
        <span>
          {stats.images}/{maxImages} ảnh
        </span>
        <span className="rte-footer__hint">
          Nhấp đúp vào ảnh để sửa chú thích hoặc xóa khỏi bài.
        </span>
      </div>

      {imageDialog ? (
        <div
          className="rte-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeImageDialog();
            }
          }}
        >
          <form
            className="rte-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rte-image-dialog-title"
            onSubmit={confirmImageDialog}
          >
            <div className="rte-modal__header">
              <div>
                <strong id="rte-image-dialog-title">
                  {imageDialog.mode === 'edit'
                    ? 'Chỉnh sửa ảnh trong bài'
                    : 'Chèn ảnh vào bài viết'}
                </strong>
                <p>
                  Ảnh phải có mô tả thay thế và chú thích như một bài báo.
                </p>
              </div>

              <button
                type="button"
                className="rte-modal__close"
                aria-label="Đóng"
                onClick={closeImageDialog}
              >
                <X size={20} />
              </button>
            </div>

            <div className="rte-modal__body">
              <div className="rte-image-preview">
                <img
                  src={
                    imageDialog.media?.secureUrl ||
                    imageDialog.media?.url
                  }
                  alt="Xem trước ảnh"
                />
              </div>

              <label className="rte-field">
                <span>
                  Văn bản thay thế (alt) <b>*</b>
                </span>
                <input
                  type="text"
                  maxLength={300}
                  autoFocus
                  value={imageDialog.alt}
                  placeholder="Ví dụ: Toàn cảnh khu đô thị Hòa Lạc nhìn từ trên cao"
                  onChange={(event) => {
                    setDialogError('');
                    setImageDialog((current) => ({
                      ...current,
                      alt: event.target.value,
                    }));
                  }}
                />
                <small>
                  Mô tả nội dung ảnh để hỗ trợ SEO và người dùng trình đọc màn hình.
                </small>
              </label>

              <label className="rte-field">
                <span>
                  Chú thích và nguồn ảnh <b>*</b>
                </span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={imageDialog.caption}
                  placeholder="Ví dụ: Toàn cảnh Khu Công nghệ cao Hòa Lạc. Ảnh: Đô Thị Hòa Lạc"
                  onChange={(event) => {
                    setDialogError('');
                    setImageDialog((current) => ({
                      ...current,
                      caption: event.target.value,
                    }));
                  }}
                />
                <small>{imageDialog.caption.length}/500 ký tự</small>
              </label>

              {dialogError ? (
                <div className="rte-modal__error" role="alert">
                  {dialogError}
                </div>
              ) : null}
            </div>

            <div className="rte-modal__footer">
              {imageDialog.mode === 'edit' ? (
                <button
                  type="button"
                  className="rte-button rte-button--danger"
                  onClick={removeEditingImage}
                >
                  <Trash2 size={17} />
                  Xóa khỏi bài
                </button>
              ) : (
                <span />
              )}

              <div className="rte-modal__actions">
                <button
                  type="button"
                  className="rte-button rte-button--secondary"
                  onClick={closeImageDialog}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="rte-button rte-button--primary"
                >
                  {imageDialog.mode === 'edit'
                    ? 'Lưu thay đổi'
                    : 'Chèn vào bài'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
