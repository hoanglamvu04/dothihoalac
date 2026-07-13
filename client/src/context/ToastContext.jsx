import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message, type = 'success', duration = 4500) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((items) => [...items, { id, message, type }]);
      window.setTimeout(() => remove(id), duration);
      return id;
    },
    [remove],
  );

  const value = useMemo(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error', 6500),
      info: (message) => show(message, 'info'),
    }),
    [show],
  );

  const icons = { success: CheckCircle2, error: CircleAlert, info: Info };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || Info;
          return (
            <div className={`toast toast--${toast.type}`} key={toast.id}>
              <Icon size={20} />
              <span>{toast.message}</span>
              <button type="button" onClick={() => remove(toast.id)} aria-label="Đóng thông báo">
                <X size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
