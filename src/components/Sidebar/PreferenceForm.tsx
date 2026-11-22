import React, { useRef, useState, useEffect } from "react";
import { LocationAutocomplete } from "../UI";
import DateRangePicker from "../UI/DateRangePicker";
import {
  Landmark, UtensilsCrossed, Trees, Palette, Mountain, TreePalm, Heart, Users,
  Car, Bus, MapPin, CalendarDays, PlaneLanding, PlaneTakeoff,
} from "lucide-react";

interface PreferenceFormProps {
  preferences: {
    destination: string;
    travelStartDate: string;
    travelEndDate: string;
    arrivalTime: string;
    departureTime: string;
    travelers: string;
    travelType: string[];
    transportation: string[];
    activityIntensity: string;
    specialNeeds: string[];
  };
  onPreferenceChange: (key: string, value: any) => void;
}

const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <p className={`text-[10.5px] font-semibold tracking-widest uppercase text-ink-muted mb-2 ${className}`}>
    {children}
  </p>
);

const formatDatePill = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

const calculateNights = (start: string, end: string) => {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

const travelerOptions = [
  { value: "1",   label: "Solo" },
  { value: "2",   label: "2 people" },
  { value: "3-4", label: "3–4 people" },
  { value: "5+",  label: "5+ people" },
];

const timeOfDayOptions = [
  { value: "morning",   label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening",   label: "Evening" },
];

// Same custom pill-dropdown look as the Travellers control below.
const TimeOfDayDropdown: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = timeOfDayOptions.find((o) => o.value === value)?.label ?? "Afternoon";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 text-ink-soft text-sm cursor-pointer hover:text-brand-900 transition-colors"
      >
        {selectedLabel}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-lg border border-line min-w-[140px] py-1">
          {timeOfDayOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-surface-dim ${
                value === opt.value ? "text-brand-900 font-semibold" : "text-ink-soft"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PreferenceForm: React.FC<PreferenceFormProps> = ({
  preferences,
  onPreferenceChange,
}) => {
  const [showDatePicker, setShowDatePicker]       = useState(false);
  const [showTravelersMenu, setShowTravelersMenu] = useState(false);

  // dateRowRef is passed to DateRangePicker so it can anchor the popup position
  const dateRowRef       = useRef<HTMLDivElement>(null);
  const travelersMenuRef = useRef<HTMLDivElement>(null);

  // ── Click-outside: close travelers menu ──
  useEffect(() => {
    if (!showTravelersMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        travelersMenuRef.current &&
        !travelersMenuRef.current.contains(e.target as Node)
      ) {
        setShowTravelersMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTravelersMenu]);

  // ── Data ──
  const travelTypes = [
    { label: "History & Culture", icon: Landmark, value: "history" },
    { label: "Food & Dining",     icon: UtensilsCrossed, value: "food" },
    { label: "Nature",            icon: Trees, value: "nature" },
    { label: "Art & Shopping",    icon: Palette, value: "art_shopping" },
    { label: "Adventure",         icon: Mountain, value: "adventure" },
    { label: "Relaxation",        icon: TreePalm, value: "relax" },
    { label: "Romantic",          icon: Heart, value: "honeymoon" },
    { label: "Family",            icon: Users, value: "family" },
  ];

  const transportationTypes = [
    { label: "Self-drive",     icon: Car, value: "car" },
    { label: "Public Transit", icon: Bus, value: "public_transport" },
  ];

  const paceOptions = [
    { value: "easy",     label: "Relaxed",    sub: "1–2 stops" },
    { value: "moderate", label: "Moderate",   sub: "2–3 stops" },
    { value: "fast",     label: "Fast-paced", sub: "3–4 stops" },
    { value: "high",     label: "Intense",    sub: "4–5 stops" },
  ];

  const paceIndex    = paceOptions.findIndex(p => p.value === preferences.activityIntensity);
  const progressWidth = ((paceIndex + 1) / 4) * 100;

  const handleTravelTypeClick = (value: string) => {
    const selected = preferences.travelType;
    if (selected.includes(value)) {
      onPreferenceChange("travelType", selected.filter(t => t !== value));
    } else if (selected.length < 3) {
      onPreferenceChange("travelType", [...selected, value]);
    } else {
      onPreferenceChange("travelType", [...selected.slice(1), value]);
    }
  };

  const handleTransportClick = (value: string) => {
    const selected = preferences.transportation;
    onPreferenceChange(
      "transportation",
      selected.includes(value)
        ? selected.filter(t => t !== value)
        : [...selected, value]
    );
  };

  const travelSelected  = preferences.travelType.length;
  const travelRemaining = 3 - travelSelected;

  const selectedTravelerLabel =
    travelerOptions.find(o => o.value === preferences.travelers)?.label ?? "2 people";

  // ── Date pill content ──
  const renderDateDisplay = () => {
    const { travelStartDate: s, travelEndDate: e } = preferences;
    if (s && e) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="bg-brand-900 text-white text-xs font-medium px-3 py-1.5 rounded-full">
            {formatDatePill(s)}
          </span>
          <span className="text-ink-muted text-xs">→</span>
          <span className="bg-brand-900 text-white text-xs font-medium px-3 py-1.5 rounded-full">
            {formatDatePill(e)}
          </span>
          <span className="bg-gold-50 text-gold-500 text-xs font-semibold px-2.5 py-1 rounded-full">
            {calculateNights(s, e)} nights
          </span>
        </div>
      );
    }
    if (s) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="bg-brand-900 text-white text-xs font-medium px-3 py-1.5 rounded-full">
            {formatDatePill(s)}
          </span>
          <span className="text-ink-muted text-xs">→ Select end</span>
        </div>
      );
    }
    return <span className="text-ink-muted text-sm">Select dates</span>;
  };

  return (
    <div className="space-y-4">
      {/* ── WHERE & WHEN ── */}
      <div>
        <SectionLabel>Where &amp; When</SectionLabel>
        {/* No overflow-hidden so custom dropdowns can escape the card boundary */}
        <div className="bg-white rounded-2xl border border-line">

          {/* Destination row */}
          <div className="flex items-center px-4 py-2.5 gap-3 border-b border-line">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-surface text-brand-700 flex items-center justify-center flex-shrink-0">
              <MapPin size={16} aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-ink min-w-[80px]">Destination</span>
            <div className="flex-1">
              <LocationAutocomplete
                id="destination"
                value={preferences.destination}
                onChange={(value) => onPreferenceChange("destination", value)}
                placeholder="e.g. Athens, Greece"
              />
            </div>
          </div>

          {/* Dates row — ref passed to DateRangePicker as anchor for popup position */}
          <div
            ref={dateRowRef}
            className="flex items-center px-4 py-2.5 gap-3 cursor-pointer select-none border-b border-line"
            onClick={() => setShowDatePicker(prev => !prev)}
          >
            <div className="w-[30px] h-[30px] rounded-[8px] bg-surface text-brand-700 flex items-center justify-center flex-shrink-0">
              <CalendarDays size={16} aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-ink min-w-[80px]">Dates</span>
            <div className="flex-1 flex justify-end">
              {renderDateDisplay()}
            </div>
          </div>

          {/* DateRangePicker: portal-based, anchored to dateRowRef */}
          {showDatePicker && (
            <DateRangePicker
              startDate={preferences.travelStartDate}
              endDate={preferences.travelEndDate}
              onStartDateChange={(date) => onPreferenceChange("travelStartDate", date)}
              onEndDateChange={(date) => {
                onPreferenceChange("travelEndDate", date);
                if (date) setShowDatePicker(false);
              }}
              triggerRef={dateRowRef}
              onClose={() => setShowDatePicker(false)}
            />
          )}

          {/* Arrival time row */}
          <div className="flex items-center px-4 py-2.5 gap-3 border-b border-line">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-surface text-brand-700 flex items-center justify-center flex-shrink-0">
              <PlaneLanding size={16} aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-ink min-w-[80px]">Arrival</span>
            <div className="flex-1 flex justify-end">
              <TimeOfDayDropdown
                value={preferences.arrivalTime}
                onChange={(v) => onPreferenceChange("arrivalTime", v)}
              />
            </div>
          </div>

          {/* Departure time row */}
          <div className="flex items-center px-4 py-2.5 gap-3 border-b border-line">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-surface text-brand-700 flex items-center justify-center flex-shrink-0">
              <PlaneTakeoff size={16} aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-ink min-w-[80px]">Departure</span>
            <div className="flex-1 flex justify-end">
              <TimeOfDayDropdown
                value={preferences.departureTime}
                onChange={(v) => onPreferenceChange("departureTime", v)}
              />
            </div>
          </div>

          {/* Travellers row */}
          <div className="flex items-center px-4 py-2.5 gap-3">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-surface text-brand-700 flex items-center justify-center flex-shrink-0">
              <Users size={16} aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-ink min-w-[80px]">Travellers</span>
            <div className="flex-1 flex justify-end">
              {/* Custom dropdown */}
              <div ref={travelersMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowTravelersMenu(prev => !prev)}
                  className="flex items-center gap-1 text-ink-soft text-sm cursor-pointer hover:text-brand-900 transition-colors"
                >
                  {selectedTravelerLabel}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${showTravelersMenu ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showTravelersMenu && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-lg border border-line min-w-[140px] py-1">
                    {travelerOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onPreferenceChange("travelers", opt.value);
                          setShowTravelersMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-surface-dim ${
                          preferences.travelers === opt.value
                            ? "text-brand-900 font-semibold"
                            : "text-ink-soft"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── TRAVEL STYLE ── */}
      <div>
        <SectionLabel>Travel Style</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {travelTypes.map((type) => {
            const isSelected = preferences.travelType.includes(type.value);
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTravelTypeClick(type.value)}
                className={`rounded-2xl border-[1.5px] p-2 flex items-center gap-1.5 text-[11px] font-medium transition-colors text-left ${
                  isSelected
                    ? "bg-brand-900 border-brand-900 text-white"
                    : "bg-white border-line text-ink-soft hover:border-gold-500"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-white/15" : "bg-surface-dim"
                  }`}
                >
                  <type.icon size={14} aria-hidden="true" />
                </span>
                {type.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10.5px] text-ink-muted text-right mt-1">
          {travelSelected > 0
            ? `${travelSelected} selected · up to ${travelRemaining} more`
            : "Select up to 3"}
        </p>
      </div>

      {/* ── GETTING AROUND ── */}
      <div>
        <SectionLabel>Getting Around</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {transportationTypes.map((type) => {
            const isSelected = preferences.transportation.includes(type.value);
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTransportClick(type.value)}
                className={`rounded-2xl border-[1.5px] p-2 flex items-center gap-1.5 text-[11px] font-medium transition-colors text-left ${
                  isSelected
                    ? "bg-brand-900 border-brand-900 text-white"
                    : "bg-white border-line text-ink-soft hover:border-gold-500"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-white/15" : "bg-surface-dim"
                  }`}
                >
                  <type.icon size={14} aria-hidden="true" />
                </span>
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DAILY PACE ── */}
      <div>
        <SectionLabel>Daily Pace</SectionLabel>
        <div className="bg-white rounded-2xl border border-line overflow-hidden">
          <div className="flex p-1.5 gap-1">
            {paceOptions.map((pace) => {
              const isSelected = preferences.activityIntensity === pace.value;
              return (
                <button
                  key={pace.value}
                  type="button"
                  onClick={() => onPreferenceChange("activityIntensity", pace.value)}
                  className={`flex-1 py-1.5 rounded-xl text-center transition-colors ${
                    isSelected
                      ? "bg-brand-900 text-white"
                      : "text-ink-muted hover:bg-surface-dim"
                  }`}
                >
                  <div className="text-xs font-medium">{pace.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? "text-white/70" : "text-ink-muted"}`}>
                    {pace.sub}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="h-1 bg-line rounded-full mx-3 mb-3">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferenceForm;
