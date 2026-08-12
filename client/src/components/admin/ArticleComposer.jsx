import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Node } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import FileHandler from '@tiptap/extension-file-handler';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from 'lucide-react';

import { api, apiErrorMessage } from '../../api/http';

const IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const DthlFigure = Node.create({
  name: 'dthlFigure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      mediaId: { default: '' },
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-media-id]',
        getAttrs: (element) => {
          const image = element.querySelector('img');
          const caption = element.querySelector('figcaption');
          return {
            mediaId: element.getAttribute('data-media-id') || image?.getAttribute('data-media-id') || '',
            src: image?.getAttribute('src') || '',
            alt: image?.getAttribute('alt') || '',
            caption: caption?.textContent?.trim() || '',
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { mediaId, src, alt, caption } = node.attrs;
    return [
      'figure',
      { 'data-media-id': mediaId },
      ['img', { src, alt, 'data-media-id': mediaId }],
      ['figcaption', {}, caption],
    ];
  },
});

function fileNameToText(name = '') {
  return String(name)
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Ảnh minh họa';
}

function ToolButton({ label, active = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      className={`admin-composer-tool${active ? ' is-active' : ''}`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!disabled) onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export default function ArticleComposer({
  value = '',
  onChange,
  disabled = false,
  uploadFolder = 'articles/inline',
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ words: 0, characters: 0 });

  const uploadFiles = useCallback(async (activeEditor, files, position = null) => {
    const accepted = Array.from(files || []).filter((file) => IMAGE_TYPES.has(file.type));
    if (!accepted.length || !activeEditor) return;

    setError('');
    setUploading((count) => count + accepted.length);

    try {
      let insertPosition = position;

      for (const file of accepted) {
        const formData = new FormData();
        const alt = fileNameToText(file.name);
        formData.append('image', file);
        formData.append('folder', uploadFolder);
        formData.append('altText', alt);

        try {
          const response = await api.post('/media/images', formData);
          const media = response?.data?.data;
          const mediaId = media?._id || media?.id;
          const src = media?.secureUrl || media?.url;

          if (!mediaId || !src) {
            throw new Error('API upload ảnh không trả về Media ID hoặc URL.');
          }

          const suggestedCaption = `Ảnh minh họa: ${alt}`;
          const enteredCaption = window.prompt(
            'Nhập chú thích hoặc nguồn ảnh:',
            suggestedCaption,
          );
          const caption = String(enteredCaption || suggestedCaption).trim();

          const figure = {
            type: 'dthlFigure',
            attrs: {
              mediaId: String(mediaId),
              src: String(src),
              alt,
              caption,
            },
          };

          if (Number.isInteger(insertPosition)) {
            activeEditor.chain().focus().insertContentAt(insertPosition, figure).run();
            insertPosition += 1;
          } else {
            activeEditor.chain().focus().insertContent(figure).run();
          }
        } catch (uploadError) {
          setError(apiErrorMessage(uploadError, `Không thể tải ảnh ${file.name}.`));
        } finally {
          setUploading((count) => Math.max(0, count - 1));
        }
      }
    } catch (unexpectedError) {
      setError(unexpectedError?.message || 'Không thể xử lý ảnh được chọn.');
      setUploading(0);
    }
  }, [uploadFolder]);

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: false,
      underline: false,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      HTMLAttributes: { rel: 'noopener noreferrer' },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    TableKit.configure({
      table: { resizable: true },
    }),
    DthlFigure,
    FileHandler.configure({
      allowedMimeTypes: [...IMAGE_TYPES],
      consumePasteEvent: true,
      onPaste: (activeEditor, files) => uploadFiles(activeEditor, files),
      onDrop: (activeEditor, files, position) => uploadFiles(activeEditor, files, position),
    }),
    Placeholder.configure({
      placeholder: 'Bắt đầu viết bài… Có thể Ctrl + V ảnh, kéo thả ảnh hoặc dán nội dung từ Word / Google Docs / Gemini.',
    }),
  ], [uploadFiles]);

  const editor = useEditor({
    extensions,
    content: value || '<p></p>',
    editable: !disabled,
    onCreate: ({ editor: activeEditor }) => {
      const text = activeEditor.getText({ blockSeparator: ' ' }).trim();
      setStats({
        words: text ? text.split(/\s+/).filter(Boolean).length : 0,
        characters: text.length,
      });
    },
    onUpdate: ({ editor: activeEditor }) => {
      const html = activeEditor.getHTML();
      const text = activeEditor.getText({ blockSeparator: ' ' }).trim();
      setStats({
        words: text ? text.split(/\s+/).filter(Boolean).length : 0,
        characters: text.length,
      });
      onChange?.(html);
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const next = value || '<p></p>';
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
      const text = editor.getText({ blockSeparator: ' ' }).trim();
      setStats({
        words: text ? text.split(/\s+/).filter(Boolean).length : 0,
        characters: text.length,
      });
    }
  }, [editor, value]);

  if (!editor) return null;

  const setLink = () => {
    const current = editor.getAttributes('link').href || '';
    const href = window.prompt('Nhập đường dẫn:', current || 'https://');
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run();
  };

  return (
    <div className="admin-composer">
      <div className="admin-composer-toolbar">
        <ToolButton label="Hoàn tác" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></ToolButton>
        <ToolButton label="Làm lại" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></ToolButton>
        <span className="admin-composer-separator" />

        <select
          aria-label="Kiểu đoạn"
          value={editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
          onChange={(event) => {
            const type = event.target.value;
            if (type === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (type === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
            else editor.chain().focus().setParagraph().run();
          }}
        >
          <option value="p">Đoạn văn</option>
          <option value="h2">Tiêu đề H2</option>
          <option value="h3">Tiêu đề H3</option>
        </select>

        <ToolButton label="Đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolButton>
        <ToolButton label="Nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolButton>
        <ToolButton label="Gạch chân" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></ToolButton>
        <ToolButton label="Gạch ngang" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolButton>
        <span className="admin-composer-separator" />

        <ToolButton label="Danh sách" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></ToolButton>
        <ToolButton label="Danh sách số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></ToolButton>
        <ToolButton label="Trích dẫn" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolButton>
        <ToolButton label="Đường phân cách" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /></ToolButton>
        <span className="admin-composer-separator" />

        <ToolButton label="Căn trái" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={16} /></ToolButton>
        <ToolButton label="Căn giữa" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={16} /></ToolButton>
        <ToolButton label="Căn phải" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={16} /></ToolButton>
        <ToolButton label="Căn đều" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={16} /></ToolButton>
        <span className="admin-composer-separator" />

        <ToolButton label="Chèn liên kết" active={editor.isActive('link')} onClick={setLink}><Link2 size={16} /></ToolButton>
        <ToolButton label="Bỏ liên kết" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={16} /></ToolButton>
        <ToolButton label="Chèn ảnh" disabled={uploading > 0} onClick={() => fileRef.current?.click()}><ImagePlus size={16} /></ToolButton>
        <ToolButton label="Chèn bảng 3×3" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 size={16} /></ToolButton>
        <ToolButton label="Xóa bảng đang chọn" disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 size={16} /></ToolButton>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          hidden
          onChange={(event) => {
            uploadFiles(editor, event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-composer-body">
        <EditorContent editor={editor} />
      </div>

      <div className="admin-composer-footer">
        <span>{stats.words.toLocaleString('vi-VN')} từ · {stats.characters.toLocaleString('vi-VN')} ký tự</span>
        <span className="admin-composer-upload">
          {uploading > 0 ? `Đang tải ${uploading} ảnh…` : 'TipTap · dán/kéo ảnh trực tiếp · bảng · liên kết · định dạng'}
        </span>
      </div>
    </div>
  );
}
