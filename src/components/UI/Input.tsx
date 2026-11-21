import React from "react";

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...props }) => {
  return (
    <input
      className={`w-full h-11 px-3.5 rounded-lg border border-line bg-white text-ink
                  placeholder:text-ink-faint
                  focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
                  transition-colors disabled:opacity-60 ${className}`}
      {...props}
    />
  );
};

export default Input;
