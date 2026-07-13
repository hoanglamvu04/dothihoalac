import { useEffect, useRef } from 'react';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Quote, Redo2, Undo2 } from 'lucide-react';

const commands = [
  ['bold', Bold, 'Đậm'],
  ['italic', Italic, 'Nghiêng'],
  ['insertUnorderedList', List, 'Danh sách'],
  ['insertOrderedList', ListOrdered, 'Danh sách số'],
  ['formatBlock', Quote, 'Trích dẫn', 'blockquote'],
  ['undo', Undo2, 'Hoàn tác'],
  ['redo', Redo2, 'Làm lại'],
];

export default function RichTextEditor({ value = '', onChange, placeholder = 'Nhập nội dung...' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || '';
  }, [value]);

  const run = (command, argument) => {
    ref.current?.focus();
    document.execCommand(command, false, argument);
    onChange(ref.current?.innerHTML || '');
  };

  const addLink = () => {
    const url = window.prompt('Nhập đường dẫn liên kết:');
    if (url) run('createLink', url);
  };

  return (
    <div className="rich-editor">
      <div className="rich-editor__toolbar">
        {commands.map(([command, Icon, label, argument]) => (
          <button type="button" key={command} onClick={() => run(command, argument)} title={label}><Icon size={17} /></button>
        ))}
        <button type="button" onClick={addLink} title="Chèn liên kết"><LinkIcon size={17} /></button>
      </div>
      <div
        ref={ref}
        className="rich-editor__content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}
