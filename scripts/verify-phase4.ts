import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { badgeLevel, waitingLabel, waitingMinutes } from "../src/lib/badge";
import {
  customerMessage,
  driverBlock,
  type OrderView,
} from "../src/lib/templates";
import { COMPANY_NAME } from "../src/lib/config";

// Phase 4 checkpoint (data + logic layer): status transitions persist with the
// right timestamps, badge colours match the thresholds, and the clipboard
// templates render correctly (omitting empty optional fields). Browser clicks
// are exercised separately.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CODE = "P-9999-VERIFY";

async function main() {
  // ── Badge thresholds (green ≤15, amber ≤25, red >25) ──
  assert.equal(badgeLevel(waitingMinutes(new Date(), Date.now())), "green");
  assert.equal(badgeLevel(0), "green");
  assert.equal(badgeLevel(15), "green");
  assert.equal(badgeLevel(16), "amber");
  assert.equal(badgeLevel(25), "amber");
  assert.equal(badgeLevel(26), "red");
  // 27 min ago → "esperando 27 min", red.
  const ago = new Date(Date.now() - 27 * 60_000);
  const mins = waitingMinutes(ago);
  assert.equal(mins, 27);
  assert.equal(waitingLabel(mins), "esperando 27 min");
  assert.equal(badgeLevel(mins), "red");
  console.log("✓ Badge colours + labels match thresholds");

  // ── Clipboard templates ──
  const full: OrderView = {
    id: "x",
    code: "P-0612-0042",
    passengerName: "Juan Pérez",
    phone: "+59171234567",
    pickupAddress: "Av. Banzer #123",
    destination: "Aeropuerto Viru Viru",
    notes: "lleva 2 maletas",
    status: "WAITING",
    createdAt: new Date().toISOString(),
  };
  assert.equal(
    driverBlock(full),
    `${COMPANY_NAME}\nPedido P-0612-0042\nNombre: Juan Pérez\nTeléfono: +59171234567\nOrigen: Av. Banzer #123\nDestino: Aeropuerto Viru Viru\nNotas: lleva 2 maletas`,
  );
  assert.equal(
    customerMessage(full),
    "Hola Juan Pérez, su taxi desde Av. Banzer #123 está confirmado. Su código es P-0612-0042.",
  );
  // Empty optional fields are omitted (no Destino/Notas lines).
  const minimal: OrderView = {
    ...full,
    destination: null,
    notes: null,
  };
  const block = driverBlock(minimal);
  assert.ok(!block.includes("Destino:"), "destino omitted when empty");
  assert.ok(!block.includes("Notas:"), "notas omitted when empty");
  console.log("✓ Clipboard templates render + omit empty optionals");

  // ── Status transitions persist (mirrors the Server Actions) ──
  await prisma.order.deleteMany({ where: { code: CODE } });
  const order = await prisma.order.create({
    data: {
      code: CODE,
      passengerName: "Test",
      phone: "+59170000000",
      pickupAddress: "Calle Falsa 123",
    },
  });
  assert.equal(order.status, "WAITING");

  let o = await prisma.order.update({
    where: { id: order.id },
    data: { status: "DISPATCHED", dispatchedAt: new Date(), archivedAt: null },
  });
  assert.equal(o.status, "DISPATCHED");
  assert.ok(o.dispatchedAt, "dispatchedAt stamped");

  o = await prisma.order.update({
    where: { id: order.id },
    data: { status: "ARCHIVED", archivedAt: new Date(), dispatchedAt: null },
  });
  assert.equal(o.status, "ARCHIVED");
  assert.ok(o.archivedAt, "archivedAt stamped");

  o = await prisma.order.update({
    where: { id: order.id },
    data: { status: "WAITING", dispatchedAt: null, archivedAt: null },
  });
  assert.equal(o.status, "WAITING");
  assert.equal(o.dispatchedAt, null, "dispatchedAt nulled on revert");
  assert.equal(o.archivedAt, null, "archivedAt nulled on revert");
  assert.equal(
    o.createdAt.getTime(),
    order.createdAt.getTime(),
    "createdAt unchanged → original FIFO position",
  );
  console.log("✓ Dispatch / archive / revert persist with correct timestamps");

  await prisma.order.deleteMany({ where: { code: CODE } });
  console.log("✓ Cleaned up test order");

  console.log("\nPhase 4 inbox verification passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
