import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { orderInputSchema } from "../src/lib/validation";
import { localDateKey, localMMDD } from "../src/lib/time";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // 1. Zod rejects bad input (empty name, invalid phone, empty address).
  const bad = orderInputSchema.safeParse({
    passengerName: "",
    phone: "12345",
    pickupAddress: "",
  });
  assert.equal(bad.success, false, "expected bad input to be rejected");
  console.log("✓ Zod rejects bad input");

  // 2. Zod accepts good input and normalizes phone / drops blank optionals.
  const good = orderInputSchema.safeParse({
    passengerName: "  Juan Pérez ",
    phone: "712 345 67",
    pickupAddress: "Av. Banzer #123",
    destination: "",
    notes: "",
  });
  assert.equal(good.success, true, "expected good input to pass");
  assert.equal(good.data!.phone, "+59171234567", "phone should be E.164");
  assert.equal(good.data!.passengerName, "Juan Pérez", "name should be trimmed");
  assert.equal(good.data!.destination, undefined, "blank optional → undefined");
  console.log("✓ Zod accepts + normalizes good input");

  // 3. Transactional code generation persists sequential, gapless codes.
  const day = localDateKey();
  const mmdd = localMMDD();

  async function place(name: string) {
    return prisma.$transaction(async (tx) => {
      const counter = await tx.dailyCounter.upsert({
        where: { day },
        create: { day, count: 1 },
        update: { count: { increment: 1 } },
      });
      const code = `P-${mmdd}-${String(counter.count).padStart(4, "0")}`;
      return tx.order.create({
        data: {
          code,
          passengerName: name,
          phone: "+59171234567",
          pickupAddress: "Av. Banzer #123",
        },
      });
    });
  }

  const a = await place("Test A");
  const b = await place("Test B");
  console.log(`✓ Persisted orders with codes: ${a.code}, ${b.code}`);

  assert.match(a.code, /^P-\d{4}-\d{4}$/, "code format P-MMDD-NNNN");
  assert.equal(
    Number(b.code.slice(-4)),
    Number(a.code.slice(-4)) + 1,
    "codes must be sequential",
  );

  const persisted = await prisma.order.findUnique({ where: { code: a.code } });
  assert.ok(persisted, "order row must be persisted");
  console.log("✓ Codes are sequential and rows are persisted");

  // Cleanup the test rows (leave the counter advanced — harmless in dev).
  await prisma.order.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  console.log("✓ Cleaned up test rows");

  console.log("\nPhase 2 data-layer verification passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
