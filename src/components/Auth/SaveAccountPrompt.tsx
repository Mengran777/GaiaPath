"use client";

import React, { useEffect, useRef } from "react";

interface SaveAccountPromptProps {
  open: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  onLogIn: () => void;
}

/**
 * Shown when a guest tries to save a trip. Saving needs an account; the
 * current routes are kept for them across sign-up (see the hand-off in App).
 */
const SaveAccountPrompt: React.FC<SaveAccountPromptProps> = ({ open, onClose, onCreateAccount, onLogIn }) => {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-5 animate-card-enter overscroll-contain"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-prompt-title"
        className="w-full max-w-[460px] bg-white px-8 sm:px-10 pt-9 pb-8"
      >
        <p className="eyebrow">Save this trip</p>
        <h2 id="save-prompt-title" className="mt-3 font-display text-[34px] leading-[1.06] uppercase text-ink">
          Keep your routes
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Create a free account to save trips and come back to them on any device.
          Your routes stay right here while you sign up, and this one is saved as soon as you&apos;re in.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
          <button ref={primaryRef} type="button" onClick={onCreateAccount} className="btn-ink">
            Create account
          </button>
          <button type="button" onClick={onLogIn} className="link-quiet text-[13px]">
            I have an account
          </button>
        </div>
        <button type="button" onClick={onClose} className="link-quiet text-[13px] mt-6">
          Not now
        </button>
      </div>
    </div>
  );
};

export default SaveAccountPrompt;
