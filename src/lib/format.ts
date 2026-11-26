// Date formatting through Intl, so month and weekday names aren't hand-typed.
// The UI copy is English, so the locale is fixed to en-US.

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

/** "2026-12-10T00:00" → "Dec 10"; "" → "" */
export function formatShortDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : shortDate.format(d);
}

/** First of a month → "December 2026" */
export function formatMonthYear(d: Date): string {
  return monthYear.format(d);
}
