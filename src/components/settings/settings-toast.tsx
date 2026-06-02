"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ToastMessage } from "@/types/settings-config";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface SettingsToastContextValue {
  pushToast: (type: "success" | "error", text: string) => void;
}

const SettingsToastContext = createContext<SettingsToastContextValue | null>(null);

export function SettingsToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((type: "success" | "error", text: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <SettingsToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg",
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            )}
          >
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="rounded p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </SettingsToastContext.Provider>
  );
}

export function useSettingsToast() {
  const context = useContext(SettingsToastContext);
  if (!context) {
    throw new Error("useSettingsToast must be used within SettingsToastProvider");
  }
  return context;
}
