"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { LocationAutocomplete } from "../UI";
import Lozenge from "../UI/Lozenge";
import UnsplashCredit from "../UI/UnsplashCredit";
import InlineCalendar from "./InlineCalendar";
import { GALLERY_DESTINATIONS, galleryImageUrl, type GalleryPhoto } from "@/data/galleryDestinations";
import { INTEREST_TILES } from "@/data/interestPhotos";
import { withUtm } from "@/lib/unsplash";
import { formatShortDate } from "@/lib/format";

export interface TripPreferences {
  destination: string;
  travelStartDate: string;
  travelEndDate: string;
  arrivalTime: string;
  departureTime: string;
  travelers: string;
  travelType: string[];
  transportation: string[];
  activityIntensity: string;
  [key: string]: any;
}

interface TripWizardProps {
  preferences: TripPreferences;
  onPreferenceChange: (key: string, value: any) => void;
  /** Free-text "anything else" note, sent to the API as userRequest */
  note: string;
  onNoteChange: (value: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  /** A gallery photo was chosen: use it as this trip's photo */
  onDestinationPhoto?: (photo: DestinationPhoto) => void;
  /** Step 1 finished with a typed city: find a photo for it now */
  onDestinationConfirmed?: (destination: string) => void;
}

export interface DestinationPhoto {
  destination: string;
  url: string;
  photographerName: string;
  photographerUrl: string;
}

const STEP_COUNT = 4;
const SLIDE_MS = 550;
const GALLERY_SIZE = 6;

const travelerOptions = [
  { value: "1", label: "Solo", sub: "Just me, at my own pace" },
  { value: "2", label: "Two of us", sub: "With a partner or a friend" },
  { value: "3-4", label: "A small group", sub: "Three or four, one table" },
  { value: "5+", label: "A big group", sub: "Five or more, plan ahead" },
];

const timeOfDayOptions = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const paceOptions = [
  { value: "easy", label: "Relaxed" },
  { value: "moderate", label: "Moderate" },
  { value: "fast", label: "Busy" },
  { value: "high", label: "Packed" },
];

const transportOptions: { label: string; value: string[] }[] = [
  { label: "Any", value: [] },
  { label: "Self-drive", value: ["car"] },
  { label: "Public transit", value: ["public_transport"] },
];

const formatDate = formatShortDate;
const nightsBetween = (a: string, b: string) =>
  a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)) : 0;

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** A lozenge option (marker wipes in on hover, stays when selected). */
const LozOption: React.FC<{
  selected: boolean;
  onClick: () => void;
  role?: "radio";
  className?: string;
  children: React.ReactNode;
}> = ({ selected, onClick, role, className = "", children }) => (
  <button
    type="button"
    role={role}
    aria-checked={role === "radio" ? selected : undefined}
    aria-pressed={role === "radio" ? undefined : selected}
    onClick={onClick}
    className={`loz-opt text-left py-1 ${className}`}
  >
    <span className="loz-mk"><Lozenge /></span>
    <span className="loz-tx">{children}</span>
  </button>
);

const Question: React.FC<{ title: React.ReactNode; hint?: string }> = ({ title, hint }) => (
  <div className="text-center">
    <h1 className="font-display text-[34px] sm:text-[42px] leading-[1.04] uppercase text-ink">{title}</h1>
    {hint && <p className="mt-3 text-sm text-ink-muted">{hint}</p>}
  </div>
);

const TripWizard: React.FC<TripWizardProps> = ({
  preferences, onPreferenceChange, note, onNoteChange, onGenerate, isLoading,
  onDestinationPhoto, onDestinationConfirmed,
}) => {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [showTimes, setShowTimes] = useState(false);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const p = preferences;
  const nights = nightsBetween(p.travelStartDate, p.travelEndDate);

  // A different set of places, and a random photo of each, on every visit.
  // Picked after mount: a random pick during render would differ between the
  // server render and the browser and break hydration.
  const [interestPick, setInterestPick] = useState<Record<string, GalleryPhoto>>({});
  const [gallery, setGallery] = useState<
    { place: (typeof GALLERY_DESTINATIONS)[number]; photo: (typeof GALLERY_DESTINATIONS)[number]["photos"][number] }[]
  >([]);
  useEffect(() => {
    setGallery(
      shuffle(GALLERY_DESTINATIONS)
        .slice(0, GALLERY_SIZE)
        .map((place) => ({ place, photo: place.photos[Math.floor(Math.random() * place.photos.length)] }))
    );
    setInterestPick(
      Object.fromEntries(
        INTEREST_TILES.filter((t) => t.photos.length).map((t) => [t.value, t.photos[Math.floor(Math.random() * t.photos.length)]])
      )
    );
  }, []);

  // Unsplash requires a download ping for photos we display
  useEffect(() => {
    const interestPhotos = Object.values(interestPick).map((photo) => ({ photo }));
    [...gallery, ...(gallery.length ? interestPhotos : [])].forEach(({ photo }) => {
      fetch("/api/unsplash/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadLocation: photo.downloadLocation }),
      }).catch(() => {});
    });
  }, [gallery]);

  // After a slide: focus the step's first field or its selected option
  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 0) document.getElementById("wizard-destination")?.focus();
      else
        stepRefs.current[step]
          ?.querySelector<HTMLElement>("[aria-checked='true'], [aria-pressed='true'], button")
          ?.focus({ preventScroll: true });
    }, SLIDE_MS);
    return () => clearTimeout(t);
  }, [step]);

  // Track the visible step's height (it also changes inside a step, e.g. when
  // "Add times" expands or gallery photos load)
  const [stepHeight, setStepHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = stepRefs.current[step];
    if (!el) return;
    const update = () => setStepHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step]);

  const goTo = (n: number) => {
    setError("");
    setStep(Math.max(0, Math.min(STEP_COUNT - 1, n)));
  };

  const next = () => {
    if (step === 0 && !p.destination.trim()) {
      setError("Enter a destination, or choose one of the places below");
      return;
    }
    if (step === 1 && (!p.travelStartDate || !p.travelEndDate)) {
      setError(p.travelStartDate ? "Pick an end date" : "Pick your travel dates");
      return;
    }
    if (step === 0) onDestinationConfirmed?.(p.destination);
    goTo(step + 1);
  };

  const toggleInterest = (value: string) => {
    const sel = p.travelType;
    if (sel.includes(value)) onPreferenceChange("travelType", sel.filter((t) => t !== value));
    else if (sel.length < 3) onPreferenceChange("travelType", [...sel, value]);
    else onPreferenceChange("travelType", [...sel.slice(1), value]);
  };

  // Earlier answers, as links back to their step
  const crumbs = [
    p.destination.trim() && { step: 0, label: p.destination.trim() },
    p.travelStartDate && p.travelEndDate && {
      step: 1, label: `${formatDate(p.travelStartDate)} — ${formatDate(p.travelEndDate)}`,
    },
    { step: 2, label: travelerOptions.find((o) => o.value === p.travelers)?.label ?? "" },
  ].filter((c): c is { step: number; label: string } => Boolean(c) && (c as any).step < step);

  const stepProps = (i: number) => ({
    ref: (el: HTMLElement | null) => { stepRefs.current[i] = el; },
    inert: step !== i,
    "aria-hidden": step !== i,
    className: `w-full flex-shrink-0 px-5 sm:px-10 transition-opacity duration-500 ${step === i ? "opacity-100" : "opacity-0"}`,
  });

  return (
    <div className="w-full max-w-[1200px] mx-auto flex flex-col items-center">
      {/* Step counter and earlier answers */}
      <p className="eyebrow text-center px-5">
        Step {step + 1} of {STEP_COUNT}
        {crumbs.map((c) => (
          <React.Fragment key={c.step}>
            <span aria-hidden="true"> · </span>
            <button
              type="button"
              onClick={() => goTo(c.step)}
              className="link-quiet normal-case tracking-normal text-xs"
            >
              {c.label}
            </button>
          </React.Fragment>
        ))}
      </p>

      {/* Sliding steps. The viewport takes the current step's height (not the
          tallest step's), so short steps don't push the actions off screen. */}
      <div
        className="w-full overflow-hidden mt-4 transition-[height] ease-editorial"
        style={{ height: stepHeight, transitionDuration: `${SLIDE_MS}ms` }}
      >
        <div
          className="flex items-start transition-transform ease-editorial"
          style={{ transform: `translateX(-${step * 100}%)`, transitionDuration: `${SLIDE_MS}ms` }}
        >
          {/* 1 · Destination and photo gallery */}
          <section {...stepProps(0)}>
            <Question title={<>Where will<br />you wander?</>} />
            <div
              className="max-w-[440px] mx-auto mt-6"
              onKeyDown={(e) => {
                // The autocomplete keeps Enter while its list is open; otherwise Enter advances
                if (e.key === "Enter" && !e.defaultPrevented) next();
              }}
              onChange={() => error && setError("")}
            >
              <label htmlFor="wizard-destination" className="sr-only">Destination</label>
              <LocationAutocomplete
                id="wizard-destination"
                value={p.destination}
                onChange={(v) => onPreferenceChange("destination", v)}
                placeholder="Name a city, or choose one below…"
                inputClassName="font-display text-[26px] text-center"
              />
            </div>

            <div className="group/gal mt-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {gallery.length === 0 &&
                Array.from({ length: GALLERY_SIZE }).map((_, i) => (
                  <div key={i} aria-hidden="true">
                    <div className="aspect-[3/4] bg-surface-dim" />
                    <div className="h-4 w-2/3 mt-3 bg-surface-dim" />
                  </div>
                ))}
              {gallery.map(({ place, photo }) => {
                const value = `${place.city}, ${place.country}`;
                return (
                  <div
                    key={place.slug}
                    className="group/city transition-opacity duration-500 ease-editorial group-hover/gal:opacity-40 hover:!opacity-100 focus-within:!opacity-100"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onPreferenceChange("destination", value);
                        onDestinationPhoto?.({
                          destination: value,
                          url: galleryImageUrl(photo, 900, 600),
                          photographerName: photo.photographerName,
                          photographerUrl: withUtm(photo.photographerProfile),
                        });
                        setError("");
                        goTo(1);
                      }}
                      aria-label={`Choose ${value}`}
                      className="block w-full text-left"
                    >
                      <span className="block relative aspect-[3/4] overflow-hidden bg-surface-dim">
                        <img
                          src={galleryImageUrl(photo, 480, 640)}
                          alt=""
                          width={480}
                          height={640}
                          fetchPriority="high"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-editorial group-hover/city:scale-[1.04]"
                        />
                      </span>
                      <span className="block mt-3 font-display text-lg uppercase tracking-[0.02em]">{place.city}</span>
                      <span className="block eyebrow mt-0.5">{place.country}</span>
                    </button>
                    <UnsplashCredit
                      photographerName={photo.photographerName}
                      photographerUrl={withUtm(photo.photographerProfile)}
                      className="mt-1.5 !text-ink-muted !drop-shadow-none opacity-0 group-hover/city:opacity-100 focus-within:opacity-100 transition-opacity duration-500"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2 · Dates */}
          <section {...stepProps(1)}>
            <Question title={<>When do you<br />set out?</>} />
            <p className="text-center mt-4 font-display text-[22px] min-h-[33px]">
              {p.travelStartDate ? (
                <>
                  {formatDate(p.travelStartDate)} — {p.travelEndDate ? formatDate(p.travelEndDate) : <span className="text-ink-muted">end date</span>}
                  {nights > 0 && <span className="eyebrow ml-3 align-middle">{nights} {nights === 1 ? "night" : "nights"}</span>}
                </>
              ) : (
                <span className="text-ink-muted">Choose the day you set out</span>
              )}
            </p>
            <div className="max-w-[760px] mx-auto mt-6">
              <InlineCalendar
                startDate={p.travelStartDate}
                endDate={p.travelEndDate}
                onChange={(s, e) => {
                  onPreferenceChange("travelStartDate", s);
                  onPreferenceChange("travelEndDate", e);
                  setError("");
                }}
              />
            </div>
            <div className="max-w-[760px] mx-auto mt-8 text-center">
              {!showTimes ? (
                <p className="text-[13px] text-ink-muted">
                  Arriving or leaving at a set time?{" "}
                  <button type="button" onClick={() => setShowTimes(true)} className="text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink">
                    Add times
                  </button>
                </p>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {(["arrivalTime", "departureTime"] as const).map((key) => (
                    <div key={key} role="radiogroup" aria-label={key === "arrivalTime" ? "Arrive" : "Leave"} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
                      <span className="eyebrow w-14 text-left">{key === "arrivalTime" ? "Arrive" : "Leave"}</span>
                      {timeOfDayOptions.map((o) => (
                        <LozOption key={o.value} role="radio" selected={p[key] === o.value} onClick={() => onPreferenceChange(key, o.value)} className="text-lg">
                          {o.label}
                        </LozOption>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 3 · Travellers (single choice, advances on click) */}
          <section {...stepProps(2)}>
            <div className="flex flex-col items-center justify-center py-6">
              <Question title={<>Who travels<br />with you?</>} />
              <div
                role="radiogroup"
                aria-label="Travellers"
                className="mt-10 w-full max-w-[960px] grid grid-cols-2 lg:grid-cols-4 border-t border-ink"
              >
                {travelerOptions.map((o, i) => {
                  const selected = p.travelers === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        onPreferenceChange("travelers", o.value);
                        setTimeout(() => goTo(3), 350);
                      }}
                      className={`loz-opt flex-col !items-start text-left px-5 pt-5 pb-7 border-line transition-colors duration-500 hover:bg-brand-50 ${
                        selected ? "bg-brand-50" : ""
                      } ${i > 0 ? "lg:border-l" : ""} ${i % 2 === 1 ? "border-l" : ""}`}
                    >
                      <span className="eyebrow mb-6">{["I", "II", "III", "IV"][i]}</span>
                      <span className="flex items-center text-[28px] leading-tight">
                        <span className="loz-mk"><Lozenge /></span>
                        <span className="loz-tx">{o.label}</span>
                      </span>
                      <span className="mt-2 font-sans text-[13px] text-ink-muted">{o.sub}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-6 text-[13px] text-ink-muted">Pick one to continue.</p>
            </div>
          </section>

          {/* 4 · Interests, pace, getting around, note */}
          <section {...stepProps(3)}>
            <Question title="What draws you?" hint="Choose up to three, or skip and we'll keep it balanced." />
            {/* Photo tiles: greyscale at rest, colour returns on hover, full colour when chosen */}
            <div className="max-w-[720px] mx-auto mt-6 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
              {INTEREST_TILES.map((t) => {
                const selected = p.travelType.includes(t.value);
                const photo = interestPick[t.value];
                return (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInterest(t.value)}
                    className="loz-opt group/tile flex-col !items-stretch text-left"
                  >
                    <span className="block relative aspect-[4/3] overflow-hidden bg-surface-dim">
                      {photo ? (
                        <img
                          src={galleryImageUrl(photo, 480, 360)}
                          alt=""
                          width={480}
                          height={360}
                          loading="lazy"
                          className={`absolute inset-0 w-full h-full object-cover transition-[transform,filter,opacity] duration-700 ease-editorial group-hover/tile:scale-[1.04] ${
                            selected ? "" : "grayscale brightness-110 opacity-60 group-hover/tile:grayscale-[0.2] group-hover/tile:opacity-90"
                          }`}
                        />
                      ) : (
                        <span
                          className={`absolute inset-0 transition-[transform,filter,opacity] duration-700 ease-editorial group-hover/tile:scale-[1.04] ${
                            selected ? "" : "grayscale brightness-110 opacity-50 group-hover/tile:grayscale-[0.2] group-hover/tile:opacity-90"
                          }`}
                          style={{ background: t.tone }}
                        />
                      )}
                    </span>
                    <span className="mt-2.5 flex items-center text-[17px]">
                      <span className="loz-mk"><Lozenge /></span>
                      <span className="loz-tx">{t.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="max-w-[720px] mx-auto mt-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <p className="eyebrow mb-1.5">Pace</p>
                <div role="radiogroup" aria-label="Pace" className="flex flex-wrap gap-x-5">
                  {paceOptions.map((o) => (
                    <LozOption key={o.value} role="radio" selected={p.activityIntensity === o.value} onClick={() => onPreferenceChange("activityIntensity", o.value)} className="text-xl">
                      {o.label}
                    </LozOption>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow mb-1.5">Getting around</p>
                <div className="flex flex-wrap gap-1">
                  {transportOptions.map((o) => {
                    const active = o.value.length === 0
                      ? p.transportation.length === 0
                      : p.transportation.length === 1 && p.transportation[0] === o.value[0];
                    return (
                      <button key={o.label} type="button" aria-pressed={active} onClick={() => onPreferenceChange("transportation", o.value)} className="pill-sand text-base">
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="max-w-[720px] mx-auto mt-6">
              <label htmlFor="wizard-note" className="eyebrow block">Anything else</label>
              <input
                id="wizard-note"
                name="trip-note"
                autoComplete="off"
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="Sunrise hikes, long lunches, no museums…"
                className="field-line text-[15px]"
              />
            </div>
          </section>
        </div>
      </div>

      {/* Actions: pinned to the bottom of the view, so Next never needs a scroll */}
      <div className="sticky bottom-0 z-10 w-full mt-6 pt-4 pb-5 bg-white flex flex-col items-center px-5">
        <p className="text-[13px] text-red-700 min-h-[20px] mb-2 empty:mb-0 empty:min-h-0" role="alert">{error}</p>
        <div className="flex items-center gap-7">
          {step > 0 && (
            <button type="button" onClick={() => goTo(step - 1)} className="link-quiet text-[13px]">
              Back
            </button>
          )}
          {step < 2 && (
            <button type="button" onClick={next} className="btn-ink">
              Next
            </button>
          )}
          {step === 3 && (
            <button type="button" onClick={onGenerate} disabled={isLoading} className="btn-ink">
              {isLoading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {isLoading ? "Generating…" : "Generate itinerary"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripWizard;
