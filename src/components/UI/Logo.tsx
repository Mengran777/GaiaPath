import React from "react";
import { Route } from "lucide-react";

interface LogoProps {
  /** "dark" for light backgrounds, "light" for dark backgrounds */
  tone?: "dark" | "light";
  size?: "md" | "lg";
  className?: string;
}

// GaiaPath wordmark: a small route mark plus the name.
const Logo: React.FC<LogoProps> = ({ tone = "dark", size = "md", className = "" }) => {
  const isLight = tone === "light";
  const box = size === "lg" ? "w-9 h-9 rounded-xl" : "w-8 h-8 rounded-lg";
  const icon = size === "lg" ? 20 : 18;
  const text = size === "lg" ? "text-[1.7rem]" : "text-2xl";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`${box} flex items-center justify-center ${
          isLight ? "bg-white/10 text-brand-300" : "bg-brand-900 text-white"
        }`}
        aria-hidden="true"
      >
        <Route size={icon} strokeWidth={2} />
      </span>
      <span
        className={`font-display font-bold tracking-tight ${text} ${
          isLight ? "text-white" : "text-brand-900"
        }`}
      >
        Gaia
      </span>
    </div>
  );
};

export default Logo;
