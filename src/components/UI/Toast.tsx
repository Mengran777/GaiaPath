"use client";

import React, { useState, useCallback } from "react";
import Lozenge from "./Lozenge";

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
  // Always mounted so screen readers announce new messages (polite live region)
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3.5 pl-5 pr-3 py-3.5 min-w-[280px] max-w-[420px] pointer-events-auto animate-card-enter
            ${toast.type === "error" ? "bg-white text-red-700 ring-1 ring-red-200" : "bg-ink text-white"}`}
        >
          {toast.type === "error" ? (
            <span className="text-[11px] tracking-[0.08em] uppercase flex-shrink-0">Error</span>
          ) : (
            <Lozenge className="w-[8px] h-[8px] flex-shrink-0" />
          )}
          <span className="flex-1 text-sm leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-[11px] tracking-[0.08em] uppercase opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
};
