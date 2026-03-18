import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/cn";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900",
};

export function useToast(duration = 3000) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [duration],
  );

  function ToastContainer() {
    if (toasts.length === 0) return null;
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg animate-in slide-in-from-bottom-2",
              TYPE_STYLES[t.type],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    );
  }

  return { show, ToastContainer };
}
