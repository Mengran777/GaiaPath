"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "./Input";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/** Password field with a show/hide toggle. */
const PasswordInput: React.FC<PasswordInputProps> = ({ className = "", ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={`pr-10 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink transition-colors"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;
