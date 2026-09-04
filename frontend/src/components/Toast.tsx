import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type ToastKind = "success" | "error";

interface ToastState {
  msg: string;
  kind: ToastKind;
}

interface ToastApi {
  success: (m: string) => void;
  error: (e: unknown) => void;
}

const ToastContext = createContext<ToastApi>({
  success: () => {},
  error: () => {},
});

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Có lỗi xảy ra, thử lại";
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback((msg: string, kind: ToastKind) => {
    setToast({ msg, kind });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const api: ToastApi = {
    success: (m: string) => show(m, "success"),
    error: (e: unknown) => show(toMessage(e), "error"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.kind === "success" ? "bg-green-700" : "bg-red-700"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}
