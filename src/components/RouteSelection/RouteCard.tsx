// src/components/RouteSelection/RouteCard.tsx

import React, { useState } from "react";
import { RouteOption } from "@/types/routes";

interface RouteCardProps {
  route: RouteOption;
  onSelect: (routeId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (routeId: string) => void;
  coverImageUrl?: string | null;
}

// Derive accent color + badge pill theme from badge text
const getBadgeTheme = (badge: string) => {
  const b = badge.toLowerCase();
  if (
    b.includes("culinar") || b.includes("food") ||
    b.includes("culture") || b.includes("art") || b.includes("local")
  ) {
    return { bar: "#c9a96e", pillText: "#9a6f30" };
  }
  if (
    b.includes("nature") || b.includes("hidden") ||
    b.includes("garden") || b.includes("eco") || b.includes("green")
  ) {
    return { bar: "#2d9e8a", pillText: "#1a6b5e" };
  }
  return { bar: "#0d3d38", pillText: "#0d3d38" };
};

const intensityLabel = (intensity?: string) => {
  if (intensity === "easy") return "Relaxed";
  if (intensity === "moderate") return "Moderate";
  if (intensity === "high") return "Intense";
  return null;
};

const RouteCard: React.FC<RouteCardProps> = ({
  route,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  coverImageUrl,
}) => {
  const theme = getBadgeTheme(route.badge);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Derive date range from itinerary
  const firstDate = route.itinerary?.[0]?.date;
  const lastDate = route.itinerary?.[route.itinerary.length - 1]?.date;
  const dateRange =
    firstDate && lastDate && firstDate !== lastDate
      ? `${firstDate} → ${lastDate}`
      : firstDate || null;

  const pace = intensityLabel(route.intensity);

  return (
    <div
      onClick={() => onSelect(route.id)}
      className="relative bg-white rounded-2xl overflow-hidden cursor-pointer
                 border border-[#e8e4df] shadow-sm
                 hover:shadow-md hover:border-[#2d9e8a]
                 transition-all duration-200 active:scale-[0.99]"
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl z-10"
        style={{ background: theme.bar }}
      />

      {/* Cover image */}
      <div className="relative h-[160px] w-full overflow-hidden bg-gray-100">
        {coverImageUrl ? (
          <>
            {/* Skeleton shown until image loads */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <img
              src={coverImageUrl}
              alt=""
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
            {/* Bottom gradient mask for badge readability */}
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent" />
          </>
        ) : (
          /* Placeholder: deep green gradient */
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d3d38] via-[#1a6b5e] to-[#2d9e8a] flex items-center justify-center">
            <span className="text-white/60 text-sm font-medium text-center px-6 leading-snug">
              {route.title}
            </span>
          </div>
        )}

        {/* Badge overlaid on image bottom-left */}
        <div className="absolute bottom-2.5 left-4 z-10">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                       text-xs font-semibold tracking-wide uppercase
                       bg-white/85 backdrop-blur-sm"
            style={{ color: theme.pillText }}
          >
            {route.badge}
          </span>
        </div>

        {/* Favorite button — top-right corner of image */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(route.id);
            }}
            className={`absolute top-2.5 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center
                       text-base leading-none transition-all duration-150
                       ${isFavorite
                         ? "bg-[#c9a96e] border-[1.5px] border-[#c9a96e] text-white"
                         : "bg-white/80 backdrop-blur-sm border-[1.5px] border-white/60 text-[#b0b0b0] hover:border-[#c9a96e]"
                       }`}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="pl-6 pr-5 pt-4 pb-4">
        {/* Title */}
        <h3 className="font-display text-xl font-bold text-[#0d3d38] mb-2 leading-snug pr-2">
          {route.title}
        </h3>

        {/* Description */}
        <p className="text-[#6b6b6b] text-sm leading-relaxed mb-4 line-clamp-2">
          {route.description}
        </p>

        {/* Highlights */}
        {(route.highlights || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {route.highlights.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                           text-xs text-[#4a4a4a] bg-[#f5f2ee] border border-[#e8e4df]"
              >
                {h.icon && <span>{h.icon}</span>}
                {h.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#e8e4df] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#8a8a8a] flex-wrap">
          <span>📅 {route.days} {route.days === 1 ? "Day" : "Days"}</span>
          {pace && (
            <>
              <span className="text-[#d0ccc8]">·</span>
              <span>{pace}</span>
            </>
          )}
          {dateRange && (
            <>
              <span className="text-[#d0ccc8]">·</span>
              <span>{dateRange}</span>
            </>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(route.id);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                     bg-[#0d3d38] text-white text-xs font-medium flex-shrink-0
                     hover:bg-[#1a6b5e] transition-colors duration-150"
        >
          View route <span className="text-[#2d9e8a]">→</span>
        </button>
      </div>
    </div>
  );
};

export default RouteCard;
