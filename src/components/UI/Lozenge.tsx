import React from "react";

interface LozengeProps {
  /** Hollow outline instead of a filled diamond (e.g. "Save" vs "Saved") */
  outline?: boolean;
  className?: string;
}

/** The small diamond used across the app to mark "selected" or "current". */
const Lozenge: React.FC<LozengeProps> = ({ outline = false, className = "" }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" focusable="false">
    {outline ? (
      <path d="M8 1.7 14.3 8 8 14.3 1.7 8Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
    ) : (
      <path d="M8 1 15 8 8 15 1 8Z" fill="currentColor" />
    )}
  </svg>
);

export default Lozenge;
