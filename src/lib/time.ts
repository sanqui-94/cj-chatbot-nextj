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
