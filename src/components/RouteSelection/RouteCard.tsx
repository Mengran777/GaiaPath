// src/components/RouteSelection/RouteCard.tsx

import React, { useState } from "react";
import { RouteOption } from "@/types/routes";
import Lozenge from "@/components/UI/Lozenge";

interface RouteCardProps {
  route: RouteOption;
  /** Position in the list, shown as a Roman numeral (0 → I) */
  index?: number;
  onSelect: (routeId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (routeId: string) => void;
  coverImageUrl?: string | null;
  coverImageAttribution?: { photographerName: string; photographerUrl: string } | null;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// Shorter theme names for the small caps line under the photo
const shortBadge = (badge: string) => {
  const b = badge.toLowerCase();
  if (b.includes("classic")) return "Classic";
  if (b.includes("cultur") || b.includes("culinar") || b.includes("food")) return "Culture and food";
  if (b.includes("nature") || b.includes("hidden")) return "Nature";
  return badge.replace(/\s+route$/i, "");
};

const intensityLabel = (intensity?: string) => {
  if (intensity === "easy") return "Relaxed";
  if (intensity === "moderate") return "Moderate";
  if (intensity === "high") return "Intense";
  return null;
};

/**
 * Editorial route card: only what you need at a glance.
 * Photo, a small caps line ("I · Classic · 5 days") and a short serif title.
 * Hovering only lets the photo drift closer; nothing is written over it.
 * (The description opens the route as its lede; the credit sits under its cover.)
 * Save is a lozenge on the photo's corner (outline = save, filled = saved).
 */
const RouteCard: React.FC<RouteCardProps> = ({
  route,
  index,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  coverImageUrl,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const meta = [
    index !== undefined ? ROMAN[index] ?? String(index + 1) : null,
    shortBadge(route.badge),
    `${route.days} ${route.days === 1 ? "day" : "days"}`,
    intensityLabel(route.intensity),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group/card">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-dim">
        <button
          type="button"
          onClick={() => onSelect(route.id)}
          aria-label={`${route.title}. ${route.description}`}
          className="absolute inset-0 block w-full text-left focus-visible:outline-offset-[-3px]"
        >
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt=""
              width={800}
              height={1000}
              className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-[1100ms] ease-editorial group-hover/card:scale-[1.03] ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center bg-brand-100">
              <span className="font-display text-[26px] leading-tight text-ink">{route.title}</span>
              <span className="eyebrow mt-3">{shortBadge(route.badge)}</span>
            </span>
          )}
        </button>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(route.id)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Saved: ${route.title}` : `Save ${route.title}`}
            title={isFavorite ? "Saved" : "Save"}
            className="absolute left-3 top-3 z-10 w-8 h-8 flex items-center justify-center bg-white/90 text-ink transition-colors duration-300 hover:bg-white"
          >
            <Lozenge outline={!isFavorite} className="w-[10px] h-[10px]" />
          </button>
        )}

      </div>

      <button type="button" tabIndex={-1} onClick={() => onSelect(route.id)} className="block w-full text-left mt-3">
        <span className="block eyebrow">{meta}</span>
        <span className="block mt-1 font-display text-[20px] leading-[1.2] text-ink line-clamp-2 transition-opacity duration-500 group-hover/card:opacity-60">
          {route.title}
        </span>
      </button>
    </article>
  );
};

export default RouteCard;
