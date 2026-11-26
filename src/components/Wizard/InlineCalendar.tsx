"use client";

import React, { useEffect, useState } from "react";
import Lozenge from "../UI/Lozenge";
import { formatMonthYear } from "@/lib/format";

interface InlineCalendarProps {
  startDate: string; // "YYYY-MM-DDT00:00" or ""
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const toValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00`;
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Two months side by side, always visible (the wizard's dates step).
 * Past days are disabled; the start and end are black squares and the nights
 * between are sand.
 */
const InlineCalendar: React.FC<InlineCalendarProps> = ({ startDate, endDate, onChange }) => {
  const today = dayStart(new Date());
  const initial = startDate ? new Date(startDate) : today;
  const [first, setFirst] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [hover, setHover] = useState<Date | null>(null);
  // "Today" depends on the viewer's clock and time zone, which the server
  // render can't know; draw the days only once mounted in the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-full min-h-[340px]" aria-hidden="true" />;

  const start = startDate ? dayStart(new Date(startDate)) : null;
  const end = endDate ? dayStart(new Date(endDate)) : null;
  const atCurrentMonth =
    first.getFullYear() < today.getFullYear() ||
    (first.getFullYear() === today.getFullYear() && first.getMonth() <= today.getMonth());

  const pick = (d: Date) => {
    if (d < today) return;
    if (!start || (start && end) || d < start) {
      onChange(toValue(d), "");
      setHover(null);
    } else {
      onChange(toValue(start), toValue(d));
    }
  };

  const renderMonth = (offset: number) => {
    const m = new Date(first.getFullYear(), first.getMonth() + offset, 1);
    const lead = m.getDay();
    const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const rangeEnd = end ?? (start && hover && hover > start ? hover : null);

    return (
      <div key={offset} className="min-w-0">
        <p className="font-display text-xl text-center mb-4">
          {formatMonthYear(m)}
        </p>
        <div className="grid grid-cols-7 mb-1.5">
          {WEEKDAYS.map((w) => (
            <span key={w} className="eyebrow text-center text-[10px]">{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: lead }).map((_, i) => <span key={`l${i}`} />)}
          {Array.from({ length: count }).map((_, i) => {
            const d = new Date(m.getFullYear(), m.getMonth(), i + 1);
            const past = d < today;
            const isStart = !!start && d.getTime() === start.getTime();
            const isEnd = !!rangeEnd && d.getTime() === rangeEnd.getTime();
            const inRange = !!start && !!rangeEnd && d > start && d < rangeEnd;
            const isToday = d.getTime() === today.getTime();
            return (
              <button
                key={i}
                type="button"
                disabled={past}
                onClick={() => pick(d)}
                onMouseEnter={() => start && !end && !past && setHover(d)}
                aria-pressed={isStart || isEnd}
                aria-label={d.toDateString()}
                className={`relative h-10 text-sm tabular-nums transition-colors duration-300 ${
                  past
                    ? "text-ink-faint cursor-default"
                    : isStart || isEnd
                    ? "bg-ink text-white"
                    : inRange
                    ? "bg-sand text-ink"
                    : "text-ink hover:bg-surface-dim"
                }`}
              >
                {isToday && !isStart && !isEnd && (
                  <Lozenge className="absolute top-1 left-1/2 -translate-x-1/2 w-[5px] h-[5px] text-ink" />
                )}
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <button
          type="button"
          disabled={atCurrentMonth}
          onClick={() => setFirst(new Date(first.getFullYear(), first.getMonth() - 1, 1))}
          className="eyebrow text-ink disabled:text-ink-faint disabled:cursor-default enabled:opacity-60 enabled:hover:opacity-100 transition-opacity"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setFirst(new Date(first.getFullYear(), first.getMonth() + 1, 1))}
          className="eyebrow text-ink opacity-60 hover:opacity-100 transition-opacity"
        >
          Next
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
        {renderMonth(0)}
        <div className="hidden sm:block">{renderMonth(1)}</div>
      </div>
    </div>
  );
};

export default InlineCalendar;
