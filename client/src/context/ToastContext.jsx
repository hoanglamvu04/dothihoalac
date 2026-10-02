import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastsRef = useRef([]);

  const remove = useCallback((id) => {
    toastsRef.current = toastsRef.current.filter(
      (item) => item.id !== id,
    );
    setToasts(toastsRef.current);
  }, []);

  const show = useCallback(
    (message, type = 'success', duration = 4500) => {
      const existing = toastsRef.current.find(
        (item) =>
          item.message === message &&
          item.type === type,
      );

      if (existing) {
        return existing.id;
      }

      const id = `${Date.now()}-${Math.random()}`;
      const nextToast = { id, message, type };

      toastsRef.current = [
        ...toastsRef.current,
        nextToast,
      ];
      setToasts(toastsRef.current);

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
