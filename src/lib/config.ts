// Single source of truth for tunable constants. See IMPLEMENTATION.md §6.

/** Waiting-time badge colour thresholds, in minutes. */
export const BADGE_THRESHOLDS = { greenMax: 15, amberMax: 25 } as const;

/** SWR polling interval for inbox + history, in milliseconds. */
export const POLL_INTERVAL_MS = 4000;

/** App timezone — UTC−4, no DST. All day boundaries resolve against this. */
export const TIMEZONE = "America/La_Paz";

/** Company name shown in the driver clipboard block. Replace before launch. */
export const COMPANY_NAME = "Radio Taxi Ciudad Jardín";

/** Per-IP anti-abuse throttle on the public form. Tune after observing traffic. */
export const THROTTLE = { windowMin: 10, maxPerWindow: 5 } as const;

/** Hidden honeypot field name — must stay empty; a bot that fills it is rejected. */
export const HONEYPOT_FIELD = "company";

/** Minimum time (ms) a human takes to fill the form. Faster submits are rejected. */
export const MIN_FILL_MS = 2000;

/** Default history window on load, in days. */
export const HISTORY_DEFAULT_DAYS = 7;

/** History page size for cursor pagination. */
export const HISTORY_PAGE_SIZE = 50;
