import { TIMEZONE } from "./config";

/**
 * Local calendar date in America/La_Paz as "YYYY-MM-DD".
 * Used as the DailyCounter key so the order counter resets at local midnight.
 */
export function localDateKey(date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "MMDD" portion of the local date, for the P-MMDD-NNNN order code. */
export function localMMDD(date: Date = new Date()): string {
  const key = localDateKey(date); // YYYY-MM-DD
  return key.slice(5, 7) + key.slice(8, 10);
}

/**
 * The instant of local midnight (start of the calendar day in America/La_Paz)
 * for the given date, as a UTC `Date`. Used as the lower bound of the History
 * "Hoy" range. La Paz is a fixed UTC−4 offset (no DST), so the local-date key
 * pinned to `-04:00` resolves to the correct absolute instant.
 */
export function startOfLocalDay(date: Date = new Date()): Date {
  return new Date(`${localDateKey(date)}T00:00:00-04:00`);
}
