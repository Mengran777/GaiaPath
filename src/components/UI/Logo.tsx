import React from "react";

interface LogoProps {
  /** "dark" for light backgrounds, "light" for dark backgrounds */
  tone?: "dark" | "light";
  size?: "md" | "lg";
  className?: string;
}

// Gaia wordmark: spaced serif capitals, like a magazine masthead.
const Logo: React.FC<LogoProps> = ({ tone = "dark", size = "md", className = "" }) => (
  <span
    className={`font-display tracking-[0.22em] ${size === "lg" ? "text-2xl" : "text-xl"} ${
      tone === "light" ? "text-white" : "text-ink"
    } ${className}`}
  >
    GAIA
  </span>
);

export default Logo;
