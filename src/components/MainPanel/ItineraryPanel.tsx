// src/components/MainPanel/ItineraryPanel.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { DayItinerary, Activity, Location } from "../../types/itinerary";
import UnsplashCredit from "../UI/UnsplashCredit";

// ── Props ──────────────────────────────────────────────────────────────────────

interface ItineraryPanelProps {
  itinerary: DayItinerary[];
  onActivityClick: (location: Location) => void;
  onDayClick?: (dayNumber: number) => void;
  highlightedDay?: number | null;
  routeId?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onBackToRoutes?: () => void;
  destination?: string;
  transportationModes?: string[];
  userId?: string | null;
  onSave?: (itinerary: DayItinerary[]) => void;
  isSaving?: boolean;
}

interface DraggableCardProps {
  activity: Activity;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  isDragging: boolean;
  removeMode: boolean;
  isRemoving: boolean;
  isSelected: boolean;
  onRemove: () => void;
  onCardClick: () => void;
  // Inline accordion drawer data (only populated when isSelected)
  drawerDescription?: string | null;
  descriptionLoading?: boolean;
  onOpenLightbox?: (images: string[], index: number, attributions?: ({ photographerName: string; photographerUrl: string } | null)[]) => void;
  destination?: string;
  isEnriching?: boolean;
  onEdit?: () => void;
  // AI-modify state — set when this exact activity was touched by the AI composer
  isAiTouched?: boolean;
  aiBadgeText?: string;
  aiWasLine?: string;
  onUndoAiChange?: () => void;
}

// Returned by POST /api/modify-itinerary — matches the ItineraryPanel-side
// application logic in handleAiSubmit below.
interface ModifyOperation {
  type: "replace" | "add";
  day: number;
  activityIndex?: number;
  activity: Activity;
}

interface TouchedInfo {
  wasActivity: Activity | null; // null for "add" operations — nothing to revert to but removal
  addedByAI: boolean;
}

// ── Lightbox ───────────────────────────────────────────────────────────────────

interface LightboxProps {
  images: string[];
  fallbackImages?: string[];
  attributions?: ({ photographerName: string; photographerUrl: string } | null)[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}

const Lightbox: React.FC<LightboxProps> = ({ images, fallbackImages, attributions, index, onClose, onChange }) => {
  const prev = () => onChange((index - 1 + images.length) % images.length);
  const next = () => onChange((index + 1) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length]);

  if (!images.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {images.length > 1 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 text-white text-2xl flex items-center justify-center hover:bg-white/40 transition-colors"
          onClick={(e) => { e.stopPropagation(); prev(); }}
        >
          ‹
        </button>
      )}

      <img
        src={images[index]}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          const fallback = fallbackImages?.[index];
          if (fallback && e.currentTarget.src !== fallback) {
            e.currentTarget.src = fallback;
          }
        }}
      />

      {images.length > 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 text-white text-2xl flex items-center justify-center hover:bg-white/40 transition-colors"
          onClick={(e) => { e.stopPropagation(); next(); }}
        >
          ›
        </button>
      )}

      <button
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-colors text-sm"
        onClick={onClose}
      >
        ✕
      </button>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
          {index + 1} / {images.length}
        </div>
      )}

      {attributions?.[index] && (
        <div className="absolute bottom-4 left-4">
          <UnsplashCredit
            photographerName={attributions[index]!.photographerName}
            photographerUrl={attributions[index]!.photographerUrl}
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
};

// Module-level cache so all card instances share fetched results across renders
const wikiImagesCache = new Map<string, string[]>();

// Upgrades a thumbnail URL to its highest-quality variant for Lightbox display
function toHdUrl(url: string): string {
  // Unsplash: bump the w= query param to 1080
  if (url.includes("images.unsplash.com")) {
    return url.replace(/([?&]w=)\d+/, "$11080");
  }
  // Wikipedia: upgrade the resolution prefix only in the FINAL path segment.
  // A naive /\d+px-/ replacement matches the first occurrence and breaks URLs
  // where the original filename itself starts with a size prefix (e.g. "800px-File.jpg").
  // The lookahead (?=[?#]|$) ensures we only match the segment at the very end of the path.
  if (url.includes("upload.wikimedia.org")) {
    const upgraded = url.replace(/\/\d+px-([^/?#]*)(?=[?#]|$)/, "/1024px-$1");
    // If no thumbnail pattern was found (full-resolution URL), return as-is
    return upgraded;
  }
  return url;
}

function hasValidCoords(activity: Activity): boolean {
  return (
    typeof activity.latitude === "number" &&
    typeof activity.longitude === "number" &&
    activity.latitude !== 0 &&
    activity.longitude !== 0
  );
}

function transitDirectionsUrl(from: Activity, to: Activity): string {
  const origin = `${from.latitude},${from.longitude}`;
  const destination = `${to.latitude},${to.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`;
}

// Quick-start prompts for the AI composer — each is a complete, directly
// submittable request (the model picks which day/activity fits best).
const AI_SUGGESTIONS = [
  "Too much walking — swap something for a relaxed spot",
  "Add more local food stops",
  "Feels too crowded — find quieter alternatives",
];

// ── DraggableCard ──────────────────────────────────────────────────────────────

const DraggableCard: React.FC<DraggableCardProps> = ({
  activity,
  dragHandleProps,
  isDragging,
  removeMode,
  isRemoving,
  isSelected,
  onRemove,
  onCardClick,
  drawerDescription = null,
  descriptionLoading = false,
  onOpenLightbox,
  destination = "",
  isEnriching = false,
  onEdit,
  isAiTouched = false,
  aiBadgeText,
  aiWasLine,
  onUndoAiChange,
}) => {
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [wikiImages, setWikiImages] = useState<string[]>([]);
  const [wikiLoading, setWikiLoading] = useState(false);

  // Scroll into view when accordion opens
  useEffect(() => {
    if (!isSelected) return;
    const timer = setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    return () => clearTimeout(timer);
  }, [isSelected]);

  // Fetch Wikipedia images when drawer opens
  useEffect(() => {
    if (!isSelected) return;
    const cacheKey = activity.title;

    if (wikiImagesCache.has(cacheKey)) {
      setWikiImages(wikiImagesCache.get(cacheKey)!);
      return;
    }

    setWikiLoading(true);

    // Step 1: find best-matching Wikipedia article title via search API
    const searchWiki = (query: string): Promise<string | null> =>
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search` +
          `&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`
      )
        .then((r) => r.json())
        .then((d) => (d?.query?.search?.[0]?.title as string) ?? null)
        .catch(() => null);

    const findMatchedTitle = async (): Promise<string> => {
      // Primary search: full title + destination for context
      const primary = destination
        ? `${activity.title} ${destination}`
        : activity.title;
      const result = await searchWiki(primary);
      if (result) return result;

      // Fallback: first two words of the title (no destination)
      const shortTitle = activity.title.split(/\s+/).slice(0, 2).join(" ");
      if (shortTitle !== activity.title) {
        const fallback = await searchWiki(shortTitle);
        if (fallback) return fallback;
      }

      // Last resort: use original title verbatim
      return activity.title;
    };

    // Step 2: fetch summary + media-list with matched title, then extract images
    const SKIP_KEYWORDS = ["map", "plan", "diagram", "logo", "icon", "flag", "coat"];
    const isUsable = (url: string): boolean => {
      const lower = url.toLowerCase();
      if (lower.endsWith(".svg")) return false;
      const filename = lower.split("/").pop() ?? "";
      return !SKIP_KEYWORDS.some((kw) => filename.includes(kw));
    };

    findMatchedTitle()
      .then((matchedTitle) =>
        Promise.all([
          fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(matchedTitle)}`
          ).then((r) => r.json()),
          fetch(
            `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(matchedTitle)}`
          ).then((r) => r.json()),
        ])
      )
      .then(([summary, media]) => {
        // Strip size prefix (e.g. "320px-") to get the canonical base name
        const getBaseName = (url: string): string => {
          const filename = url.split("/").pop()?.split("?")[0] ?? "";
          return filename.replace(/^\d+px-/, "").toLowerCase();
        };

        // Seed seen-set with activity.imageUrl so wiki images don't duplicate it
        const seen = new Set<string>();
        if (activity.imageUrl) seen.add(getBaseName(activity.imageUrl));

        const imgs: string[] = [];

        const tryAdd = (src: string) => {
          if (!isUsable(src)) return;
          const key = getBaseName(src);
          if (!key || seen.has(key)) return;
          seen.add(key);
          imgs.push(src);
        };

        if (summary?.thumbnail?.source) tryAdd(summary.thumbnail.source);

        const items: { type: string; srcset?: { src: string }[]; src?: string }[] =
          media?.items ?? [];

        for (const item of items) {
          if (imgs.length >= 3) break;
          if (item.type !== "image") continue;
          const raw = item.srcset?.[0]?.src ?? item.src ?? "";
          if (!raw) continue;
          const src = raw.startsWith("//") ? "https:" + raw : raw;
          tryAdd(src);
        }

        wikiImagesCache.set(cacheKey, imgs);
        setWikiImages(imgs);
      })
      .catch(() => wikiImagesCache.set(cacheKey, []))
      .finally(() => setWikiLoading(false));
  }, [isSelected, activity.title, destination]);

  // All gallery images: main first, then wiki results
  const galleryImages = useMemo(() => {
    const imgs: string[] = [];
    if (activity.imageUrl) imgs.push(activity.imageUrl);
    imgs.push(...wikiImages);
    return imgs;
  }, [activity.imageUrl, wikiImages]);

  // Parallel to galleryImages — only the main image can carry Unsplash
  // attribution (wiki images never do), so every other slot is null.
  const galleryAttributions = useMemo(() => {
    const attrs: ({ photographerName: string; photographerUrl: string } | null)[] = [];
    if (activity.imageUrl) attrs.push(activity.imageAttribution ?? null);
    wikiImages.forEach(() => attrs.push(null));
    return attrs;
  }, [activity.imageUrl, activity.imageAttribution, wikiImages]);

  return (
    <div
      ref={containerRef}
      className={`
        rounded-xl overflow-hidden border-2 shadow-sm select-none
        transition-all duration-200
        ${isRemoving ? "opacity-0 -translate-x-6 scale-95" : "opacity-100"}
        ${isDragging
          ? "opacity-25 shadow-none"
          : isSelected
            ? "shadow-md"
            : "hover:shadow-md hover:-translate-y-px"}
      `}
      style={
        isDragging
          ? { borderStyle: "dashed", borderColor: "#2d9e8a", borderWidth: 2 }
          : { borderColor: isAiTouched ? "#8b5fbf" : isSelected ? "#2d9e8a" : hovered ? "#2d9e8a" : "transparent" }
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Card row ── */}
      <div
        className={`flex items-stretch cursor-pointer ${
          isAiTouched ? "bg-gradient-to-b from-[#f3e8fd] to-white" : "bg-white"
        }`}
        onClick={onCardClick}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className={`
            flex items-center justify-center w-7 flex-shrink-0
            cursor-grab active:cursor-grabbing
            text-[#2d9e8a] bg-[#f5faf9] border-r border-[#e8f0ef]
            transition-opacity duration-150
            ${hovered || isDragging ? "opacity-100" : "opacity-0"}
          `}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="2.5" cy="2"  r="1.5" />
            <circle cx="7.5" cy="2"  r="1.5" />
            <circle cx="2.5" cy="8"  r="1.5" />
            <circle cx="7.5" cy="8"  r="1.5" />
            <circle cx="2.5" cy="14" r="1.5" />
            <circle cx="7.5" cy="14" r="1.5" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex flex-1 items-center gap-3 p-3 min-w-0">
          {activity.imageUrl ? (
            <img
              src={activity.imageUrl}
              alt={activity.title}
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0 shadow-sm"
            />
          ) : isEnriching ? (
            <div className="w-14 h-14 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-[#0d3d38] truncate">
                {activity.title}
              </h3>
              {isAiTouched && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e3fa3] bg-[#f3e8fd] border border-[#e2caf7] px-2 py-0.5 rounded-full flex-shrink-0">
                  ✨ {aiBadgeText ?? "AI updated"}
                </span>
              )}
            </div>
            {aiWasLine && (
              <p className="text-[11px] text-gray-400 line-through mb-1">was: {aiWasLine}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {activity.time && (
                <span className="flex items-center gap-0.5">
                  <span className="text-[#2d9e8a]">⏰</span>
                  {activity.time}
                </span>
              )}
              {activity.rating != null && (
                <span className="flex items-center gap-0.5">
                  <span className="text-yellow-400">★</span>
                  {activity.rating}
                </span>
              )}
              {activity.price && (
                <span className="flex items-center gap-0.5">
                  <span className="text-green-600">£</span>
                  {activity.price}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit + Undo(AI) + Remove buttons — slide in during edit mode */}
        <div
          className={`
            flex items-stretch flex-shrink-0 overflow-hidden transition-all duration-300 ease-out
            ${removeMode ? (isAiTouched ? "w-[132px]" : "w-[88px]") + " opacity-100" : "w-0 opacity-0"}
          `}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="w-11 flex items-center justify-center text-gray-400
                       bg-gray-50 border-l border-gray-100
                       hover:text-[#0d3d38] hover:bg-[#e8f7f5] transition-colors duration-150"
            title="Edit activity"
          >
            ✎
          </button>
          {isAiTouched && (
            <button
              onClick={(e) => { e.stopPropagation(); onUndoAiChange?.(); }}
              className="w-11 flex items-center justify-center text-[#6e3fa3]
                         bg-[#f3e8fd] border-l border-[#e2caf7]
                         hover:text-white hover:bg-[#8b5fbf] transition-colors duration-150"
              title={aiWasLine ? "Undo this AI change" : "Remove this AI addition"}
            >
              ↺
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-11 flex items-center justify-center text-xl font-light
                       text-red-400 bg-red-50 border-l border-red-100
                       hover:text-white hover:bg-red-400 transition-colors duration-150"
            title="Remove activity"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Inline accordion drawer ── */}
      <div
        style={{
          maxHeight: isSelected && !isDragging ? 380 : 0,
          transition: "max-height 0.38s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
      >
        <div className="bg-white border-t border-gray-100">
          {/* Image gallery */}
          <div
            className="flex gap-2 px-3 pt-3 pb-2 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {/* Main image — 160×120 */}
            {activity.imageUrl ? (
              <button
                className="flex-shrink-0 rounded-lg overflow-hidden focus:outline-none"
                style={{ width: 160, height: 120 }}
                onClick={() => onOpenLightbox?.(galleryImages, 0, galleryAttributions)}
              >
                <img
                  src={activity.imageUrl}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div
                className="flex-shrink-0 rounded-lg bg-[#f0faf8] flex items-center justify-center text-3xl border border-[#cde8e4]"
                style={{ width: 160, height: 120 }}
              >
                🏛️
              </div>
            )}

            {/* Wikipedia images — 90×120 each, or skeletons while loading */}
            {wikiLoading ? (
              <>
                <div className="flex-shrink-0 rounded-lg bg-gray-100 animate-pulse" style={{ width: 90, height: 120 }} />
                <div className="flex-shrink-0 rounded-lg bg-gray-100 animate-pulse" style={{ width: 90, height: 120 }} />
              </>
            ) : wikiImages.length > 0 ? (
              wikiImages.map((src, i) => (
                <button
                  key={src}
                  className="flex-shrink-0 rounded-lg overflow-hidden focus:outline-none"
                  style={{ width: 90, height: 120 }}
                  onClick={() => onOpenLightbox?.(galleryImages, i + (activity.imageUrl ? 1 : 0), galleryAttributions)}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))
            ) : (
              <div
                className="flex-shrink-0 rounded-lg bg-[#f5f2ee] flex items-center justify-center text-2xl border border-[#e8e4df]"
                style={{ width: 90, height: 120 }}
              >
                🌍
              </div>
            )}
          </div>

          {/* Info section */}
          <div className="px-3 pb-3">
            {/* Title + close */}
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-sm font-bold text-[#0d3d38] truncate flex-1 pr-2">
                {activity.title}
              </h3>
              <button
                onClick={(e) => { e.stopPropagation(); onCardClick(); }}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center
                           text-gray-400 hover:bg-gray-200 transition-colors flex-shrink-0
                           text-sm leading-none"
              >
                ×
              </button>
            </div>

            {/* AI description */}
            {(descriptionLoading && !drawerDescription) || (isEnriching && !drawerDescription && !activity.description) ? (
              <div className="space-y-1.5 mb-2.5">
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-4/5" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/5" />
              </div>
            ) : drawerDescription ? (
              <p className="text-xs text-gray-500 leading-relaxed mb-2.5">
                {drawerDescription}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic leading-relaxed mb-2.5">
                {activity.description}
              </p>
            )}

            {/* Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {activity.time && (
                <span className="flex items-center gap-1 text-xs bg-[#f0faf8] text-[#1a6b5e] px-2 py-0.5 rounded-full border border-[#cde8e4]">
                  ⏰ {activity.time}
                </span>
              )}
              {activity.rating != null && (
                <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">
                  ★ {activity.rating}
                </span>
              )}
              {activity.price && (
                <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                  £ {activity.price}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── ActivityForm ───────────────────────────────────────────────────────────────

interface LocationHit {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
}

function parseTimePreset(time: string): {
  preset: "morning" | "afternoon" | "evening" | "custom" | null;
  customStart: string;
  customEnd: string;
} {
  if (!time) return { preset: null, customStart: "09:00", customEnd: "12:00" };
  if (time === "08:00-12:00") return { preset: "morning", customStart: "08:00", customEnd: "12:00" };
  if (time === "12:00-17:00") return { preset: "afternoon", customStart: "12:00", customEnd: "17:00" };
  if (time === "17:00-21:00") return { preset: "evening", customStart: "17:00", customEnd: "21:00" };
  const m = time.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (m) return { preset: "custom", customStart: m[1], customEnd: m[2] };
  return { preset: "custom", customStart: "09:00", customEnd: "12:00" };
}

interface ActivityFormProps {
  onSubmit: (activity: Activity, locationName: string) => void;
  onCancel: () => void;
  initialActivity?: Activity;
  isEditing?: boolean;
}

const ActivityForm: React.FC<ActivityFormProps> = ({
  onSubmit,
  onCancel,
  initialActivity,
  isEditing = false,
}) => {
  const initTime = parseTimePreset(initialActivity?.time ?? "");
  const [title, setTitle] = useState(initialActivity?.title ?? "");
  const [description, setDescription] = useState(initialActivity?.description ?? "");
  const [timePreset, setTimePreset] = useState<"morning" | "afternoon" | "evening" | "custom" | null>(initTime.preset);
  const [customStart, setCustomStart] = useState(initTime.customStart);
  const [customEnd, setCustomEnd] = useState(initTime.customEnd);
  const [price, setPrice] = useState(initialActivity?.price ?? "");

  const TIME_PRESETS = {
    morning:   { label: "08:00 – 12:00", value: "08:00-12:00" },
    afternoon: { label: "12:00 – 17:00", value: "12:00-17:00" },
    evening:   { label: "17:00 – 21:00", value: "17:00-21:00" },
  } as const;
  const getTimeValue = () => {
    if (!timePreset) return "";
    if (timePreset === "custom") return `${customStart}-${customEnd}`;
    return TIME_PRESETS[timePreset].value;
  };
  const getTimeLabel = () => {
    if (!timePreset) return "";
    if (timePreset === "custom") return `${customStart} – ${customEnd}`;
    return TIME_PRESETS[timePreset].label;
  };
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedLocationName, setSelectedLocationName] = useState("");
  const [suggestions, setSuggestions] = useState<LocationHit[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [lat, setLat] = useState(initialActivity?.latitude ?? 0);
  const [lon, setLon] = useState(initialActivity?.longitude ?? 0);
  const locWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locWrapperRef.current && !locWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (locationQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingLoc(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=5`,
          { headers: { Accept: "application/json", "User-Agent": "GaiaPath-TravelApp/1.0" } }
        );
        const data = await res.json();
        const hits: LocationHit[] = data.slice(0, 5).map((item: any) => ({
          name: item.name || item.display_name.split(",")[0],
          displayName: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }));
        setSuggestions(hits);
        setShowSuggestions(hits.length > 0);
      } catch {
        /* silent */
      } finally {
        setLoadingLoc(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [locationQuery]);

  const handleSelectLocation = (hit: LocationHit) => {
    setLocationQuery(hit.name);
    setSelectedLocationName(hit.name);
    setLat(hit.lat);
    setLon(hit.lon);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(
      {
        title: title.trim(),
        description: description.trim(),
        time: getTimeValue(),
        price: price.trim() || undefined,
        latitude: lat,
        longitude: lon,
        imageUrl: initialActivity?.imageUrl,
      },
      selectedLocationName
    );
  };

  const hasCoords = (initialActivity?.latitude ?? 0) !== 0 || (initialActivity?.longitude ?? 0) !== 0;

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="mt-2 p-4 bg-white rounded-2xl border-2 border-[#cde8e4] shadow-sm space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#0d3d38] tracking-wide uppercase">
          {isEditing ? "Edit activity" : "Add activity"}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors text-sm"
        >
          ×
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#0d3d38] mb-1 uppercase tracking-wide">
          Activity name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Visit Eiffel Tower"
          required
          autoFocus={!isEditing}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none
                     focus:border-[#2d9e8a] focus:ring-2 focus:ring-[#2d9e8a]/20 transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#0d3d38] mb-1 uppercase tracking-wide">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional short description"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none
                     focus:border-[#2d9e8a] focus:ring-2 focus:ring-[#2d9e8a]/20 transition-all"
        />
      </div>

      {/* Time picker */}
      <div>
        <label className="block text-xs font-semibold text-[#0d3d38] mb-2 tracking-wide uppercase">Time</label>
        <div className="flex flex-wrap gap-2">
          {([
            { key: "morning",   icon: "🌄", label: "Morning"   },
            { key: "afternoon", icon: "☀️",  label: "Afternoon" },
            { key: "evening",   icon: "🌆", label: "Evening"   },
            { key: "custom",    icon: "🕐", label: "Custom"    },
          ] as const).map(({ key, icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTimePreset(timePreset === key ? null : key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
                ${timePreset === key
                  ? "bg-[#e8f7f5] border-[#2d9e8a] text-[#0d3d38] font-semibold"
                  : "bg-white border-gray-200 text-gray-500 hover:border-[#2d9e8a] hover:text-[#0d3d38]"
                }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Custom time range inputs */}
        {timePreset === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="time"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-xl outline-none
                         focus:border-[#2d9e8a] focus:ring-2 focus:ring-[#2d9e8a]/20 transition-all"
            />
            <span className="text-gray-400 text-sm flex-shrink-0">–</span>
            <input
              type="time"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-xl outline-none
                         focus:border-[#2d9e8a] focus:ring-2 focus:ring-[#2d9e8a]/20 transition-all"
            />
          </div>
        )}

        {/* Selected time hint */}
        {timePreset && (
          <p className="mt-1.5 text-xs text-gray-400">Selected: {getTimeLabel()}</p>
        )}
      </div>

      {/* Price */}
      <div>
        <label className="block text-xs font-semibold text-[#0d3d38] mb-1 uppercase tracking-wide">Price</label>
        <input
          type="text"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Free / €10"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none
                     focus:border-[#2d9e8a] focus:ring-2 focus:ring-[#2d9e8a]/20 transition-all"
        />
      </div>

      <div ref={locWrapperRef} className="relative">
        <label className="block text-xs font-semibold text-[#0d3d38] mb-1 uppercase tracking-wide">Location</label>
        {isEditing && hasCoords && !selectedLocationName && (
          <div className="mb-1.5 flex items-center gap-1.5 px-3 py-2 bg-[#f0faf8] rounded-xl border border-[#cde8e4]">
            <span className="text-[#2d9e8a] text-sm">📍</span>
            <div className="min-w-0">
              <p className="text-xs text-[#0d3d38] font-medium">Current location saved</p>
              <p className="text-xs text-gray-400">{initialActivity!.latitude!.toFixed(4)}, {initialActivity!.longitude!.toFixed(4)}</p>
            </div>
          </div>
        )}
        <div className="relative">
          <input
            type="text"
            value={locationQuery}
            onChange={(e) => {
              setLocationQuery(e.target.value);
              setSelectedLocationName("");
              if (!isEditing) { setLat(0); setLon(0); }
            }}
            placeholder={isEditing ? "Search to change location…" : "Search a place…"}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none
                       focus:border-[#2d9e8a] focus:ring-2 focus:ring-[#2d9e8a]/20 transition-all pr-8"
          />
          {loadingLoc && (
            <svg
              className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {selectedLocationName && !loadingLoc && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2d9e8a] text-xs font-bold">✓</span>
          )}
        </div>
        {isEditing && (
          <p className="mt-1 text-xs text-gray-400">Change location to refresh image and description</p>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectLocation(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[#f0faf8] transition-colors
                           border-b border-gray-100 last:border-b-0 flex items-start gap-2"
              >
                <span className="mt-0.5 text-base leading-none">📍</span>
                <div className="min-w-0">
                  <div className="font-medium text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-500 truncate">{s.displayName}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="text-xs font-semibold px-4 py-1.5 rounded-full bg-[#0d3d38] text-white
                     hover:bg-[#1a6b5e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isEditing ? "Save changes" : "Add"}
        </button>
      </div>
    </form>
  );
};

// ── Main Panel ─────────────────────────────────────────────────────────────────

const ItineraryPanel: React.FC<ItineraryPanelProps> = ({
  itinerary,
  onActivityClick,
  onDayClick,
  highlightedDay = null,
  isFavorite = false,
  onToggleFavorite,
  onBackToRoutes,
  destination = "",
  transportationModes = [],
  userId,
  onSave,
  isSaving = false,
}) => {
  const showTransitLinks = transportationModes.includes("public_transport");
  const [localItinerary, setLocalItinerary] = useState<DayItinerary[]>(itinerary);
  const [removeMode, setRemoveMode] = useState(false);
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());
  const [editSnapshot, setEditSnapshot] = useState<{
    itinerary: DayItinerary[];
    touched: Map<string, TouchedInfo>;
  } | null>(null);
  const [undoStack, setUndoStack] = useState<{
    dayNumber: number;
    index: number;
    activity: Activity;
  }[]>([]);
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [enrichingKeys, setEnrichingKeys] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // AI-modify state: which activities the AI composer has touched this edit
  // session (keyed by "day:currentTitle"), plus the composer's own UI state.
  const [touched, setTouched] = useState<Map<string, TouchedInfo>>(new Map());
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatusText, setAiStatusText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  // Drawer state (shared across all cards)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [descriptionCache, setDescriptionCache] = useState<Map<string, string>>(new Map());
  const [descriptionLoading, setDescriptionLoading] = useState(false);

  // Lightbox state (panel-level so fixed overlay isn't clipped)
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxFallbackImages, setLightboxFallbackImages] = useState<string[]>([]);
  const [lightboxAttributions, setLightboxAttributions] = useState<({ photographerName: string; photographerUrl: string } | null)[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Sync when itinerary prop changes
  useEffect(() => {
    setLocalItinerary(itinerary);
    setRemoveMode(false);
    setRemovingKeys(new Set());
    setSelectedActivity(null);
    setEditSnapshot(null);
    setUndoStack([]);
    setAddingDay(null);
    setEditingKey(null);
    setEnrichingKeys(new Set());
    setTouched(new Map());
    setAiInput("");
    setAiError(null);
  }, [itinerary]);

  // Fade-in animation for day sections
  useEffect(() => {
    if (!localItinerary || localItinerary.length === 0) return;
    const opts = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.remove("opacity-0", "translate-y-8");
        }
      });
    }, opts);
    if (panelRef.current) {
      panelRef.current.querySelectorAll(".itinerary-day-animated").forEach((el) => {
        (el as HTMLElement).classList.add("opacity-0", "translate-y-8");
        observer.observe(el);
      });
    }
    return () => {
      if (panelRef.current) {
        panelRef.current
          .querySelectorAll(".itinerary-day-animated")
          .forEach((el) => observer.unobserve(el));
      }
    };
  }, [localItinerary]);


  // Fetch AI description when a new activity is selected
  useEffect(() => {
    if (!selectedActivity) return;
    const title = selectedActivity.title;
    if (descriptionCache.has(title)) return;

    setDescriptionLoading(true);
    fetch("/api/generate-activity-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.description) {
          setDescriptionCache((prev) => new Map(prev).set(title, data.description));
        }
      })
      .catch(() => {})
      .finally(() => setDescriptionLoading(false));
  }, [selectedActivity]);

  // Card click: toggle accordion + trigger map flyTo/popup
  const handleCardClick = useCallback(
    (activity: Activity) => {
      const isSame =
        selectedActivity?.title === activity.title &&
        selectedActivity?.time === activity.time;

      if (isSame) {
        setSelectedActivity(null);
        // Toggle map popup off
        if (activity.latitude && activity.longitude) {
          onActivityClick({
            name: activity.title,
            latitude: activity.latitude,
            longitude: activity.longitude,
            description: activity.description,
            imageUrl: activity.imageUrl,
          });
        }
      } else {
        setSelectedActivity(activity);
        if (
          typeof activity.latitude === "number" &&
          typeof activity.longitude === "number" &&
          activity.latitude !== 0 &&
          activity.longitude !== 0
        ) {
          onActivityClick({
            name: activity.title,
            latitude: activity.latitude,
            longitude: activity.longitude,
            description: activity.description,
            imageUrl: activity.imageUrl,
          });
        }
      }
    },
    [selectedActivity, onActivityClick]
  );

  // Day route button
  const handleDayRoute = useCallback(
    (e: React.MouseEvent, activities: Activity[]) => {
      e.stopPropagation();
      const waypoints = activities
        .filter(
          (a) =>
            typeof a.latitude === "number" &&
            typeof a.longitude === "number" &&
            a.latitude !== 0 &&
            a.longitude !== 0
        )
        .map((a) => `${a.latitude},${a.longitude}`)
        .join("/");
      if (!waypoints) return;
      window.open(`https://www.google.com/maps/dir/${waypoints}`, "_blank");
    },
    []
  );

  const openLightbox = useCallback((imgs: string[], idx: number, attributions?: ({ photographerName: string; photographerUrl: string } | null)[]) => {
    setLightboxFallbackImages(imgs);
    setLightboxImages(imgs.map(toHdUrl));
    setLightboxAttributions(attributions ?? []);
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);

  // Drag end
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const next = localItinerary.map((d) => ({ ...d, activities: [...d.activities] }));
    const srcDay = next.find((d) => `day-${d.day}` === source.droppableId);
    const dstDay = next.find((d) => `day-${d.day}` === destination.droppableId);
    if (!srcDay || !dstDay) return;

    const [moved] = srcDay.activities.splice(source.index, 1);
    dstDay.activities.splice(destination.index, 0, moved);
    setLocalItinerary(next);
    onSave?.(next);
  };

  // Enter / exit edit mode
  const enterEditMode = useCallback(() => {
    setEditSnapshot({
      itinerary: localItinerary.map((d) => ({ ...d, activities: [...d.activities] })),
      touched: new Map(touched),
    });
    setUndoStack([]);
    setRemoveMode(true);
  }, [localItinerary, touched]);

  // Called right before an AI edit lands, if we're not already mid-edit —
  // snapshots first so Discard still reverts cleanly, then flips into edit
  // mode automatically so the change is visible right away.
  const ensureEditMode = useCallback(() => {
    if (!removeMode) enterEditMode();
  }, [removeMode, enterEditMode]);

  const exitEditMode = useCallback(() => {
    setRemoveMode(false);
    setEditSnapshot(null);
    setUndoStack([]);
    setAddingDay(null);
    setEditingKey(null);
  }, []);

  // Discard all edits (manual AND AI) and restore snapshot
  const handleDiscard = useCallback(() => {
    if (editSnapshot) {
      setLocalItinerary(editSnapshot.itinerary);
      setTouched(editSnapshot.touched);
    }
    setRemoveMode(false);
    setEditSnapshot(null);
    setUndoStack([]);
    setAddingDay(null);
    setEditingKey(null);
    setAiError(null);
  }, [editSnapshot]);

  const AI_STATUS_MESSAGES = ["Reading your itinerary…", "Checking real places nearby…", "Working out the details…"];

  const handleAiSubmit = useCallback(async (promptText: string) => {
    const text = promptText.trim();
    if (!text || aiBusy) return;

    setAiBusy(true);
    setAiError(null);
    let statusIdx = 0;
    setAiStatusText(AI_STATUS_MESSAGES[0]);
    const statusInterval = setInterval(() => {
      statusIdx = (statusIdx + 1) % AI_STATUS_MESSAGES.length;
      setAiStatusText(AI_STATUS_MESSAGES[statusIdx]);
    }, 1400);

    try {
      const response = await fetch("/api/modify-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          currentItinerary: localItinerary,
          modificationRequest: text,
          userId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to modify itinerary.");
      }

      const data: { summary: string; operations: ModifyOperation[] } = await response.json();

      ensureEditMode(); // snapshot BEFORE mutating, only takes effect if not already editing

      const nextItinerary = localItinerary.map((d) => ({ ...d, activities: [...d.activities] }));
      const nextTouched = new Map(touched);

      for (const op of data.operations) {
        const day = nextItinerary.find((d) => d.day === op.day);
        if (!day || !op.activity) continue;

        if (op.type === "replace" && typeof op.activityIndex === "number") {
          const old = day.activities[op.activityIndex];
          if (!old) continue;
          day.activities[op.activityIndex] = op.activity;
          nextTouched.set(`${op.day}:${op.activity.title}`, { wasActivity: old, addedByAI: false });
        } else if (op.type === "add") {
          day.activities.push(op.activity);
          nextTouched.set(`${op.day}:${op.activity.title}`, { wasActivity: null, addedByAI: true });
        }
      }

      setLocalItinerary(nextItinerary);
      setTouched(nextTouched);
      setAiInput("");
    } catch (error: any) {
      setAiError(error.message || "Something went wrong — try rephrasing your request.");
    } finally {
      clearInterval(statusInterval);
      setAiBusy(false);
      setAiStatusText("");
    }
  }, [aiBusy, destination, localItinerary, touched, userId, ensureEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reverts just this one AI change (swap back, or remove an AI addition),
  // leaving every other AI edit and manual edit untouched.
  const handleUndoTouch = useCallback((key: string, dayNumber: number) => {
    const info = touched.get(key);
    if (!info) return;

    setLocalItinerary((prev) =>
      prev.map((d) => {
        if (d.day !== dayNumber) return d;
        if (info.addedByAI) {
          return { ...d, activities: d.activities.filter((a) => `${dayNumber}:${a.title}` !== key) };
        }
        return {
          ...d,
          activities: d.activities.map((a) =>
            `${dayNumber}:${a.title}` === key && info.wasActivity ? info.wasActivity : a
          ),
        };
      })
    );
    setTouched((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, [touched]);

  const handleAddActivity = useCallback((dayNumber: number, activity: Activity, locationName: string) => {
    setLocalItinerary((prev) =>
      prev.map((d) =>
        d.day === dayNumber ? { ...d, activities: [...d.activities, activity] } : d
      )
    );
    setAddingDay(null);
    setEditingKey(null);

    // Background enrichment: image + description
    const enrichKey = `${dayNumber}:${activity.title}`;
    setEnrichingKeys((prev) => new Set(prev).add(enrichKey));
    const userHasDescription = !!activity.description?.trim();

    Promise.all([
      fetch("/api/activity-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: activity.title, destination, locationName }),
      })
        .then((r) => r.json())
        .catch(() => ({ imageUrl: null })),

      userHasDescription
        ? Promise.resolve({ description: null })
        : fetch("/api/generate-activity-description", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: activity.title, locationName }),
          })
            .then((r) => r.json())
            .catch(() => ({ description: null })),
    ])
      .then(([imgData, descData]) => {
        const imageUrl: string | null = imgData?.imageUrl ?? null;
        const imageAttribution = imgData?.imageAttribution ?? null;
        const description: string | null = descData?.description ?? null;

        // Pre-populate descriptionCache so the drawer shows it immediately on open
        if (description) {
          setDescriptionCache((prev) => new Map(prev).set(activity.title, description));
        }

        if (imageUrl || (!userHasDescription && description)) {
          setLocalItinerary((prev) =>
            prev.map((d) => {
              if (d.day !== dayNumber) return d;
              return {
                ...d,
                activities: d.activities.map((a) =>
                  a.title === activity.title && a.time === activity.time
                    ? {
                        ...a,
                        ...(imageUrl ? { imageUrl, imageAttribution } : {}),
                        ...(!userHasDescription && description ? { description } : {}),
                      }
                    : a
                ),
              };
            })
          );
        }
      })
      .finally(() => {
        setEnrichingKeys((prev) => {
          const next = new Set(prev);
          next.delete(enrichKey);
          return next;
        });
      });
  }, [destination]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveActivity = useCallback((
    dayNumber: number,
    index: number,
    activity: Activity,
    locationName: string,
  ) => {
    setLocalItinerary((prev) =>
      prev.map((d) => {
        if (d.day !== dayNumber) return d;
        const acts = [...d.activities];
        acts[index] = activity;
        return { ...d, activities: acts };
      })
    );
    setEditingKey(null);

    if (!locationName) return;

    const enrichKey = `${dayNumber}:${activity.title}`;
    setEnrichingKeys((prev) => new Set(prev).add(enrichKey));
    const userHasDescription = !!activity.description?.trim();

    Promise.all([
      fetch("/api/activity-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: activity.title, destination, locationName }),
      })
        .then((r) => r.json())
        .catch(() => ({ imageUrl: null })),

      userHasDescription
        ? Promise.resolve({ description: null })
        : fetch("/api/generate-activity-description", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: activity.title, locationName }),
          })
            .then((r) => r.json())
            .catch(() => ({ description: null })),
    ])
      .then(([imgData, descData]) => {
        const imageUrl: string | null = imgData?.imageUrl ?? null;
        const description: string | null = descData?.description ?? null;

        if (description) {
          setDescriptionCache((prev) => new Map(prev).set(activity.title, description));
        }

        if (imageUrl || (!userHasDescription && description)) {
          setLocalItinerary((prev) =>
            prev.map((d) => {
              if (d.day !== dayNumber) return d;
              return {
                ...d,
                activities: d.activities.map((a) =>
                  a.title === activity.title && a.time === activity.time
                    ? {
                        ...a,
                        ...(imageUrl ? { imageUrl } : {}),
                        ...(!userHasDescription && description ? { description } : {}),
                      }
                    : a
                ),
              };
            })
          );
        }
      })
      .finally(() => {
        setEnrichingKeys((prev) => {
          const next = new Set(prev);
          next.delete(enrichKey);
          return next;
        });
      });
  }, [destination]); // eslint-disable-line react-hooks/exhaustive-deps

  // Undo last deletion
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const { dayNumber, index, activity } = undoStack[undoStack.length - 1];
    setLocalItinerary((prev) =>
      prev.map((d) => {
        if (d.day !== dayNumber) return d;
        const acts = [...d.activities];
        acts.splice(index, 0, activity);
        return { ...d, activities: acts };
      })
    );
    setUndoStack((prev) => prev.slice(0, -1));
  }, [undoStack]);

  // Detect whether localItinerary differs from the original itinerary prop
  const hasChanges = useMemo(() => {
    if (localItinerary.length !== itinerary.length) return true;
    return localItinerary.some((day, di) => {
      const orig = itinerary[di];
      if (!orig || day.day !== orig.day) return true;
      if (day.activities.length !== orig.activities.length) return true;
      return day.activities.some((act, ai) => act.title !== orig.activities[ai]?.title);
    });
  }, [localItinerary, itinerary]);

  // Remove activity
  const handleRemoveActivity = (dayNumber: number, activityIndex: number) => {
    const day = localItinerary.find((d) => d.day === dayNumber);
    if (day) {
      setUndoStack((prev) => [
        ...prev,
        { dayNumber, index: activityIndex, activity: day.activities[activityIndex] },
      ]);
    }
    const key = `${dayNumber}-${activityIndex}`;
    setRemovingKeys((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setLocalItinerary((prev) =>
        prev.map((d) =>
          d.day === dayNumber
            ? { ...d, activities: d.activities.filter((_, i) => i !== activityIndex) }
            : d
        )
      );
      setRemovingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 300);
  };

  return (
    <div className="relative">
      {/* Back button row — favorite lives here as a secondary action */}
      <div className="flex items-center justify-between mb-4">
        {onBackToRoutes ? (
          <button
            onClick={onBackToRoutes}
            className="flex items-center gap-1.5 text-sm text-[#1a6b5e] hover:text-[#0d3d38] font-medium transition-colors group"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="group-hover:underline">Back to routes</span>
          </button>
        ) : <div />}

        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            title={isFavorite ? "Remove from favourites" : "Add to favourites"}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150
              ${isFavorite
                ? "bg-[#fdf6ec] border-[#c9a96e] text-[#c9a96e]"
                : "bg-white border-[#e8e4df] text-[#b0b0b0] hover:border-[#c9a96e] hover:text-[#c9a96e]"
              }`}
          >
            {isFavorite ? "★" : "☆"}
            <span>{isFavorite ? "Saved to favourites" : "Add to favourites"}</span>
          </button>
        )}
      </div>

      {/* Header */}
      <div
        className="mb-5 pb-4 border-b-2 border-gray-100 cursor-pointer hover:bg-gray-50 rounded-lg p-4 -mx-4 transition-colors duration-200"
        onClick={() => onDayClick && onDayClick(0)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Your Itinerary</h2>
            <p className="text-gray-500 text-sm">
              {highlightedDay === null || highlightedDay === 0
                ? "Click a day to filter · drag to reorder"
                : "Click here to show all days again"}
            </p>
          </div>

          {/* Action buttons — right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {removeMode ? (
              <>
                {undoStack.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUndo(); }}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 bg-white text-blue-500 border-blue-200 hover:bg-blue-50"
                  >
                    ↩ Undo{undoStack.length > 1 ? ` (${undoStack.length})` : ""}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDiscard(); }}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 bg-white text-red-400 border-red-200 hover:bg-red-50"
                >
                  ✕ Discard
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasChanges && onSave) onSave(localItinerary);
                    exitEditMode();
                  }}
                  disabled={isSaving}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 bg-[#0d3d38] text-white border-[#0d3d38] shadow-sm hover:bg-[#1a6b5e]
                    ${isSaving ? "opacity-60 cursor-not-allowed" : ""}
                  `}
                >
                  {isSaving ? "Saving…" : "✓ Done"}
                </button>
              </>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); enterEditMode(); }}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 bg-white text-gray-400 border-[#e8e4df] hover:text-red-400 hover:border-red-300"
              >
                ✎ Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI composer — always available, not gated behind Edit */}
      <div className="mb-4 rounded-2xl border border-[#e2caf7] bg-gradient-to-b from-[#f3e8fd] to-[#faf5fe] p-4">
        <p className="text-[10.5px] font-bold tracking-widest uppercase text-[#6e3fa3] mb-2.5">
          ✨ Ask AI to adjust this trip
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {AI_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={aiBusy}
              onClick={() => handleAiSubmit(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-[#e2caf7] bg-white text-[#6e3fa3]
                         hover:bg-[#8b5fbf] hover:text-white hover:border-[#8b5fbf] transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAiSubmit(aiInput);
              }
            }}
            disabled={aiBusy}
            rows={1}
            placeholder="e.g. Swap Day 2's afternoon for something more relaxed"
            className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-[#e2caf7] bg-white
                       outline-none focus:ring-2 focus:ring-[#8b5fbf]/20 resize-none
                       disabled:bg-[#f0ede8] transition-colors"
          />
          <button
            type="button"
            disabled={aiBusy || !aiInput.trim()}
            onClick={() => handleAiSubmit(aiInput)}
            className="flex-shrink-0 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#8b5fbf] text-white
                       hover:bg-[#6e3fa3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Ask AI
          </button>
        </div>
        {aiBusy && (
          <div className="flex items-center gap-2 mt-2.5 text-xs text-[#6e3fa3]">
            <span className="w-3 h-3 rounded-full border-2 border-[#e2caf7] border-t-[#6e3fa3] animate-spin flex-shrink-0" />
            {aiStatusText}
          </div>
        )}
        {aiError && (
          <p className="mt-2.5 text-xs text-red-500">{aiError}</p>
        )}
      </div>

      {/* Drag hint */}
      <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#e8f7f5] border border-[#cde8e4] text-xs text-[#2d9e8a]">
        <span className="text-base leading-none select-none">⠿</span>
        <span>
          Hover a card and drag the <strong>⠿ handle</strong> to reorder · drag across days
        </span>
      </div>

      {/* Itinerary days */}
      {localItinerary.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No itinerary available.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div ref={panelRef} className="pl-7">
            {localItinerary.map((dayItem) => (
              <div
                key={dayItem.day}
                onClick={() => onDayClick && onDayClick(dayItem.day)}
                className={`
                  itinerary-day-animated relative border-l-4 pl-6 mb-8 cursor-pointer
                  transition-all duration-500 ease-in-out
                  ${highlightedDay === dayItem.day
                    ? "border-[#1a6b5e] bg-[#f0faf8]/50 rounded-r-2xl py-2"
                    : "border-[#2d9e8a] hover:border-[#1a6b5e]"
                  }
                `}
              >
                {/* Day circle */}
                <div
                  className={`
                    absolute -left-5 top-0 w-10 h-10 rounded-full
                    text-white font-bold flex items-center justify-center shadow-md
                    transition-all duration-500
                    ${highlightedDay === dayItem.day
                      ? "bg-gradient-to-br from-[#0d3d38] to-[#2d9e8a] scale-110 shadow-lg"
                      : "bg-gradient-to-br from-[#0d3d38] to-[#1a6b5e]"
                    }
                  `}
                >
                  {dayItem.day}
                </div>

                {/* Day header */}
                <div className="mb-3 flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{dayItem.title}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{dayItem.date}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-shrink-0">
                    {dayItem.activities.some(
                      (a) => a.latitude && a.longitude && a.latitude !== 0 && a.longitude !== 0
                    ) && (
                      <button
                        onClick={(e) => handleDayRoute(e, dayItem.activities)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full
                                   bg-[#0d3d38] text-white hover:bg-[#1a6b5e]
                                   transition-colors duration-150 flex items-center gap-1"
                        title="Open day route in Google Maps"
                      >
                        🗺 Day route
                      </button>
                    )}
                  </div>
                </div>

                {/* Drop zone */}
                <Droppable droppableId={`day-${dayItem.day}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        space-y-2 rounded-2xl transition-all duration-200
                        ${snapshot.isDraggingOver
                          ? "bg-[#e8f7f5]/60 ring-2 ring-[#2d9e8a]/50 ring-offset-2 p-1"
                          : "p-0"
                        }
                      `}
                    >
                      {dayItem.activities.length === 0 ? (
                        <div
                          className={`
                            flex items-center justify-center h-[54px] rounded-2xl
                            transition-all duration-200
                            ${snapshot.isDraggingOver
                              ? "border-2 border-[#2d9e8a] bg-[#e8f7f5]"
                              : "border-[1.5px] border-dashed border-[#cde8e4]"
                            }
                          `}
                        >
                          <span
                            className={`text-sm transition-colors duration-200 ${
                              snapshot.isDraggingOver
                                ? "text-[#2d9e8a] font-medium"
                                : "text-[#a8d5cf]"
                            }`}
                          >
                            ⊕ Drop an activity here
                          </span>
                        </div>
                      ) : (
                        dayItem.activities.map((activity, index) => {
                          const removeKey = `${dayItem.day}-${index}`;
                          const editKey = `${dayItem.day}:${index}`;
                          const isSelected =
                            selectedActivity?.title === activity.title &&
                            selectedActivity?.time === activity.time;
                          const drawerDescription = isSelected
                            ? (descriptionCache.get(activity.title) ?? null)
                            : null;

                          const prevActivity = index > 0 ? dayItem.activities[index - 1] : null;
                          const showTransitLink =
                            showTransitLinks &&
                            prevActivity &&
                            hasValidCoords(prevActivity) &&
                            hasValidCoords(activity);

                          const touchKey = `${dayItem.day}:${activity.title}`;
                          const touchInfo = touched.get(touchKey);

                          return (
                            <React.Fragment key={`${dayItem.day}-${activity.title}-${index}`}>
                              {showTransitLink && (
                                <a
                                  href={transitDirectionsUrl(prevActivity!, activity)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center justify-center gap-1 py-1 text-[11px] text-[#2d9e8a] hover:text-[#1a6b5e] hover:underline"
                                >
                                  🚌 Public transit directions
                                </a>
                              )}
                              <Draggable
                                draggableId={`${dayItem.day}-${activity.title}-${index}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <DraggableCard
                                      activity={activity}
                                      dragHandleProps={provided.dragHandleProps}
                                      isDragging={snapshot.isDragging}
                                      removeMode={removeMode}
                                      isRemoving={removingKeys.has(removeKey)}
                                      isSelected={isSelected}
                                      onRemove={() =>
                                        handleRemoveActivity(dayItem.day, index)
                                      }
                                      onCardClick={() => handleCardClick(activity)}
                                      drawerDescription={drawerDescription}
                                      descriptionLoading={
                                        isSelected ? descriptionLoading : false
                                      }
                                      onOpenLightbox={openLightbox}
                                      destination={destination}
                                      isEnriching={enrichingKeys.has(`${dayItem.day}:${activity.title}`)}
                                      onEdit={() => {
                                        setEditingKey(editKey === editingKey ? null : editKey);
                                        setAddingDay(null);
                                      }}
                                      isAiTouched={!!touchInfo}
                                      aiBadgeText={touchInfo?.addedByAI ? "Added by AI" : "AI updated"}
                                      aiWasLine={
                                        touchInfo && !touchInfo.addedByAI && touchInfo.wasActivity
                                          ? `${touchInfo.wasActivity.title} · ${touchInfo.wasActivity.time}`
                                          : undefined
                                      }
                                      onUndoAiChange={() => handleUndoTouch(touchKey, dayItem.day)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                              {editingKey === editKey && (
                                <ActivityForm
                                  isEditing
                                  initialActivity={activity}
                                  onSubmit={(updated, locName) =>
                                    handleSaveActivity(dayItem.day, index, updated, locName)
                                  }
                                  onCancel={() => setEditingKey(null)}
                                />
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Add activity — only visible in edit mode */}
                {removeMode && (
                  addingDay === dayItem.day ? (
                    <ActivityForm
                      onSubmit={(activity, locationName) => handleAddActivity(dayItem.day, activity, locationName)}
                      onCancel={() => setAddingDay(null)}
                    />
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAddingDay(dayItem.day); setEditingKey(null); }}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2
                                 text-xs font-medium text-[#2d9e8a] rounded-xl border border-dashed
                                 border-[#2d9e8a]/40 hover:border-[#2d9e8a] hover:bg-[#f0faf8]
                                 transition-all duration-150"
                    >
                      + Add activity
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Lightbox — fixed overlay, rendered at panel root to avoid clipping */}
      {lightboxOpen && (
        <Lightbox
          images={lightboxImages}
          fallbackImages={lightboxFallbackImages}
          attributions={lightboxAttributions}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
};

export default ItineraryPanel;
