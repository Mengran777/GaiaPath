import React, { useRef, useState } from "react";
import { LocationAutocomplete } from "../UI";
import DateRangePicker from "../UI/DateRangePicker";
import UnsplashCredit from "../UI/UnsplashCredit";
import { formatShortDate } from "@/lib/format";

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
  /** Destination photo for the header (the first route's cover) */
  coverImageUrl?: string | null;
  coverAttribution?: { photographerName: string; photographerUrl: string } | null;
}

const formatDate = formatShortDate;
const nightsBetween = (a: string, b: string) =>
  a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)) : 0;

const travelerOptions = [
  { value: "1", label: "Solo" },
  { value: "2", label: "Two" },
  { value: "3-4", label: "3–4" },
  { value: "5+", label: "5+" },
];
const timeOfDayOptions = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];
const travelTypes = [
  { value: "history", label: "History" },
  { value: "food", label: "Food" },
  { value: "nature", label: "Nature" },
  { value: "art_shopping", label: "Art and shopping" },
  { value: "adventure", label: "Adventure" },
  { value: "relax", label: "Slow days" },
  { value: "honeymoon", label: "Romantic" },
  { value: "family", label: "Family" },
];
const transportationTypes = [
  { value: "car", label: "Self-drive" },
  { value: "public_transport", label: "Public transit" },
];
const paceOptions = [
  { value: "easy", label: "Relaxed" },
  { value: "moderate", label: "Moderate" },
  { value: "fast", label: "Busy" },
  { value: "high", label: "Packed" },
];

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="pt-6">
    <p className="eyebrow mb-1">{label}</p>
    {children}
  </div>
);

const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button type="button" aria-pressed={active} onClick={onClick} className="pill-sand text-[14px] !px-2.5 !py-0.5">
    {children}
  </button>
);

// Results-page sidebar. The destination photo leads (city and dates on it);
// place and dates fold away behind a link; the rest sits in two titled groups,
// "Who and how" and "What you're into", with sand-filled square options.
const PreferenceForm: React.FC<PreferenceFormProps> = ({ preferences, onPreferenceChange, coverImageUrl, coverAttribution }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Less-used settings stay folded so the sidebar reads as a short summary
  const [showMore, setShowMore] = useState(false);
  const dateRowRef = useRef<HTMLDivElement>(null);
  const p = preferences;
  const nights = nightsBetween(p.travelStartDate, p.travelEndDate);

  const toggleTravelType = (value: string) => {
    const sel = p.travelType;
    if (sel.includes(value)) onPreferenceChange("travelType", sel.filter((t) => t !== value));
    else if (sel.length < 3) onPreferenceChange("travelType", [...sel, value]);
    else onPreferenceChange("travelType", [...sel.slice(1), value]);
  };

  const toggleTransport = (value: string) => {
    const sel = p.transportation;
    onPreferenceChange("transportation", sel.includes(value) ? sel.filter((t) => t !== value) : [...sel, value]);
  };

  const [editingPlace, setEditingPlace] = useState(false);
  const city = p.destination.split(",")[0].trim() || "Your trip";
  const dateLine = p.travelStartDate && p.travelEndDate
    ? `${formatDate(p.travelStartDate)} — ${formatDate(p.travelEndDate)}${nights > 0 ? ` · ${nights} ${nights === 1 ? "night" : "nights"}` : ""}`
    : "Pick your dates";

  return (
    <div>
      {/* Photo header: the destination leads, dates sit on the photo */}
      <div className="relative aspect-[3/2] overflow-hidden bg-surface-dim">
        {coverImageUrl && (
          <img src={coverImageUrl} alt="" width={640} height={427} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className={`absolute inset-x-0 bottom-0 px-4 pb-3.5 pt-12 ${coverImageUrl ? "bg-gradient-to-t from-black/55 to-transparent text-white" : "text-ink"}`}>
          <p className={`text-[11px] tracking-[0.08em] uppercase ${coverImageUrl ? "text-white/85" : "text-ink-muted"}`}>{dateLine}</p>
          <p className="font-display text-[30px] leading-[1.02] mt-1 truncate">{city}</p>
        </div>
        {coverImageUrl && coverAttribution && (
          <UnsplashCredit
            photographerName={coverAttribution.photographerName}
            photographerUrl={coverAttribution.photographerUrl}
            className="absolute right-3 top-3"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setEditingPlace((v) => !v)}
        aria-expanded={editingPlace}
        className="link-quiet text-[13px] mt-3"
      >
        {editingPlace ? "Done" : "Change place or dates"}
      </button>

      {editingPlace && (
        <div className="animate-card-enter">
          <div className="pt-3">
            <label htmlFor="destination" className="eyebrow block">Where</label>
            <LocationAutocomplete
              id="destination"
              value={p.destination}
              onChange={(value) => onPreferenceChange("destination", value)}
              placeholder="Athens, Greece…"
              inputClassName="font-display text-[18px]"
            />
          </div>
          <div className="pt-4">
            <p className="eyebrow">When</p>
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
              className="field-line cursor-pointer flex items-baseline justify-between gap-3"
            >
              <span className={`font-display text-[18px] ${p.travelStartDate ? "text-ink" : "text-ink-muted"}`}>
                {p.travelStartDate
                  ? `${formatDate(p.travelStartDate)} — ${p.travelEndDate ? formatDate(p.travelEndDate) : "end date"}`
                  : "Pick dates"}
              </span>
              {nights > 0 && <span className="eyebrow">{nights} {nights === 1 ? "night" : "nights"}</span>}
            </div>
            {showDatePicker && (
              <DateRangePicker
                startDate={p.travelStartDate}
                endDate={p.travelEndDate}
                onStartDateChange={(date) => onPreferenceChange("travelStartDate", date)}
                onEndDateChange={(date) => {
                  onPreferenceChange("travelEndDate", date);
                  if (date) setShowDatePicker(false);
                }}
                triggerRef={dateRowRef}
                onClose={() => setShowDatePicker(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* Group 1 */}
      <h3 className="font-display text-[17px] text-ink border-b border-ink pb-1.5 mt-7">Who and how</h3>
      <Section label="Who">
        <div className="flex flex-wrap gap-0.5">
          {travelerOptions.map((o) => (
            <Pill key={o.value} active={p.travelers === o.value} onClick={() => onPreferenceChange("travelers", o.value)}>
              {o.label}
            </Pill>
          ))}
        </div>
      </Section>
      <Section label="Pace">
        <div className="flex flex-wrap gap-0.5">
          {paceOptions.map((o) => (
            <Pill key={o.value} active={p.activityIntensity === o.value} onClick={() => onPreferenceChange("activityIntensity", o.value)}>
              {o.label}
            </Pill>
          ))}
        </div>
      </Section>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
        className="link-quiet text-[13px] mt-4"
      >
        {showMore ? "Fewer options" : "Getting around, arrival times"}
      </button>
      {showMore && (
        <div className="animate-card-enter">
          <Section label="Getting around">
            <div className="flex flex-wrap gap-0.5">
              {transportationTypes.map((o) => (
                <Pill key={o.value} active={p.transportation.includes(o.value)} onClick={() => toggleTransport(o.value)}>
                  {o.label}
                </Pill>
              ))}
            </div>
          </Section>
          {(["arrivalTime", "departureTime"] as const).map((key) => (
            <Section key={key} label={key === "arrivalTime" ? "Arrive" : "Leave"}>
              <div className="flex flex-wrap gap-0.5">
                {timeOfDayOptions.map((o) => (
                  <Pill key={o.value} active={p[key] === o.value} onClick={() => onPreferenceChange(key, o.value)}>
                    {o.label}
                  </Pill>
                ))}
              </div>
            </Section>
          ))}
        </div>
      )}

      {/* Group 2 */}
      <div className="flex items-baseline justify-between border-b border-ink pb-1.5 mt-8">
        <h3 className="font-display text-[17px] text-ink">What you&apos;re into</h3>
        <span className="text-[11px] text-ink-muted">up to 3</span>
      </div>
      <div className="flex flex-wrap gap-0.5 pt-3">
        {travelTypes.map((o) => (
          <Pill key={o.value} active={p.travelType.includes(o.value)} onClick={() => toggleTravelType(o.value)}>
            {o.label}
          </Pill>
        ))}
      </div>
    </div>
  );
};

export default PreferenceForm;
