// Pure, client-safe history helpers: types, the SWR key builder, and the
// filter option lists/labels. NO Prisma import here so this module can be
// pulled into the client `HistoryFeed`. The actual DB query lives in
// `src/lib/historyQuery.ts` (server only). See IMPLEMENTATION.md §1 (History).

import type { Status } from "@/generated/prisma/client";

/** A history row — the spec columns (code, time, status) plus `id` for keys/revert. */
export type HistoryRow = {
  id: string;
  code: string;
  createdAt: string; // ISO string
  status: Status;
};

/** One page of history plus the keyset cursors for Prev/Next navigation. */
export type HistoryPage = {
  rows: HistoryRow[];
  nextCursor: string | null; // fetch older rows (page forward)
  prevCursor: string | null; // fetch newer rows (page back)
};

/** Time window for the range selector. */
export type HistoryRange = "today" | "7d" | "30d";

/** Status filter; "ALL" means no status constraint (the default). */
export type HistoryStatusFilter = "ALL" | Status;

export type HistoryParams = {
  range: HistoryRange;
  status: HistoryStatusFilter;
  cursor?: string | null;
  dir?: "next" | "prev";
};

export const DEFAULT_HISTORY_PARAMS: HistoryParams = {
  range: "7d",
  status: "ALL",
};

export const RANGE_OPTIONS: { value: HistoryRange; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
];

export const STATUS_OPTIONS: { value: HistoryStatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "WAITING", label: "En espera" },
  { value: "DISPATCHED", label: "Despachado" },
  { value: "ARCHIVED", label: "Archivado" },
];

/** Spanish label for a stored status. */
export function statusLabel(status: Status): string {
  switch (status) {
    case "WAITING":
      return "En espera";
    case "DISPATCHED":
      return "Despachado";
    case "ARCHIVED":
      return "Archivado";
    default:
      return status;
  }
}

/**
 * Build the `/api/history` URL (also the SWR cache key). Identical output on
 * the server (initial paint) and client (polling/pagination) so the seeded
 * `fallbackData` matches the first key exactly. `cursor`/`dir` are omitted on
 * the first page, keeping the key stable across filter resets.
 */
export function historyKey(params: HistoryParams): string {
  const sp = new URLSearchParams({
    range: params.range,
    status: params.status,
  });
  if (params.cursor) {
    sp.set("cursor", params.cursor);
    sp.set("dir", params.dir ?? "next");
  }
  return `/api/history?${sp.toString()}`;
}
