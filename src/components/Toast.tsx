import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckIcon } from './icons';

export type ToastTone = 'success' | 'info';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
  visible: boolean;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);
  const idCounterRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (unmountTimerRef.current !== null) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      clearTimers();
      idCounterRef.current += 1;
      const nextId = idCounterRef.current;

      setToast({ id: nextId, message, tone, visible: true });

      hideTimerRef.current = window.setTimeout(() => {
        setToast((prev) =>
          prev && prev.id === nextId ? { ...prev, visible: false } : prev,
        );
      }, 2500);

      unmountTimerRef.current = window.setTimeout(() => {
        setToast((prev) => (prev && prev.id === nextId ? null : prev));
      }, 2800);
    },
    [clearTimers],
  );

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 -translate-x-1/2 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[60] pointer-events-none print:hidden transition-all duration-300 motion-reduce:transition-none ${
            toast.visible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="inline-flex items-center gap-2 max-w-[calc(100vw-2rem)] rounded-full bg-slate-900/90 text-white px-5 py-3 text-sm font-semibold shadow-lg backdrop-blur-xs">
            {toast.tone === 'success' ? (
              <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : null}
            <span className="truncate">{toast.message}</span>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
