// Re-times a day's stops after they've been reordered.
//
// The day keeps its rhythm: the original start times (sorted) act as slots —
// e.g. 08:00, 11:00, 13:30, 18:30 — and the stops fill them in their new order.
// Each stop keeps its own duration, and never starts before the previous one
// ends plus a short buffer for getting there. Times that can't be parsed
// ("All day", empty) are left alone.
import type { Activity } from "@/types/itinerary";

const BUFFER_MIN = 15;
const DEFAULT_DURATION_MIN = 90;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) => {
  const clamped = Math.max(0, Math.min(min, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
};

function parseRange(time?: string): { start: number; end: number } | null {
  const m = time?.match(/^\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*$/);
  if (!m) {
    const single = time?.match(/^\s*(\d{1,2}:\d{2})\s*$/);
    if (!single) return null;
    const start = toMin(single[1]);
    return { start, end: start + DEFAULT_DURATION_MIN };
  }
  const start = toMin(m[1]);
  let end = toMin(m[2]);
  if (end <= start) end = start + DEFAULT_DURATION_MIN;
  return { start, end };
}

/**
 * @param activities  the day's stops in their NEW order
 * @param slotSource  the stops whose original times define the day's slots
 *                    (usually the day before the move); defaults to `activities`
 */
export function retimeDay(activities: Activity[], slotSource: Activity[] = activities): Activity[] {
  const slots = slotSource
    .map((a) => parseRange(a.time)?.start)
    .filter((s): s is number => s !== undefined)
    .sort((a, b) => a - b);
  if (slots.length === 0) return activities;

  let prevEnd = -Infinity;
  return activities.map((a, i) => {
    const range = parseRange(a.time);
    if (!range) return a;
    const duration = range.end - range.start;
    const slot = slots[i] ?? (Number.isFinite(prevEnd) ? prevEnd + BUFFER_MIN : range.start);
    const start = Number.isFinite(prevEnd) ? Math.max(slot, prevEnd + BUFFER_MIN) : slot;
    const end = start + duration;
    prevEnd = end;
    const time = `${toHHMM(start)}-${toHHMM(end)}`;
    return time === a.time ? a : { ...a, time };
  });
}
