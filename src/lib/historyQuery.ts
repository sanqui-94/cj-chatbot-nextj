import { prisma } from "@/lib/db";
import { Prisma, Status } from "@/generated/prisma/client";
import { HISTORY_DEFAULT_DAYS, HISTORY_PAGE_SIZE } from "@/lib/config";
import { startOfLocalDay } from "@/lib/time";
import {
  DEFAULT_HISTORY_PARAMS,
  type HistoryParams,
  type HistoryRange,
  type HistoryRow,
  type HistoryPage,
  type HistoryStatusFilter,
} from "@/lib/history";

const DAY_MS = 86_400_000;

/** Lower bound on `createdAt` for the selected window. */
function rangeFilter(range: HistoryRange): { gte: Date } {
  const now = new Date();
  switch (range) {
    case "today":
      return { gte: startOfLocalDay(now) };
    case "30d":
      return { gte: new Date(now.getTime() - 30 * DAY_MS) };
    case "7d":
    default:
      return { gte: new Date(now.getTime() - HISTORY_DEFAULT_DAYS * DAY_MS) };
  }
}

type Cursor = { createdAt: Date; id: string };

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${row.createdAt.toISOString()}__${row.id}`).toString(
    "base64url",
  );
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const sep = decoded.lastIndexOf("__");
    if (sep === -1) return null;
    const createdAt = new Date(decoded.slice(0, sep));
    const id = decoded.slice(sep + 2);
    if (Number.isNaN(createdAt.getTime()) || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

// Keyset predicates on the (createdAt, id) tuple — uses the @@index([createdAt, id]).
function olderThan(c: Cursor): Prisma.OrderWhereInput {
  return {
    OR: [
      { createdAt: { lt: c.createdAt } },
      { createdAt: c.createdAt, id: { lt: c.id } },
    ],
  };
}
function newerThan(c: Cursor): Prisma.OrderWhereInput {
  return {
    OR: [
      { createdAt: { gt: c.createdAt } },
      { createdAt: c.createdAt, id: { gt: c.id } },
    ],
  };
}

function toRow(o: { id: string; code: string; createdAt: Date; status: Status }): HistoryRow {
  return {
    id: o.id,
    code: o.code,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
  };
}

const SELECT = { id: true, code: true, createdAt: true, status: true } as const;

/**
 * One page of order history, newest first, via keyset pagination on
 * `(createdAt, id)` — stable while new orders arrive (they only ever surface
 * on page 1). Fetches `PAGE_SIZE + 1` to detect whether a further page exists
 * in the direction of travel; the opposite-direction cursor is always present
 * once you've navigated away from page 1. Never loads everything (§1).
 */
export async function getHistory(params: HistoryParams): Promise<HistoryPage> {
  const take = HISTORY_PAGE_SIZE;
  const status: Status | undefined =
    params.status && params.status !== "ALL" ? params.status : undefined;

  const baseWhere: Prisma.OrderWhereInput = {
    createdAt: rangeFilter(params.range),
    ...(status ? { status } : {}),
  };

  const cursor = params.cursor ? decodeCursor(params.cursor) : null;

  // Page back (newer than cursor): scan ascending, then flip to descending.
  if (cursor && params.dir === "prev") {
    const asc = await prisma.order.findMany({
      where: { AND: [baseWhere, newerThan(cursor)] },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: take + 1,
      select: SELECT,
    });
    const hasNewer = asc.length > take;
    const page = asc.slice(0, take).reverse(); // back to newest-first display
    return {
      rows: page.map(toRow),
      // We navigated back from an older page, so a next page always exists.
      nextCursor: page.length ? encodeCursor(page[page.length - 1]) : null,
      prevCursor: hasNewer && page.length ? encodeCursor(page[0]) : null,
    };
  }

  // First page or page forward (older than cursor): scan descending.
  const desc = await prisma.order.findMany({
    where: cursor ? { AND: [baseWhere, olderThan(cursor)] } : baseWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: SELECT,
  });
  const hasOlder = desc.length > take;
  const page = desc.slice(0, take);
  return {
    rows: page.map(toRow),
    nextCursor: hasOlder && page.length ? encodeCursor(page[page.length - 1]) : null,
    // A cursor means we came from a newer page, so Prev is available.
    prevCursor: cursor && page.length ? encodeCursor(page[0]) : null,
  };
}

/** Parse + clamp `/api/history` query params to safe values. */
export function parseHistoryParams(sp: URLSearchParams): HistoryParams {
  const range = sp.get("range");
  const status = sp.get("status");
  const dir = sp.get("dir");
  return {
    range:
      range === "today" || range === "30d" || range === "7d"
        ? range
        : DEFAULT_HISTORY_PARAMS.range,
    status: isStatusFilter(status) ? status : DEFAULT_HISTORY_PARAMS.status,
    cursor: sp.get("cursor"),
    dir: dir === "prev" ? "prev" : "next",
  };
}

function isStatusFilter(v: string | null): v is HistoryStatusFilter {
  return (
    v === "ALL" ||
    v === Status.WAITING ||
    v === Status.DISPATCHED ||
    v === Status.ARCHIVED
  );
}
