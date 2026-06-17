import { BADGE_THRESHOLDS } from "./config";

/** Waiting-time badge colour. Purely a visual priority signal. */
export type BadgeLevel = "green" | "amber" | "red";

/** Whole minutes an order has been waiting, never negative. */
export function waitingMinutes(
  createdAt: string | Date,
  now: number = Date.now(),
): number {
  const t =
    typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
  return Math.max(0, Math.floor((now - t) / 60_000));
}

/** Map minutes to a colour using the configurable thresholds (§6). */
export function badgeLevel(minutes: number): BadgeLevel {
  if (minutes <= BADGE_THRESHOLDS.greenMax) return "green";
  if (minutes <= BADGE_THRESHOLDS.amberMax) return "amber";
  return "red";
}

/** Badge text, e.g. "esperando 27 min". */
export function waitingLabel(minutes: number): string {
  return `esperando ${minutes} min`;
}
