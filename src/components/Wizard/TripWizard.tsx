"use client";

import React, { useEffect, useRef, useState } from "react";
import { LocationAutocomplete } from "../UI";
import DateRangePicker from "../UI/DateRangePicker";
import {
  ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Loader2, Sparkles,
  User, Users, UsersRound, UserRoundPlus,
  Landmark, UtensilsCrossed, Trees, Palette, Mountain, TreePalm, Heart, Baby,
} from "lucide-react";

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
}

const STEP_COUNT = 4;
const SLIDE_MS = 450;

const popularDestinations = ["Kyoto", "Lisbon", "Santorini", "Reykjavik"];

const travelerOptions = [
  { value: "1",   label: "Solo",        sub: "Just me",        icon: User },
  { value: "2",   label: "Two of us",   sub: "Partner or friend", icon: Users },
  { value: "3-4", label: "Small group", sub: "3–4 people",     icon: UsersRound },
  { value: "5+",  label: "Big group",   sub: "5 or more",      icon: UserRoundPlus },
];

const interestOptions = [
  { value: "history",      label: "History and culture", icon: Landmark },
  { value: "food",         label: "Food",                icon: UtensilsCrossed },
  { value: "nature",       label: "Nature",              icon: Trees },
  { value: "art_shopping", label: "Art and shopping",    icon: Palette },
  { value: "adventure",    label: "Adventure",           icon: Mountain },
  { value: "relax",        label: "Relaxing",            icon: TreePalm },
  { value: "honeymoon",    label: "Romantic",            icon: Heart },
  { value: "family",       label: "Family",              icon: Baby },
];

const timeOfDayOptions = [
  { value: "morning",   label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening",   label: "Evening" },
];

const paceOptions = [
  { value: "easy",     label: "Relaxed" },
  { value: "moderate", label: "Moderate" },
  { value: "fast",     label: "Busy" },
  { value: "high",     label: "Packed" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const formatDate = (s: string) => {
  if (!s) return "";
  const d = new Date(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const nightsBetween = (a: string, b: string) =>
  a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)) : 0;

// Small pill used for single-choice rows (times, pace, transport)
const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active, onClick, children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`px-3 h-8 rounded-full text-[13px] font-medium border transition-colors ${
      active
        ? "bg-brand-900 border-brand-900 text-white"
        : "bg-white border-line text-ink-soft hover:border-gold-500"
    }`}
  >
    {children}
  </button>
);

const Question: React.FC<{ title: string; hint: string }> = ({ title, hint }) => (
  <>
    <h2 className="font-display text-[26px] leading-tight font-bold text-brand-900">{title}</h2>
    <p className="text-sm text-ink-muted mt-1 mb-5">{hint}</p>
  </>
);

const TripWizard: React.FC<TripWizardProps> = ({
  preferences, onPreferenceChange, note, onNoteChange, onGenerate, isLoading,
}) => {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimes, setShowTimes] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const dateRowRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  const p = preferences;
  const nights = nightsBetween(p.travelStartDate, p.travelEndDate);

  // After a slide finishes: focus the step's first field, and open the calendar on the dates step
  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 0) document.getElementById("wizard-destination")?.focus();
      if (step === 1 && !p.travelEndDate) setShowDatePicker(true);
      if (step === 2 || step === 3) {
        stepRefs.current[step]?.querySelector<HTMLElement>("button[aria-pressed='true'], button")?.focus();
      }
    }, SLIDE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const goTo = (n: number) => {
    setError("");
    setShowDatePicker(false);
    setStep(Math.max(0, Math.min(STEP_COUNT - 1, n)));
  };

  const next = () => {
    if (step === 0 && !p.destination.trim()) {
      setError("Enter a destination first");
      return;
    }
    if (step === 1 && (!p.travelStartDate || !p.travelEndDate)) {
      setError(p.travelStartDate ? "Pick an end date" : "Pick your travel dates");
      setShowDatePicker(true);
      return;
    }
    goTo(step + 1);
  };

  const toggleInterest = (value: string) => {
    const sel = p.travelType;
    if (sel.includes(value)) onPreferenceChange("travelType", sel.filter((t) => t !== value));
    else if (sel.length < 3) onPreferenceChange("travelType", [...sel, value]);
    else onPreferenceChange("travelType", [...sel.slice(1), value]);
  };

  // Answers from earlier steps, shown as jump-back links above the question
  const crumbs = [
    p.destination.trim() && { step: 0, label: p.destination.trim() },
    p.travelStartDate && p.travelEndDate && {
      step: 1, label: `${formatDate(p.travelStartDate)} – ${formatDate(p.travelEndDate)}`,
    },
    { step: 2, label: travelerOptions.find((o) => o.value === p.travelers)?.label ?? "" },
  ].filter((c): c is { step: number; label: string } => Boolean(c) && (c as any).step < step);

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
        {/* Progress header */}
        <div className="flex items-center gap-3 px-5 pt-5">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            aria-label="Previous step"
            className={`w-8 h-8 -ml-1.5 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface-dim hover:text-ink transition-colors ${
              step === 0 ? "invisible" : ""
            }`}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div
            className="flex-1 h-1 rounded-full bg-line overflow-hidden"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEP_COUNT}
            aria-valuenow={step + 1}
            aria-label="Form progress"
          >
            <div
              className="h-full bg-brand-500 rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
            />
          </div>
          <span className="text-xs text-ink-muted tabular-nums w-7 text-right">
            {step + 1}/{STEP_COUNT}
          </span>
        </div>

        {/* Earlier answers */}
        <div className="px-7 pt-3 min-h-[28px] flex flex-wrap gap-x-3 gap-y-1">
          {crumbs.map((c) => (
            <button
              key={c.step}
              type="button"
              onClick={() => goTo(c.step)}
              className="text-xs text-ink-muted hover:text-brand-700 underline decoration-line underline-offset-2"
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Sliding steps */}
        <div className="overflow-hidden">
          <div
            className="flex items-start transition-transform ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${step * 100}%)`, transitionDuration: `${SLIDE_MS}ms` }}
          >
            {/* 1 · Destination */}
            <section
              ref={(el) => { stepRefs.current[0] = el; }}
              inert={step !== 0}
              aria-hidden={step !== 0}
              className={`w-full flex-shrink-0 px-7 pt-2 pb-7 transition-opacity duration-300 ${step === 0 ? "opacity-100" : "opacity-0"}`}
            >
              <Question title="Where are you headed?" hint="A city, island, or region." />
              <div
                onKeyDown={(e) => {
                  // The autocomplete swallows Enter while its list is open; otherwise Enter advances
                  if (e.key === "Enter" && !e.defaultPrevented) next();
                }}
                onChange={() => error && setError("")}
              >
                <LocationAutocomplete
                  id="wizard-destination"
                  value={p.destination}
                  onChange={(v) => onPreferenceChange("destination", v)}
                  placeholder="Athens, Greece"
                />
              </div>
              <p className="text-xs text-ink-muted mt-4 mb-2">Popular right now</p>
              <div className="flex flex-wrap gap-2">
                {popularDestinations.map((d) => (
                  <Pill
                    key={d}
                    active={p.destination === d}
                    onClick={() => {
                      onPreferenceChange("destination", d);
                      setError("");
                      goTo(1);
                    }}
                  >
                    {d}
                  </Pill>
                ))}
              </div>
            </section>

            {/* 2 · Dates */}
            <section
              ref={(el) => { stepRefs.current[1] = el; }}
              inert={step !== 1}
              aria-hidden={step !== 1}
              className={`w-full flex-shrink-0 px-7 pt-2 pb-7 transition-opacity duration-300 ${step === 1 ? "opacity-100" : "opacity-0"}`}
            >
              <Question title="When are you going?" hint="We'll plan each day of the trip." />
              <div
                ref={dateRowRef}
                role="button"
                tabIndex={0}
                onClick={() => setShowDatePicker((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowDatePicker((v) => !v);
                  }
                }}
                className="flex items-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-brand-500 focus:border-brand-500 focus:outline-none transition-colors"
              >
                <CalendarDays size={18} className="text-brand-700 flex-shrink-0" aria-hidden="true" />
                {p.travelStartDate ? (
                  <span className="text-ink text-[15px]">
                    {formatDate(p.travelStartDate)}
                    <span className="text-ink-muted mx-1.5">→</span>
                    {p.travelEndDate ? formatDate(p.travelEndDate) : <span className="text-ink-muted">End date</span>}
                  </span>
                ) : (
                  <span className="text-ink-muted text-[15px]">Pick your dates</span>
                )}
                {nights > 0 && (
                  <span className="ml-auto bg-gold-50 text-gold-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {nights} {nights === 1 ? "night" : "nights"}
                  </span>
                )}
              </div>
              {showDatePicker && step === 1 && (
                <DateRangePicker
                  startDate={p.travelStartDate}
                  endDate={p.travelEndDate}
                  onStartDateChange={(d) => { onPreferenceChange("travelStartDate", d); setError(""); }}
                  onEndDateChange={(d) => {
                    onPreferenceChange("travelEndDate", d);
                    if (d) { setShowDatePicker(false); setError(""); }
                  }}
                  triggerRef={dateRowRef}
                  onClose={() => setShowDatePicker(false)}
                />
              )}

              {!showTimes ? (
                <button
                  type="button"
                  onClick={() => setShowTimes(true)}
                  className="mt-4 text-[13px] text-ink-muted hover:text-brand-700 underline decoration-line underline-offset-2"
                >
                  Add arrival and departure times
                </button>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {(["arrivalTime", "departureTime"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] text-ink-soft w-14">{key === "arrivalTime" ? "Arrive" : "Leave"}</span>
                      {timeOfDayOptions.map((o) => (
                        <Pill key={o.value} active={p[key] === o.value} onClick={() => onPreferenceChange(key, o.value)}>
                          {o.label}
                        </Pill>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 3 · Travellers (single choice, advances on click) */}
            <section
              ref={(el) => { stepRefs.current[2] = el; }}
              inert={step !== 2}
              aria-hidden={step !== 2}
              className={`w-full flex-shrink-0 px-7 pt-2 pb-7 transition-opacity duration-300 ${step === 2 ? "opacity-100" : "opacity-0"}`}
            >
              <Question title="Who's coming along?" hint="Tap one to continue." />
              <div className="grid grid-cols-2 gap-2.5">
                {travelerOptions.map((o) => {
                  const active = p.travelers === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        onPreferenceChange("travelers", o.value);
                        setTimeout(() => goTo(3), 180);
                      }}
                      className={`text-left rounded-xl border-[1.5px] p-3.5 transition-colors ${
                        active ? "border-brand-900 bg-brand-50" : "border-line hover:border-gold-500"
                      }`}
                    >
                      <o.icon size={20} className={active ? "text-brand-900" : "text-brand-700"} aria-hidden="true" />
                      <div className="text-sm font-semibold text-ink mt-2">{o.label}</div>
                      <div className="text-xs text-ink-muted">{o.sub}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 4 · Interests + optional extras */}
            <section
              ref={(el) => { stepRefs.current[3] = el; }}
              inert={step !== 3}
              aria-hidden={step !== 3}
              className={`w-full flex-shrink-0 px-7 pt-2 pb-7 transition-opacity duration-300 ${step === 3 ? "opacity-100" : "opacity-0"}`}
            >
              <Question title="What are you into?" hint="Pick up to 3, or skip and we'll keep it balanced." />
              <div className="flex flex-wrap gap-2">
                {interestOptions.map((o) => {
                  const active = p.travelType.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleInterest(o.value)}
                      className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[13px] font-medium border transition-colors ${
                        active
                          ? "bg-brand-900 border-brand-900 text-white"
                          : "bg-white border-line text-ink-soft hover:border-gold-500"
                      }`}
                    >
                      <o.icon size={14} aria-hidden="true" />
                      {o.label}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                rows={2}
                placeholder="Anything else? Sunrise hikes, local markets, no museums…"
                className="w-full mt-4 px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-muted border border-line rounded-xl resize-none focus:outline-none focus:border-brand-500"
              />

              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                aria-expanded={showMore}
                className="mt-3 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-brand-700"
              >
                More options: pace, getting around
                <ChevronDown size={14} className={`transition-transform ${showMore ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {showMore && (
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] text-ink-soft w-14">Pace</span>
                    {paceOptions.map((o) => (
                      <Pill
                        key={o.value}
                        active={p.activityIntensity === o.value}
                        onClick={() => onPreferenceChange("activityIntensity", o.value)}
                      >
                        {o.label}
                      </Pill>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] text-ink-soft w-14">Travel</span>
                    <Pill active={p.transportation.length === 0} onClick={() => onPreferenceChange("transportation", [])}>
                      Any
                    </Pill>
                    <Pill
                      active={p.transportation.length === 1 && p.transportation[0] === "car"}
                      onClick={() => onPreferenceChange("transportation", ["car"])}
                    >
                      Self-drive
                    </Pill>
                    <Pill
                      active={p.transportation.length === 1 && p.transportation[0] === "public_transport"}
                      onClick={() => onPreferenceChange("transportation", ["public_transport"])}
                    >
                      Public transit
                    </Pill>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer action */}
        <div className="px-7 pb-7 -mt-2">
          <p className="text-[13px] text-red-600 min-h-[20px] mb-1" role="alert">{error}</p>
          {step < 2 && (
            <button
              type="button"
              onClick={next}
              className="w-full h-12 rounded-xl bg-brand-900 text-white font-semibold text-[15px] flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Next
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-brand-900 text-white font-semibold text-[15px] flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Generating…</>
              ) : (
                <><Sparkles size={18} aria-hidden="true" /> Generate itinerary</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripWizard;
