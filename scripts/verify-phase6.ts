import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getHistory } from "../src/lib/historyQuery";
import { HISTORY_PAGE_SIZE } from "../src/lib/config";
import type { HistoryPage, HistoryParams } from "../src/lib/history";

// Phase 6 checkpoint (data + logic layer): keyset pagination on (createdAt, id)
// is stable while new orders arrive, Prev/Next cursors round-trip, and the
// range + status filters narrow the result without ever loading everything.
// (The HTTP guard on /api/history mirrors verify-phase5.sh.)
//
// The dev DB may already hold orders, so assertions key off our own unique
// codes and give the seeded rows future timestamps (guaranteed newest) rather
// than assuming an empty table.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PREFIX = "P-V6-";
const OLD_PREFIX = "P-V6OLD-";
const RECENT = HISTORY_PAGE_SIZE + 5; // one full page + a partial second page
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(4, "0");
const codeOf = (i: number) => `${PREFIX}${pad(i)}`;
const codes = (p: HistoryPage) => p.rows.map((r) => r.code);
const ids = (p: HistoryPage) => p.rows.map((r) => r.id);

async function collectCodes(params: HistoryParams): Promise<string[]> {
  const all: string[] = [];
  let page = await getHistory(params);
  all.push(...codes(page));
  while (page.nextCursor) {
    page = await getHistory({ ...params, cursor: page.nextCursor, dir: "next" });
    all.push(...codes(page));
  }
  return all;
}

async function cleanup() {
  await prisma.order.deleteMany({ where: { code: { startsWith: PREFIX } } });
  await prisma.order.deleteMany({ where: { code: { startsWith: OLD_PREFIX } } });
}

async function main() {
  await cleanup();

  // Seed RECENT orders 1s apart in the near future (so they sort above any
  // pre-existing rows), with a deterministic status cycle, plus two 10-day-old
  // orders that fall outside the default 7-day window. Index 0 = newest.
  const future = Date.now() + 120_000;
  const cycle = ["WAITING", "DISPATCHED", "ARCHIVED"] as const;
  await prisma.order.createMany({
    data: Array.from({ length: RECENT }, (_, i) => ({
      code: codeOf(i),
      passengerName: `V6 ${i}`,
      phone: "+59170000000",
      pickupAddress: "Calle Falsa 123",
      status: cycle[i % 3],
      createdAt: new Date(future - i * 1000),
    })),
  });
  await prisma.order.createMany({
    data: [0, 1].map((i) => ({
      code: `${OLD_PREFIX}${pad(i)}`,
      passengerName: `V6 old ${i}`,
      phone: "+59170000000",
      pickupAddress: "Calle Vieja 1",
      createdAt: new Date(Date.now() - 10 * DAY_MS),
    })),
  });
  const mine = Array.from({ length: RECENT }, (_, i) => codeOf(i)); // newest-first
  console.log(`✓ Seeded ${RECENT} recent + 2 old orders`);

  const params: HistoryParams = { range: "7d", status: "ALL" };

  // ── Page 1: our newest 50, newest-first, no Prev ──
  const p1 = await getHistory(params);
  assert.equal(p1.rows.length, HISTORY_PAGE_SIZE, "page 1 is a full page");
  assert.equal(p1.prevCursor, null, "page 1 has no Prev");
  assert.ok(p1.nextCursor, "page 1 has a Next");
  assert.deepEqual(codes(p1), mine.slice(0, HISTORY_PAGE_SIZE), "page 1 = newest 50, in order");
  console.log("✓ Page 1: newest-first, full page, Prev disabled");

  // ── Page 2 (Next): our remaining 5 lead the page; has a Prev ──
  const p2 = await getHistory({ ...params, cursor: p1.nextCursor, dir: "next" });
  assert.deepEqual(
    codes(p2).slice(0, RECENT - HISTORY_PAGE_SIZE),
    mine.slice(HISTORY_PAGE_SIZE),
    "page 2 leads with the remaining seeded rows",
  );
  assert.ok(p2.prevCursor, "page 2 has a Prev");
  const onP1 = new Set(ids(p1));
  assert.ok(!ids(p2).some((id) => onP1.has(id)), "no overlap between pages");
  console.log("✓ Page 2 (Next): remainder leads, disjoint from page 1");

  // ── Prev back to page 1 (our rows are newest, so this is exact) ──
  const back = await getHistory({ ...params, cursor: p2.prevCursor!, dir: "prev" });
  assert.deepEqual(codes(back), codes(p1), "Prev returns exactly page 1");
  assert.equal(back.prevCursor, null, "back at the top → no Prev");
  console.log("✓ Prev returns to page 1 unchanged");

  // ── Stability under insert: a new order surfaces only on page 1 ──
  const fresh = await prisma.order.create({
    data: {
      code: `${PREFIX}NEW`,
      passengerName: "V6 new",
      phone: "+59170000000",
      pickupAddress: "Nueva 1",
      createdAt: new Date(future + 1000), // newest of all
    },
  });
  const p1after = await getHistory(params);
  assert.equal(p1after.rows[0].code, `${PREFIX}NEW`, "new order is now first on page 1");
  // Same cursor as before → page 2 contents are unchanged (keyset stability).
  const p2after = await getHistory({ ...params, cursor: p1.nextCursor, dir: "next" });
  assert.deepEqual(ids(p2after), ids(p2), "page 2 unaffected by the insert");
  console.log("✓ Keyset pagination is stable while new orders arrive");
  await prisma.order.delete({ where: { id: fresh.id } });

  // ── Status filter: ARCHIVED only; our archived rows lead (newest-first) ──
  const archived = await getHistory({ range: "7d", status: "ARCHIVED" });
  assert.ok(
    archived.rows.every((r) => r.status === "ARCHIVED"),
    "status filter returns only matching rows",
  );
  const myArchived = mine.filter((_, i) => i % 3 === 2);
  assert.deepEqual(
    codes(archived).slice(0, myArchived.length),
    myArchived,
    "archived filter leads with our archived rows",
  );
  console.log(`✓ Status filter narrows to ARCHIVED (${myArchived.length} of ours lead)`);

  // ── Range filter: the 10-day-old orders are in 30d but not 7d ──
  const oldCodes = [0, 1].map((i) => `${OLD_PREFIX}${pad(i)}`);
  const in7d = new Set(await collectCodes({ range: "7d", status: "ALL" }));
  const in30d = new Set(await collectCodes({ range: "30d", status: "ALL" }));
  assert.ok(oldCodes.every((c) => !in7d.has(c)), "old orders excluded from 7d window");
  assert.ok(oldCodes.every((c) => in30d.has(c)), "old orders included in 30d window");
  assert.ok(mine.every((c) => in7d.has(c)), "all recent orders present in 7d window");
  console.log("✓ Range filter: 7d excludes old orders, 30d includes them");

  await cleanup();
  console.log("✓ Cleaned up seeded orders");
  console.log("\nPhase 6 history verification passed.");
}

main()
  .catch(async (e) => {
    console.error(e);
    await cleanup().catch(() => {});
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
