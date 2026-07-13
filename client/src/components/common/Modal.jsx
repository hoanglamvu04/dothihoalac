import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.classList.add('modal-open');
    window.addEventListener('keydown', handler);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X size={22} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}
