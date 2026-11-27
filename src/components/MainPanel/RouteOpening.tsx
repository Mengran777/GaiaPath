"use client";

import React from "react";
import Lozenge from "../UI/Lozenge";
import UnsplashCredit from "../UI/UnsplashCredit";

type Credit = { photographerName: string; photographerUrl: string } | null | undefined;

export interface OpeningHighlight {
  title: string;
  url: string;
  credit?: Credit;
  /** Where the stop is, so a click can open it in the list */
  day?: number;
  index?: number;
}

interface RouteOpeningProps {
  title: string;
  /** e.g. "Lisbon, Portugal, Dec 10 — Dec 11" */
  subtitle?: string;
  /** One or two sentences under the dates */
  lede?: string;
  coverUrl?: string | null;
  coverCredit?: Credit;
  /** Pale tone taken from the cover photo, behind the words */
  tone?: string | null;
  highlights: OpeningHighlight[];
  /** A highlight clicked: open that stop */
  onHighlightClick?: (h: OpeningHighlight) => void;
  onBack?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  /** "spread": photo left (stays while the words scroll), words right. "stack": phones. */
  layout?: "spread" | "stack";
}

// Ask Unsplash for a size that suits where the photo is shown
const sized = (url: string, w: number) =>
  url.includes("images.unsplash.com")
    ? /[?&]w=\d+/.test(url)
      ? url.replace(/([?&]w=)\d+/, `$1${w}`)
      : `${url}${url.includes("?") ? "&" : "?"}w=${w}`
    : url;

/**
 * The itinerary's opening spread, like a magazine opener: the route's cover
 * photo, the title on a field in the photo's colour, a short lede and a few of
 * the trip's photos.
 */
const RouteOpening: React.FC<RouteOpeningProps> = ({
  title,
  subtitle,
  lede,
  coverUrl,
  coverCredit,
  tone,
  highlights,
  onHighlightClick,
  onBack,
  isFavorite = false,
  onToggleFavorite,
  layout = "spread",
}) => {
  const spread = layout === "spread";
  const field = tone ?? "#f3eee4";

  const topLine = (
    <div className="flex items-center justify-between gap-4">
      {onBack ? (
        <button type="button" onClick={onBack} className="link-quiet text-[13px]">
          All routes
        </button>
      ) : <span />}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={isFavorite}
          className={`inline-flex items-center gap-2 text-xs tracking-[0.06em] uppercase text-ink transition-opacity duration-500 ${isFavorite ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
        >
          <Lozenge outline={!isFavorite} className="w-[9px] h-[9px]" />
          {isFavorite ? "Saved" : "Save"}
        </button>
      )}
    </div>
  );

  const cover = coverUrl ? (
    <div className={spread ? "sticky top-0 h-screen overflow-hidden bg-surface-dim" : "relative aspect-[4/3] overflow-hidden bg-surface-dim"}>
      <img src={sized(coverUrl, spread ? 1600 : 900)} alt="" className="absolute inset-0 w-full h-full object-cover animate-card-enter" />
      {coverCredit && (
        <div className="absolute left-5 bottom-4">
          <UnsplashCredit photographerName={coverCredit.photographerName} photographerUrl={coverCredit.photographerUrl} />
        </div>
      )}
    </div>
  ) : null;

  const words = (
    <div
      className={`transition-[background-color] duration-700 ease-editorial ${spread ? "px-12 lg:px-16 pt-7 pb-28" : "px-6 pt-5 pb-10"}`}
      style={{ backgroundColor: field }}
    >
      {topLine}
      <h1 className={`font-display uppercase text-ink leading-[0.98] tracking-[-0.015em] ${spread ? "mt-[20vh] text-[64px] lg:text-[76px]" : "mt-8 text-[40px]"}`}>
        {title}
      </h1>
      {subtitle && <p className={`font-display text-ink-soft ${spread ? "mt-5 text-[22px]" : "mt-3 text-[18px]"}`}>{subtitle}</p>}
      {lede && (
        <p className={`font-display text-ink leading-[1.45] max-w-[460px] ${spread ? "mt-14 text-[23px]" : "mt-8 text-[19px]"}`}>{lede}</p>
      )}

      {highlights.length > 0 && (
        <div className={`grid grid-cols-2 ${spread ? "gap-4 mt-24" : "gap-3 mt-10"}`}>
          {highlights.map((h, i) => (
            <figure
              key={h.url}
              className={`group/hl ${onHighlightClick ? "cursor-pointer" : ""} ${spread && i % 2 === 1 ? "mt-16" : ""}`}
              onClick={onHighlightClick ? () => onHighlightClick(h) : undefined}
              role={onHighlightClick ? "button" : undefined}
              tabIndex={onHighlightClick ? 0 : undefined}
              onKeyDown={onHighlightClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onHighlightClick(h); } } : undefined}
              aria-label={onHighlightClick ? `Open ${h.title}` : undefined}
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-surface-dim">
                <img src={sized(h.url, 700)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1100ms] ease-editorial group-hover/hl:scale-[1.04]" />
              </div>
              <figcaption className="mt-2.5 font-display text-[16px] text-ink">{h.title}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );

  if (!spread) {
    return (
      <section aria-label="Trip opening">
        {cover}
        {words}
      </section>
    );
  }

  return (
    <section aria-label="Trip opening" className={`grid ${cover ? "grid-cols-2" : "grid-cols-1"}`}>
      {cover && <div>{cover}</div>}
      {words}
    </section>
  );
};

export default RouteOpening;
