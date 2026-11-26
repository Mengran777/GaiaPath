"use client";

import React, { useEffect, useRef } from "react";
import UnsplashCredit from "../UI/UnsplashCredit";

export interface PhotoViewState {
  title: string;
  description?: string | null;
  images: string[];
  attributions: ({ photographerName: string; photographerUrl: string } | null)[];
  index: number;
}

interface PhotoViewerProps {
  view: PhotoViewState;
  onIndexChange: (index: number) => void;
  onBack: () => void;
}

// Ask Unsplash for a large rendition for the viewer (thumbnails come at 400px)
const large = (url: string) =>
  url.includes("images.unsplash.com") ? url.replace(/([?&]w=)\d+/, "$11400") : url;

/**
 * Photos of one stop, shown in the right-hand pane in place of the map:
 * white page, large photo, credit and thumbnails below, the stop's note in serif.
 * "Map view" under the photo (or Esc) goes back to the map; arrow keys move between photos.
 */
const PhotoViewer: React.FC<PhotoViewerProps> = ({ view, onIndexChange, onBack }) => {
  const { images, attributions, index, title, description } = view;
  const count = images.length;
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") onBack();
      if (count > 1 && e.key === "ArrowRight") onIndexChange((index + 1) % count);
      if (count > 1 && e.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onBack, onIndexChange]);

  const credit = attributions[index];

  return (
    <section aria-label={`Photos of ${title}`} className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between gap-4 pb-3">
        <p className="eyebrow truncate">
          {title}
          {count > 1 && <span className="tabular-nums"> · {index + 1} of {count}</span>}
        </p>
      </div>

      <div className="relative flex-1 min-h-0 bg-surface-dim">
        {/* key forces a fresh fade-in per photo */}
        <img
          key={images[index]}
          src={large(images[index])}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover animate-card-enter"
        />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => onIndexChange((index - 1 + count) % count)}
              className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize"
              aria-label="Previous photo"
            />
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % count)}
              className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize"
              aria-label="Next photo"
            />
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-3">
        <div className="min-w-0 flex items-baseline gap-4">
          <button
            ref={backRef}
            type="button"
            onClick={onBack}
            className="link-quiet flex-shrink-0 text-[11px] tracking-[0.08em] uppercase text-ink"
          >
            Map view
          </button>
          {credit && (
            <UnsplashCredit
              photographerName={credit.photographerName}
              photographerUrl={credit.photographerUrl}
              className="!text-ink-muted !drop-shadow-none"
            />
          )}
        </div>
        {count > 1 && (
          <div className="flex gap-1.5 flex-shrink-0" role="tablist" aria-label="Photos">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Photo ${i + 1}`}
                onClick={() => onIndexChange(i)}
                className={`w-12 h-9 overflow-hidden transition-opacity duration-300 ${i === index ? "opacity-100" : "opacity-45 hover:opacity-100"}`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {description && (
        <p className="pt-4 font-display text-[17px] leading-relaxed text-ink-soft max-w-[620px]">{description}</p>
      )}
    </section>
  );
};

export default PhotoViewer;
