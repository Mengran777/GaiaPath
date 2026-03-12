"use client";

import React, { useState, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white font-medium
            min-w-[280px] max-w-[420px] pointer-events-auto
            ${toast.type === "success" ? "bg-gradient-to-r from-green-500 to-emerald-600" : ""}
            ${toast.type === "error" ? "bg-gradient-to-r from-red-500 to-rose-600" : ""}
            ${toast.type === "info" ? "bg-gradient-to-r from-blue-500 to-purple-600" : ""}
          `}
        >
          <span className="text-xl flex-shrink-0">
            {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
          </span>
          <span className="flex-1 text-sm leading-snug">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-white/70 hover:text-white transition-colors ml-1 text-xl leading-none flex-shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
