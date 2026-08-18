import React from "react";
import { UNSPLASH_HOME_LINK } from "@/lib/unsplash";

interface UnsplashCreditProps {
  photographerName: string;
  photographerUrl: string;
  className?: string;
}

// Required attribution format: https://help.unsplash.com/en/articles/2511315
const UnsplashCredit: React.FC<UnsplashCreditProps> = ({
  photographerName,
  photographerUrl,
  className = "",
}) => (
  <p
    className={`text-[10px] leading-none text-white/85 drop-shadow-sm ${className}`}
    onClick={(e) => e.stopPropagation()}
  >
    Photo by{" "}
    <a
      href={photographerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-white"
    >
      {photographerName}
    </a>{" "}
    on{" "}
    <a
      href={UNSPLASH_HOME_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-white"
    >
      Unsplash
    </a>
  </p>
);

export default UnsplashCredit;
