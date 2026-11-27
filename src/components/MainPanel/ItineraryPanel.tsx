// src/components/MainPanel/ItineraryPanel.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { DayItinerary, Activity, Location } from "../../types/itinerary";
import UnsplashCredit from "../UI/UnsplashCredit";
import Lozenge from "../UI/Lozenge";
import { retimeDay } from "@/lib/retime";
import type { PhotoViewState } from "./PhotoViewer";
import { Loader2 } from "lucide-react";

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
  /** Open a stop's photos in the page's photo pane; return false to use the fullscreen viewer */
  onOpenPhotos?: (view: PhotoViewState) => boolean;
  /** Every change to the itinerary, so the session keeps edits even without "Done" */
  onDraftChange?: (itinerary: DayItinerary[]) => void;
  /** Route name shown as the page title */
  routeTitle?: string;
  /** One quiet line under the title, e.g. "Athens, May 14 — 18" */
  routeSubtitle?: string;
  /** A stop picked on the map: open its row (nonce makes repeat clicks count) */
  focusStop?: { name: string; latitude: number; longitude: number; nonce: number } | null;
  /** Wide screens: whether the side pane (map / photos) is open, and its icon */
  paneOpen?: boolean;
  onTogglePane?: () => void;
  /** A stop was opened (true) or closed (false) by clicking its row */
  onStopOpenChange?: (open: boolean) => void;
  /** Phones: the trip's opening (cover, title, highlights), shown above the overview */
  opening?: React.ReactNode;
  /** Wide screens: the section in view while the page scrolls (0 = the overview) */
  onVisibleDayChange?: (day: number) => void;
}

/** Side-pane icon: a frame with its right column, filled while the pane is open */
const PaneIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg viewBox="0 0 20 20" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <rect x="2.5" y="3.5" width="15" height="13" />
    <line x1="12.5" y1="3.5" x2="12.5" y2="16.5" />
    <rect x="12.5" y="3.5" width="5" height="13" fill="currentColor" stroke="none" className={`transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
  </svg>
);

const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV"];
const toRoman = (n: number) => ROMAN[n - 1] ?? String(n);

// "2027-05-14" -> "Friday, 14 May"; anything unparseable is shown as-is
const formatDayDate = (date: string) => {
  const m = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return date;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

// "2027-05-14" -> "Fri 14"
const shortDay = (date: string) => {
  const m = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return date;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.getDate()}`;
};

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
  onOpenLightbox?: (
    images: string[],
    index: number,
    attributions?: ({ photographerName: string; photographerUrl: string } | null)[],
    meta?: { title: string; description?: string | null },
  ) => void;
  destination?: string;
  isEnriching?: boolean;
  onEdit?: () => void;
  // AI-modify state — set when this exact activity was touched by the AI composer
  isAiTouched?: boolean;
  aiBadgeText?: string;
  aiWasLine?: string;
  onUndoAiChange?: () => void;
  /** Save the traveller's own note for this stop ("" clears it) */
  onNoteChange?: (note: string) => void;
}

/**
 * The traveller's note for one stop: a quiet underlined field that grows with
 * the text. Saves after a short pause and on leaving the field.
 */
const StopNote: React.FC<{ value: string; title: string; onSave: (note: string) => void }> = ({ value, title, onSave }) => {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | null>(null);

  // Follow outside changes (undo, another tab of the drawer) while not typing
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  // Grow with the text
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  const commit = (text: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (text.trim() !== value.trim()) onSave(text.trim());
  };

  return (
    <div className="mt-5 max-w-[560px]" onClick={(e) => e.stopPropagation()}>
      <label htmlFor={`note-${title}`} className="eyebrow">Your note</label>
      <textarea
        id={`note-${title}`}
        ref={ref}
        rows={1}
        value={draft}
        maxLength={1000}
        placeholder="Tickets, what to order, who you're meeting…"
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => commit(text), 600);
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
        }}
        className="field-line select-text resize-none overflow-hidden text-[15px] leading-relaxed text-ink placeholder:text-ink-muted/70"
      />
    </div>
  );
};

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
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center overscroll-contain"
      onClick={onClose}
    >
      {images.length > 1 && (
        <button
          type="button"
          className="absolute left-6 top-1/2 -translate-y-1/2 px-2 py-3 text-[11px] tracking-[0.08em] uppercase text-white opacity-70 hover:opacity-100 transition-opacity duration-500"
          onClick={(e) => { e.stopPropagation(); prev(); }}
        >
          Previous
        </button>
      )}

      <img
        src={images[index]}
        alt=""
        className="max-w-[80vw] max-h-[82vh] object-contain"
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
          type="button"
          className="absolute right-6 top-1/2 -translate-y-1/2 px-2 py-3 text-[11px] tracking-[0.08em] uppercase text-white opacity-70 hover:opacity-100 transition-opacity duration-500"
          onClick={(e) => { e.stopPropagation(); next(); }}
        >
          Next
        </button>
      )}

      <button
        type="button"
        className="absolute top-5 right-6 px-2 py-2 text-[11px] tracking-[0.08em] uppercase text-white opacity-70 hover:opacity-100 transition-opacity duration-500"
        onClick={onClose}
      >
        Close
      </button>

      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 text-xs tabular-nums" aria-live="polite">
          {index + 1} of {images.length}
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

// Extra Unsplash photos for a stop's drawer, shared across card instances so
// reopening a stop doesn't search again (Unsplash API calls are rate limited)
type DrawerPhoto = { url: string; photographerName: string; photographerUrl: string };
const drawerPhotoCache = new Map<string, DrawerPhoto[]>();

// Asks Unsplash for a wider rendition (search results come back at 400px)
function sizedPhoto(url: string, width: number): string {
  return url.includes("images.unsplash.com") ? url.replace(/([?&]w=)\d+/, `$1${width}`) : url;
}

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
  { label: "Fewer steps", prompt: "Too much walking — swap something for a relaxed spot" },
  { label: "More local tables", prompt: "Add more local food stops" },
  { label: "Somewhere quieter", prompt: "Feels too crowded — find quieter alternatives" },
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
  onNoteChange,
}) => {
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [extraPhotos, setExtraPhotos] = useState<DrawerPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  // Scroll into view when accordion opens
  useEffect(() => {
    if (!isSelected) return;
    const timer = setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    return () => clearTimeout(timer);
  }, [isSelected]);

  // Fetch two more Unsplash photos of this stop when its drawer first opens
  useEffect(() => {
    if (!isSelected) return;
    const cacheKey = `${activity.title}|${destination}`;
    const cached = drawerPhotoCache.get(cacheKey);
    if (cached) {
      setExtraPhotos(cached);
      return;
    }
    let cancelled = false;
    setPhotosLoading(true);
    fetch("/api/activity-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: activity.title, destination, count: 4 }),
    })
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d) => {
        // Drop the photo the card already shows, keep up to two others
        const imgs: DrawerPhoto[] = ((d?.images ?? []) as DrawerPhoto[])
          // compare by image path: the same photo returns with a different
          // tracking query (ixid) on every search
          .filter((p) => p.url.split("?")[0] !== activity.imageUrl?.split("?")[0])
          .slice(0, 2);
        drawerPhotoCache.set(cacheKey, imgs);
        if (!cancelled) setExtraPhotos(imgs);
      })
      .catch(() => drawerPhotoCache.set(cacheKey, []))
      .finally(() => !cancelled && setPhotosLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isSelected, activity.title, activity.imageUrl, destination]);

  // The drawer's photos: the card's own photo first, then the extra ones.
  // De-duplicated by image path (Unsplash adds a different query string per search).
  const photos = useMemo(() => {
    const list: { url: string; credit: { photographerName: string; photographerUrl: string } | null }[] = [];
    const seen = new Set<string>();
    const add = (url: string, credit: { photographerName: string; photographerUrl: string } | null) => {
      const key = url.split("?")[0];
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ url, credit });
    };
    if (activity.imageUrl) add(activity.imageUrl, activity.imageAttribution ?? null);
    extraPhotos.forEach((p) => add(p.url, { photographerName: p.photographerName, photographerUrl: p.photographerUrl }));
    return list.slice(0, 3);
  }, [activity.imageUrl, activity.imageAttribution, extraPhotos]);
  // Treat "not searched yet" as loading, so the no-photo panel never flashes
  // in before the first search has even started
  const photosPending = photosLoading || (isSelected && !drawerPhotoCache.has(`${activity.title}|${destination}`));
  const galleryImages = useMemo(() => photos.map((p) => p.url), [photos]);
  const galleryAttributions = useMemo(() => photos.map((p) => p.credit), [photos]);

  const timeLabel = activity.time ? activity.time.replace("-", "–") : "";

  return (
    <div
      ref={containerRef}
      className={`group/stop select-none scroll-mt-4 md:scroll-mt-16 border-b border-line transition-[opacity,transform,background-color,outline-color] duration-300 ease-editorial
        ${isRemoving ? "opacity-0 -translate-x-6" : "opacity-100"}
        ${isDragging ? "bg-white outline outline-1 outline-ink -rotate-[0.6deg]" : isSelected ? "bg-brand-50" : "hover:bg-brand-50/60"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Row ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isSelected}
        aria-label={`${activity.title}${timeLabel ? `, ${timeLabel}` : ""}`}
        className="flex items-start gap-3 py-4 pr-2 cursor-pointer focus-visible:outline-offset-[-1px]"
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCardClick();
          }
        }}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Drag to reorder ${activity.title}`}
          className={`flex items-center justify-center w-5 pt-1.5 flex-shrink-0 cursor-grab active:cursor-grabbing text-ink transition-opacity duration-500
            ${removeMode || isDragging ? "opacity-70" : hovered ? "opacity-40" : "opacity-0"}`}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
            <circle cx="2" cy="3" r="1.2" /><circle cx="8" cy="3" r="1.2" />
            <circle cx="2" cy="8" r="1.2" /><circle cx="8" cy="8" r="1.2" />
            <circle cx="2" cy="13" r="1.2" /><circle cx="8" cy="13" r="1.2" />
          </svg>
        </div>

        <span className="w-[86px] flex-shrink-0 pt-1 text-xs text-ink-muted tabular-nums">{timeLabel}</span>

        <div className="flex-1 min-w-0">
          {isAiTouched && (
            <p className="eyebrow !text-gold-500 mb-1">{(aiBadgeText ?? "AI updated").replace(/^AI/, "Gaia")}</p>
          )}
          <h3 className="font-display text-[22px] leading-snug text-ink">{activity.title}</h3>
          {aiWasLine && <p className="mt-0.5 text-[13px] text-ink-muted line-through">Was: {aiWasLine}</p>}
          {activity.note && !isSelected && (
            <p className="mt-1.5 font-display italic text-[15px] text-ink-soft line-clamp-1">
              <span className="sr-only">Your note: </span>{activity.note}
            </p>
          )}
        </div>

        {/* Edit-mode actions slide in */}
        {removeMode ? (
          <div className="flex items-center gap-4 pt-1 flex-shrink-0 text-[13px]">
            {isAiTouched && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onUndoAiChange?.(); }} className="link-quiet">
                {aiWasLine ? "Undo change" : "Remove addition"}
              </button>
            )}
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="link-quiet">
              Edit
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="link-quiet hover:!text-gold-500">
              Remove
            </button>
          </div>
        ) : isEnriching ? (
          <Loader2 className="w-4 h-4 mt-2 animate-spin text-ink-muted flex-shrink-0" aria-label="Finding details" />
        ) : null}
      </div>

      {/* ── Inline drawer ── */}
      <div
        style={{
          maxHeight: isSelected && !isDragging ? 900 : 0,
          transition: "max-height 0.45s cubic-bezier(0.25,1,0.5,1)",
          overflow: "hidden",
        }}
      >
        <div className="pl-[124px] pr-4 pb-6">
          {/* Photos: a magazine spread. One large photo (2/3) with two stacked
              beside it; one photo alone goes full width. Credits sit under the
              lead photo; the smaller ones show theirs on hover. */}
          {photos.length === 0 && photosPending ? (
            <div className="grid grid-cols-[2fr_1fr] gap-1.5 max-w-[560px]" aria-hidden="true">
              <div className="aspect-[4/3] bg-surface-dim animate-pulse" />
              <div className="grid grid-rows-2 gap-1.5">
                <div className="bg-surface-dim animate-pulse" />
                <div className="bg-surface-dim animate-pulse" />
              </div>
            </div>
          ) : photos.length > 0 ? (
            <figure className="max-w-[560px] m-0">
              <div className={photos.length > 1 || photosPending ? "grid grid-cols-[2fr_1fr] gap-1.5" : ""}>
                <button
                  type="button"
                  className={`group/lead relative block w-full overflow-hidden cursor-pointer ${photos.length > 1 || photosPending ? "aspect-[4/3]" : "aspect-[16/9]"}`}
                  onClick={(e) => { e.stopPropagation(); onOpenLightbox?.(galleryImages, 0, galleryAttributions, { title: activity.title, description: drawerDescription ?? activity.description }); }}
                  aria-label={`Open photo of ${activity.title}`}
                >
                  <img src={sizedPhoto(photos[0].url, 900)} alt={activity.title} className="w-full h-full object-cover transition-transform duration-[1100ms] ease-editorial group-hover/lead:scale-[1.04]" />
                </button>
                {(photos.length > 1 || photosPending) && (
                  <div className={`grid gap-1.5 min-h-0 ${photos.length === 2 && !photosPending ? "grid-rows-1" : "grid-rows-2"}`}>
                    {(photos.length === 2 && !photosPending ? [1] : [1, 2]).map((i) =>
                      photos[i] ? (
                        <button
                          key={photos[i].url}
                          type="button"
                          className="group/thumb relative block overflow-hidden cursor-pointer min-h-0"
                          onClick={(e) => { e.stopPropagation(); onOpenLightbox?.(galleryImages, i, galleryAttributions, { title: activity.title, description: drawerDescription ?? activity.description }); }}
                          aria-label={`Open photo ${i + 1} of ${photos.length}`}
                        >
                          <img src={photos[i].url} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1100ms] ease-editorial group-hover/thumb:scale-[1.04]" />
                        </button>
                      ) : (
                        <div key={i} className={`bg-surface-dim ${photosPending ? "animate-pulse" : ""}`} aria-hidden="true" />
                      )
                    )}
                  </div>
                )}
              </div>
              {photos[0].credit && (
                <figcaption className="mt-1.5">
                  <UnsplashCredit
                    photographerName={photos[0].credit.photographerName}
                    photographerUrl={photos[0].credit.photographerUrl}
                    className="!text-ink-muted !drop-shadow-none"
                  />
                </figcaption>
              )}
            </figure>
          ) : !isEnriching ? (
            <div className="max-w-[560px] aspect-[16/9] bg-brand-100 flex flex-col items-center justify-center px-8 text-center" aria-hidden="true">
              <span className="font-display text-[26px] leading-tight text-ink line-clamp-2">{activity.title}</span>
              <span className="eyebrow mt-3">No photo yet</span>
            </div>
          ) : null}

          {/* Description */}
          {(descriptionLoading && !drawerDescription) || (isEnriching && !drawerDescription && !activity.description) ? (
            <div className="space-y-2 mt-4 max-w-[560px]">
              <div className="h-2.5 bg-surface-dim animate-pulse w-full" />
              <div className="h-2.5 bg-surface-dim animate-pulse w-4/5" />
              <div className="h-2.5 bg-surface-dim animate-pulse w-3/5" />
            </div>
          ) : (
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft max-w-[560px]">
              {drawerDescription ?? activity.description}
            </p>
          )}
          {(activity.rating != null || activity.price) && (
            <p className="mt-3 text-xs text-ink-muted">
              {[activity.rating != null ? `Rated ${activity.rating}` : null, activity.price || null].filter(Boolean).join(" · ")}
            </p>
          )}

          {onNoteChange && (
            <StopNote value={activity.note ?? ""} title={activity.title} onSave={onNoteChange} />
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCardClick(); }}
            className="link-quiet mt-4 text-[13px]"
          >
            Close
          </button>
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
      className="my-2 px-5 pt-4 pb-5 bg-brand-50"
    >
      <p className="eyebrow mb-2">{isEditing ? "Edit stop" : "Add a stop"}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <div className="sm:col-span-2">
          <label htmlFor="af-title" className="eyebrow block">Name</label>
          <input
            id="af-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Visit the Eiffel Tower…"
            name="stop-name"
            autoComplete="off"
            required
            className="field-line font-display text-[20px]"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="af-desc" className="eyebrow block">Description</label>
          <input
            id="af-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional short description"
            className="field-line text-[15px]"
          />
        </div>

        <div className="sm:col-span-2">
          <p className="eyebrow mb-1">Time</p>
          <div className="flex flex-wrap gap-0.5">
            {([
              { key: "morning", label: "Morning" },
              { key: "afternoon", label: "Afternoon" },
              { key: "evening", label: "Evening" },
              { key: "custom", label: "Custom" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={timePreset === key}
                onClick={() => setTimePreset(timePreset === key ? null : key)}
                className="pill-sand text-[15px] !px-3 !py-1"
              >
                {label}
              </button>
            ))}
          </div>
          {timePreset === "custom" && (
            <div className="mt-2 flex items-center gap-3 max-w-xs">
              <input type="time" value={customStart} onChange={(e) => setCustomStart(e.target.value)} aria-label="Start time" className="field-line text-sm" />
              <span className="text-ink-muted text-sm flex-shrink-0">to</span>
              <input type="time" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} aria-label="End time" className="field-line text-sm" />
            </div>
          )}
          {timePreset && <p className="mt-1.5 text-xs text-ink-muted">{getTimeLabel()}</p>}
        </div>

        <div>
          <label htmlFor="af-price" className="eyebrow block">Price</label>
          <input
            id="af-price"
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Free, or €10"
            className="field-line text-[15px]"
          />
        </div>

        <div ref={locWrapperRef} className="relative">
          <label htmlFor="af-loc" className="eyebrow block">Location</label>
          <div className="relative">
            <input
              id="af-loc"
              type="text"
              value={locationQuery}
              onChange={(e) => {
                setLocationQuery(e.target.value);
                setSelectedLocationName("");
                if (!isEditing) { setLat(0); setLon(0); }
              }}
              placeholder={isEditing ? "Search to change the place" : "Search a place"}
              className="field-line text-[15px] pr-7"
            />
            {loadingLoc && (
              <Loader2 size={14} className="absolute right-0 top-1/2 -translate-y-1/2 animate-spin text-ink-muted" aria-hidden="true" />
            )}
            {selectedLocationName && !loadingLoc && (
              <Lozenge className="absolute right-1 top-1/2 -translate-y-1/2 w-[8px] h-[8px] text-ink" />
            )}
          </div>
          {isEditing && hasCoords && !selectedLocationName && (
            <p className="mt-1 text-xs text-ink-muted">
              Current place saved ({initialActivity!.latitude!.toFixed(4)}, {initialActivity!.longitude!.toFixed(4)})
            </p>
          )}
          {isEditing && <p className="mt-1 text-xs text-ink-muted">Changing the place refreshes the photo and description.</p>}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectLocation(s)}
                  className="w-full text-left px-3 py-2.5 hover:bg-brand-50 transition-colors border-b border-line last:border-b-0"
                >
                  <span className="block font-display text-[16px] text-ink">{s.name}</span>
                  <span className="block text-xs text-ink-muted truncate">{s.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 mt-6">
        <button type="submit" disabled={!title.trim()} className="btn-ink !h-10 !px-6">
          {isEditing ? "Save changes" : "Add stop"}
        </button>
        <button type="button" onClick={onCancel} className="link-quiet text-[13px]">
          Cancel
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
  destination = "",
  transportationModes = [],
  userId,
  onSave,
  isSaving = false,
  onDraftChange,
  onOpenPhotos,
  focusStop,
  paneOpen = false,
  onTogglePane,
  onStopOpenChange,
  opening,
  onVisibleDayChange,
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
  const askInputRef = useRef<HTMLTextAreaElement>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatusText, setAiStatusText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  // Wide screens: which section is in view (overview = 0, else the day), for the
  // map and the header index. The page scrolls there; phones scroll the list.
  const [visibleSection, setVisibleSection] = useState(0);
  const [pastOpening, setPastOpening] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

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

  useEffect(() => {
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const glance = document.getElementById("trip-glance");
      if (!glance) return;
      setPastOpening(glance.getBoundingClientRect().top < window.innerHeight * 0.6);
      let current = 0;
      for (const d of localItinerary) {
        const el = document.getElementById(`day-section-${d.day}`);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) current = d.day;
      }
      setVisibleSection((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [localItinerary]);

  // Tell the page when the section in view changes (not on first render)
  const lastReported = useRef(0);
  useEffect(() => {
    if (lastReported.current === visibleSection) return;
    lastReported.current = visibleSection;
    onVisibleDayChange?.(visibleSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSection]);

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

  // Map marker clicked: open that stop's row (its own effect scrolls it into view)
  useEffect(() => {
    if (!focusStop) return;
    for (const day of localItinerary) {
      const hit = day.activities.find(
        (a) => a.title === focusStop.name && a.latitude === focusStop.latitude && a.longitude === focusStop.longitude
      );
      if (hit) {
        setSelectedActivity(hit);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStop?.nonce]);

  // Card click: toggle accordion + trigger map flyTo/popup
  const handleCardClick = useCallback(
    (activity: Activity) => {
      const isSame =
        selectedActivity?.title === activity.title &&
        selectedActivity?.time === activity.time;

      if (isSame) {
        setSelectedActivity(null);
        onStopOpenChange?.(false);
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
        onStopOpenChange?.(true);
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
    [selectedActivity, onActivityClick, onStopOpenChange]
  );

  // A day chosen (tabs or a day's heading): close any open stop, show the day
  const pickDay = (dayNumber: number) => {
    setSelectedActivity(null);
    onDayClick?.(dayNumber);
  };

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

  const openLightbox = useCallback((
    imgs: string[],
    idx: number,
    attributions?: ({ photographerName: string; photographerUrl: string } | null)[],
    meta?: { title: string; description?: string | null },
  ) => {
    // Wide screens: photos open in the right-hand pane in place of the map
    if (meta && onOpenPhotos?.({ title: meta.title, description: meta.description, images: imgs, attributions: attributions ?? [], index: idx })) {
      return;
    }
    setLightboxFallbackImages(imgs);
    setLightboxImages(imgs.map(toHdUrl));
    setLightboxAttributions(attributions ?? []);
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, [onOpenPhotos]);

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

    const sameDay = srcDay === dstDay;
    const dstBefore = [...dstDay.activities];
    const [moved] = srcDay.activities.splice(source.index, 1);
    dstDay.activities.splice(destination.index, 0, moved);

    // Re-time the day the stop landed in: its original start times are the
    // slots, each stop keeps its duration (see lib/retime.ts)
    dstDay.activities = retimeDay(dstDay.activities, sameDay ? dstBefore : [...dstBefore, moved]);

    setLocalItinerary(next);
    setRetimedDay(dstDay.day);
  };

  // Brief "Times adjusted" note on the day that was re-timed
  const [retimedDay, setRetimedDay] = useState<number | null>(null);
  useEffect(() => {
    if (retimedDay === null) return;
    const t = setTimeout(() => setRetimedDay(null), 3200);
    return () => clearTimeout(t);
  }, [retimedDay]);

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

      // New or swapped-in stops arrive without a photo: find one on Unsplash
      for (const op of data.operations) {
        if (!op.activity || op.activity.imageUrl) continue;
        const { day, activity } = op;
        const enrichKey = `${day}:${activity.title}`;
        setEnrichingKeys((prev) => new Set(prev).add(enrichKey));
        fetch("/api/activity-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: activity.title, destination }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((img) => {
            if (!img?.imageUrl) return;
            setLocalItinerary((prev) =>
              prev.map((d) =>
                d.day !== day
                  ? d
                  : {
                      ...d,
                      activities: d.activities.map((a) =>
                        a.title === activity.title && !a.imageUrl
                          ? { ...a, imageUrl: img.imageUrl, imageAttribution: img.imageAttribution ?? undefined }
                          : a
                      ),
                    }
              )
            );
          })
          .catch(() => {})
          .finally(() =>
            setEnrichingKeys((prev) => {
              const next = new Set(prev);
              next.delete(enrichKey);
              return next;
            })
          );
      }
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

  // Detect whether localItinerary differs from the original itinerary prop.
  // Compares full content so edits to time/description/price also count.
  const hasChanges = useMemo(
    () => JSON.stringify(localItinerary) !== JSON.stringify(itinerary),
    [localItinerary, itinerary]
  );

  // Keep the session copy in step with every edit (drag, remove, edit, AI),
  // so leaving and coming back shows the edited trip even without "Done"
  useEffect(() => {
    if (hasChanges) onDraftChange?.(localItinerary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localItinerary]);

  // The traveller's note on one stop
  const handleNoteChange = (dayNumber: number, activityIndex: number, note: string) => {
    setLocalItinerary((prev) =>
      prev.map((d) =>
        d.day === dayNumber
          ? {
              ...d,
              activities: d.activities.map((a, i) => {
                if (i !== activityIndex) return a;
                const next = { ...a };
                if (note) next.note = note;
                else delete next.note;
                return next;
              }),
            }
          : d
      )
    );
  };

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

  const stopCount = localItinerary.reduce((n, d) => n + d.activities.length, 0);

  // The day's photo for its opener: its first stop with one
  const dayPhoto = (d: DayItinerary) => {
    const url = d.activities.find((a) => a.imageUrl)?.imageUrl;
    return url ? sizedPhoto(url, 1400) : null;
  };

  const jumpToDay = (day: number) => {
    pickDay(day);
    document.getElementById(`day-section-${day}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const jumpToStop = (day: number, index: number, activity: Activity) => {
    if (!(selectedActivity?.title === activity.title && selectedActivity?.time === activity.time)) handleCardClick(activity);
    window.setTimeout(() => {
      document.getElementById(`stop-${day}-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 480); // after another open stop has folded away (450ms) and the row's own scroll, so this lands right
  };

  // A slim bar of its own at the top once past the opening (the header has scrolled
  // away). Rendered into <body>: the list column is transformed, which would break fixed.
  const indexBar = portalReady && localItinerary.length > 0
    ? createPortal(
        <nav
          aria-label="Trip sections"
          className={`hidden md:flex fixed top-0 inset-x-0 h-12 z-40 bg-white items-center justify-between px-5 lg:px-12 font-display text-[16px] transition-[transform,opacity] duration-500 ease-editorial ${pastOpening ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}
        >
          <div className="flex items-center gap-7">
          <button
            type="button"
            onClick={() => { pickDay(0); document.getElementById("trip-glance")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            aria-current={visibleSection === 0 ? "true" : undefined}
            className={`inline-flex items-center transition-colors duration-300 ${visibleSection === 0 ? "text-ink" : "text-ink-muted hover:text-ink"}`}
          >
            {visibleSection === 0 && <Lozenge className="w-[7px] h-[7px] mr-2 flex-shrink-0" />}
            At a glance
          </button>
          {localItinerary.map((d) => (
            <button
              key={d.day}
              type="button"
              onClick={() => jumpToDay(d.day)}
              aria-current={visibleSection === d.day ? "true" : undefined}
              className={`inline-flex items-center transition-colors duration-300 ${visibleSection === d.day ? "text-ink" : "text-ink-muted hover:text-ink"}`}
            >
              {visibleSection === d.day && <Lozenge className="w-[7px] h-[7px] mr-2 flex-shrink-0" />}
              {toRoman(d.day)} · {shortDay(d.date)}
            </button>
          ))}
          </div>
          {onTogglePane && (
            <button
              type="button"
              onClick={onTogglePane}
              aria-pressed={paneOpen}
              aria-label={paneOpen ? "Hide map" : "Show map"}
              title={paneOpen ? "Hide map" : "Show map"}
              className="p-1 -m-1 text-ink-muted hover:text-ink transition-colors duration-300 active:scale-[0.97]"
            >
              <PaneIcon open={paneOpen} />
            </button>
          )}
        </nav>,
        document.body
      )
    : null;

  return (
    <div className="relative">
      {/* Phones: the opening sits at the top of the list (wide screens show it full width above) */}
      {opening && <div className="md:hidden -mr-3 mb-10">{opening}</div>}

      {/* Wide screens: a day index in the header once past the opening */}
      {indexBar}

      {/* At a glance: the whole trip on one spread (the map beside it shows every stop) */}
      <section id="trip-glance" aria-labelledby="glance-title" className="md:pt-16 scroll-mt-4 md:scroll-mt-12">
        <div className="flex items-baseline justify-between gap-6">
          <h2 id="glance-title" className="font-display text-[40px] md:text-[48px] leading-none tracking-[-0.015em] text-ink">At a glance</h2>
          {!removeMode && (
            <button type="button" onClick={enterEditMode} className="link-quiet text-xs tracking-[0.06em] uppercase flex-shrink-0">
              Edit
            </button>
          )}
        </div>
        <p className="mt-3 font-display text-[19px] text-ink-soft">
          {localItinerary.length} {localItinerary.length === 1 ? "day" : "days"} · {stopCount} {stopCount === 1 ? "stop" : "stops"}
        </p>
        {localItinerary.map((d) => {
          const located = d.activities.some((a) => a.latitude && a.longitude && a.latitude !== 0 && a.longitude !== 0);
          return (
            <div key={d.day} className="mt-11">
              <button
                type="button"
                onClick={() => jumpToDay(d.day)}
                className="w-full flex items-baseline gap-4 pt-2 pb-3 px-2 -mx-2 border-b border-ink text-left transition-colors duration-300 hover:bg-brand-50"
              >
                <span className="font-display text-[36px] leading-none text-ink">{toRoman(d.day)}</span>
                <span className="font-display text-[19px] text-ink">{formatDayDate(d.date)}</span>
              </button>
              {d.activities.map((a, i) => (
                <button
                  key={`${a.title}-${i}`}
                  type="button"
                  onClick={() => jumpToStop(d.day, i, a)}
                  className="w-full grid grid-cols-[96px_1fr] items-baseline py-3 px-2 -mx-2 border-b border-line text-left transition-colors duration-300 hover:bg-brand-50"
                >
                  <span className="text-xs text-ink-muted tabular-nums">{a.time ? a.time.replace("-", "–") : ""}</span>
                  <span className="font-display text-[19px] text-ink">{a.title}</span>
                </button>
              ))}
              <p className="pt-2.5 text-xs text-ink-muted flex gap-4">
                <span>{d.activities.length} {d.activities.length === 1 ? "stop" : "stops"}</span>
                {located && (
                  <button type="button" onClick={(e) => handleDayRoute(e, d.activities)} className="link-quiet" title="Open this day's route in Google Maps">
                    Directions
                  </button>
                )}
              </p>
            </div>
          );
        })}
      </section>

      {/* Edit mode bar */}
      {removeMode && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 bg-brand-100">
          <p className="text-[13px]">
            <span className="eyebrow !text-ink">Editing</span>
            <span className="text-ink-soft"> · Drag a stop to move it, even into another day</span>
          </p>
          <div className="flex items-center gap-5">
            {undoStack.length > 0 && (
              <button type="button" onClick={handleUndo} className="link-quiet text-[13px]">
                Undo{undoStack.length > 1 ? ` (${undoStack.length})` : ""}
              </button>
            )}
            <button type="button" onClick={handleDiscard} className="link-quiet text-[13px]">
              Discard
            </button>
            <button
              type="button"
              onClick={() => {
                if (hasChanges && onSave) onSave(localItinerary);
                exitEditMode();
              }}
              disabled={isSaving}
              className="btn-ink !h-9 !px-5"
            >
              {isSaving ? "Saving…" : "Done"}
            </button>
          </div>
        </div>
      )}

      {/* Itinerary days */}
      {localItinerary.length === 0 ? (
        <p className="text-ink-muted py-8">Nothing planned here yet.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div ref={panelRef}>
            {localItinerary.map((dayItem) => (
              <section key={dayItem.day} id={`day-section-${dayItem.day}`} className="itinerary-day-animated mt-20 scroll-mt-4 md:scroll-mt-12">
                {/* Day opener: the day's photo scrolls under its numeral and date */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => pickDay(dayItem.day)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickDay(dayItem.day); } }}
                  aria-label={`Day ${toRoman(dayItem.day)}, ${formatDayDate(dayItem.date)}. Show this day on the map`}
                  className="group/opener relative h-56 md:h-[78vh] mb-4 overflow-clip bg-surface-dim cursor-pointer"
                >
                  {dayPhoto(dayItem) && (
                    <img src={dayPhoto(dayItem)!} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-editorial group-hover/opener:scale-[1.03]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-tr md:bg-gradient-to-br from-black/50 via-black/15 to-transparent" aria-hidden="true" />
                  <div className="absolute left-0 bottom-0 md:sticky md:top-12 md:bottom-auto p-6 md:p-8 text-white">
                    <p className="font-display text-[64px] md:text-[112px] leading-[0.8]">{toRoman(dayItem.day)}</p>
                    <p className="mt-3 font-display text-[19px] md:text-[24px]">{formatDayDate(dayItem.date)}</p>
                  </div>
                  {retimedDay === dayItem.day && (
                    <span className="absolute right-5 bottom-4 text-xs text-white animate-card-enter" role="status">Times adjusted</span>
                  )}
                </div>

                <Droppable droppableId={`day-${dayItem.day}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`transition-colors duration-300 ${snapshot.isDraggingOver ? "bg-brand-100/60" : ""}`}
                    >
                      {dayItem.activities.length === 0 ? (
                        <div className={`flex items-center h-[56px] pl-[124px] text-sm transition-colors duration-300 ${snapshot.isDraggingOver ? "bg-brand-100 text-ink" : "text-ink-muted"}`}>
                          Drop a stop here
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
                                  className="block pl-[124px] py-1.5 text-xs link-quiet border-b border-line"
                                >
                                  Public transit directions
                                </a>
                              )}
                              <Draggable
                                draggableId={`${dayItem.day}-${activity.title}-${index}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    id={`stop-${dayItem.day}-${index}`}
                                    className="scroll-mt-4 md:scroll-mt-16"
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
                                      onRemove={() => handleRemoveActivity(dayItem.day, index)}
                                      onCardClick={() => handleCardClick(activity)}
                                      drawerDescription={drawerDescription}
                                      descriptionLoading={isSelected ? descriptionLoading : false}
                                      onOpenLightbox={openLightbox}
                                      destination={destination}
                                      isEnriching={enrichingKeys.has(`${dayItem.day}:${activity.title}`)}
                                      onEdit={() => {
                                        setEditingKey(editKey === editingKey ? null : editKey);
                                        setAddingDay(null);
                                      }}
                                      isAiTouched={!!touchInfo}
                                      aiBadgeText={touchInfo?.addedByAI ? "Added by Gaia" : "Changed by Gaia"}
                                      aiWasLine={
                                        touchInfo && !touchInfo.addedByAI && touchInfo.wasActivity
                                          ? `${touchInfo.wasActivity.title} · ${touchInfo.wasActivity.time}`
                                          : undefined
                                      }
                                      onUndoAiChange={() => handleUndoTouch(touchKey, dayItem.day)}
                                      onNoteChange={(note) => handleNoteChange(dayItem.day, index, note)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                              {editingKey === editKey && (
                                <ActivityForm
                                  isEditing
                                  initialActivity={activity}
                                  onSubmit={(updated, locName) => handleSaveActivity(dayItem.day, index, updated, locName)}
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

                {/* Add a stop — edit mode only */}
                {removeMode && (
                  addingDay === dayItem.day ? (
                    <ActivityForm
                      onSubmit={(activity, locationName) => handleAddActivity(dayItem.day, activity, locationName)}
                      onCancel={() => setAddingDay(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAddingDay(dayItem.day); setEditingKey(null); }}
                      className="w-full flex items-center gap-2.5 py-3.5 pl-[124px] font-display text-[17px] text-ink opacity-60 hover:opacity-100 hover:bg-brand-50 transition-[opacity,background-color] duration-500"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      Add a stop to Day {toRoman(dayItem.day)}
                    </button>
                  )
                )}
              </section>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Ask Gaia — always available, not gated behind Edit */}
      <section aria-labelledby="ask-gaia" className="mt-14 border-t border-ink pt-4">
        <h2 id="ask-gaia" className="font-display text-[22px] text-ink">Ask Gaia to reshape this trip</h2>
        <p className="mt-1 text-[13px] text-ink-muted">Say what you’d change, or begin with one of these.</p>

        {/* Suggestions fill the box (they don't send), so they can be edited first */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {AI_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              disabled={aiBusy}
              onClick={() => {
                setAiInput(s.prompt);
                askInputRef.current?.focus();
              }}
              className="chip-line text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Composer: a real box, so it reads as a place to write */}
        <div className="mt-3 bg-brand-50 ring-1 ring-inset ring-[#e6e1d7] focus-within:ring-ink transition-[box-shadow] duration-300 px-4 pt-3.5 pb-2.5">
          <label htmlFor="ask-gaia-input" className="sr-only">Your request</label>
          <textarea
            ref={askInputRef}
            id="ask-gaia-input"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (aiInput.trim()) handleAiSubmit(aiInput);
              }
            }}
            disabled={aiBusy}
            rows={2}
            placeholder="Make Day II’s afternoon slower, and add a long lunch…"
            name="ask-gaia"
            autoComplete="off"
            className="w-full bg-transparent border-none outline-none focus-visible:outline-none resize-none text-[15px] leading-relaxed text-ink placeholder:text-[#8a8a8a] disabled:opacity-60"
          />
          <div className="mt-1.5 flex items-center justify-between gap-4">
            <span className="hidden sm:block text-[11px] text-[#7a7a7a]">Enter to send · Shift + Enter for a new line</span>
            <button
              type="button"
              disabled={aiBusy || !aiInput.trim()}
              onClick={() => handleAiSubmit(aiInput)}
              className="btn-ink !h-9 !px-5 ml-auto disabled:!opacity-35 disabled:cursor-default"
            >
              Ask
            </button>
          </div>
        </div>
        {aiBusy && (
          <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            {aiStatusText}
          </p>
        )}
        {aiError && <p className="mt-3 text-xs text-red-700">{aiError}</p>}
      </section>

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
