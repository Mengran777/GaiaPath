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
  onOpenLightbox?: (images: string[], index: number) => void;
  destination?: string;
}

// ── Lightbox ───────────────────────────────────────────────────────────────────

interface LightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}

const Lightbox: React.FC<LightboxProps> = ({ images, index, onClose, onChange }) => {
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
    </div>
  );
};

// Module-level cache so all card instances share fetched results across renders
const wikiImagesCache = new Map<string, string[]>();

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
          : { borderColor: isSelected ? "#2d9e8a" : hovered ? "#2d9e8a" : "transparent" }
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Card row ── */}
      <div
        className="flex items-stretch bg-white cursor-pointer"
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
          {activity.imageUrl && (
            <img
              src={activity.imageUrl}
              alt={activity.title}
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0 shadow-sm"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[#0d3d38] mb-1 truncate">
              {activity.title}
            </h3>
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

        {/* Remove button */}
        <div
          className={`
            flex items-center justify-center flex-shrink-0 bg-red-50 border-l border-red-100
            overflow-hidden transition-all duration-300 ease-out
            ${removeMode ? "w-11 opacity-100" : "w-0 opacity-0"}
          `}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-full h-full flex items-center justify-center text-xl font-light
                       text-red-400 hover:text-white hover:bg-red-400
                       transition-colors duration-150"
            title="Remove activity"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Inline accordion drawer ── */}
      <div
        style={{
          maxHeight: isSelected && !isDragging ? 300 : 0,
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
            {/* Main image — 120×90 */}
            {activity.imageUrl ? (
              <button
                className="flex-shrink-0 rounded-lg overflow-hidden focus:outline-none"
                style={{ width: 120, height: 90 }}
                onClick={() => onOpenLightbox?.(galleryImages, 0)}
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
                style={{ width: 120, height: 90 }}
              >
                🏛️
              </div>
            )}

            {/* Wikipedia images — 64×90 each, or skeletons while loading */}
            {wikiLoading ? (
              <>
                <div className="flex-shrink-0 rounded-lg bg-gray-100 animate-pulse" style={{ width: 64, height: 90 }} />
                <div className="flex-shrink-0 rounded-lg bg-gray-100 animate-pulse" style={{ width: 64, height: 90 }} />
              </>
            ) : wikiImages.length > 0 ? (
              wikiImages.map((src, i) => (
                <button
                  key={src}
                  className="flex-shrink-0 rounded-lg overflow-hidden focus:outline-none"
                  style={{ width: 64, height: 90 }}
                  onClick={() => onOpenLightbox?.(galleryImages, i + (activity.imageUrl ? 1 : 0))}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))
            ) : (
              <div
                className="flex-shrink-0 rounded-lg bg-[#f5f2ee] flex items-center justify-center text-2xl border border-[#e8e4df]"
                style={{ width: 64, height: 90 }}
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
            {descriptionLoading && !drawerDescription ? (
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
}) => {
  const [localItinerary, setLocalItinerary] = useState<DayItinerary[]>(itinerary);
  const [removeMode, setRemoveMode] = useState(false);
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());
  const [editSnapshot, setEditSnapshot] = useState<DayItinerary[] | null>(null);
  const [undoStack, setUndoStack] = useState<{
    dayNumber: number;
    index: number;
    activity: Activity;
  }[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Drawer state (shared across all cards)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [descriptionCache, setDescriptionCache] = useState<Map<string, string>>(new Map());
  const [descriptionLoading, setDescriptionLoading] = useState(false);

  // Lightbox state (panel-level so fixed overlay isn't clipped)
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
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

  const openLightbox = useCallback((imgs: string[], idx: number) => {
    setLightboxImages(imgs);
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
  };

  // Enter / exit edit mode
  const enterEditMode = useCallback(() => {
    setEditSnapshot(localItinerary.map((d) => ({ ...d, activities: [...d.activities] })));
    setUndoStack([]);
    setRemoveMode(true);
  }, [localItinerary]);

  const exitEditMode = useCallback(() => {
    setRemoveMode(false);
    setEditSnapshot(null);
    setUndoStack([]);
  }, []);

  // Discard all edits and restore snapshot
  const handleDiscard = useCallback(() => {
    if (editSnapshot) setLocalItinerary(editSnapshot);
    setRemoveMode(false);
    setEditSnapshot(null);
    setUndoStack([]);
  }, [editSnapshot]);

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
      {/* Back button */}
      {onBackToRoutes && (
        <button
          onClick={onBackToRoutes}
          className="flex items-center gap-1.5 text-sm text-[#1a6b5e] hover:text-[#0d3d38] font-medium mb-4 transition-colors group"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="group-hover:underline">Back to routes</span>
        </button>
      )}

      {/* Header */}
      <div
        className="mb-5 pb-4 border-b-2 border-gray-100 cursor-pointer hover:bg-gray-50 rounded-lg p-4 -mx-4 transition-colors duration-200"
        onClick={() => onDayClick && onDayClick(0)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Your Itinerary</h2>
            <p className="text-gray-500 text-sm">
              {highlightedDay === null || highlightedDay === 0
                ? "Click a day to filter · drag to reorder"
                : "Click here to show all days again"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onToggleFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className={`w-9 h-9 rounded-full flex items-center justify-center
                           text-base leading-none transition-all duration-150
                           ${isFavorite
                             ? "bg-[#c9a96e] border-[1.5px] border-[#c9a96e] text-white"
                             : "bg-white border-[1.5px] border-[#e8e4df] text-[#b0b0b0] hover:border-[#c9a96e]"
                           }`}
              >
                {isFavorite ? "★" : "☆"}
              </button>
            )}
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
                  onClick={(e) => { e.stopPropagation(); exitEditMode(); }}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 bg-red-500 text-white border-red-500 shadow-sm"
                >
                  ✓ Done
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
          <div ref={panelRef}>
            {localItinerary.map((dayItem) => (
              <div
                key={dayItem.day}
                onClick={() => onDayClick && onDayClick(dayItem.day)}
                className={`
                  itinerary-day-animated relative border-l-4 pl-6 mb-8 cursor-pointer
                  transition-all duration-500 ease-in-out
                  ${highlightedDay === dayItem.day
                    ? "border-[#1a6b5e] bg-[#f0faf8]/50 -ml-4 pl-10 rounded-r-2xl py-2"
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
                      ? "bg-gradient-to-br from-[#0d3d38] to-[#2d9e8a] scale-125"
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
                          const isSelected =
                            selectedActivity?.title === activity.title &&
                            selectedActivity?.time === activity.time;
                          const drawerDescription = isSelected
                            ? (descriptionCache.get(activity.title) ?? null)
                            : null;

                          return (
                            <Draggable
                              key={`${dayItem.day}-${activity.title}-${index}`}
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
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Lightbox — fixed overlay, rendered at panel root to avoid clipping */}
      {lightboxOpen && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
};

export default ItineraryPanel;
