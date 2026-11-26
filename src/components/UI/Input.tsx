import React from "react";

/** Underline-only text field (editorial style). */
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...props }) => {
  return <input className={`field-line text-base disabled:opacity-60 ${className}`} {...props} />;
};

export default Input;
