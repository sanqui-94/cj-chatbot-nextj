import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, verifyPassword } from "../src/lib/password";

// Phase 3 checkpoint (data layer): the credential path the Auth.js Credentials
// provider relies on — argon2 hashing + a DB-backed user lookup — accepts the
// right password and rejects everything else. Browser login is verified
// separately.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const EMAIL = "verify-phase3@example.com";
const PASSWORD = "Corr3ct-Horse-Battery";

// Mirrors authorize() in src/auth.ts: lookup by email, verify the hash.
async function authorize(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  return (await verifyPassword(user.passwordHash, password)) ? user : null;
}

async function main() {
  // 1. argon2id hash/verify round-trips.
  const hash = await hashPassword(PASSWORD);
  assert.match(hash, /^\$argon2id\$/, "hash must be argon2id");
  assert.equal(await verifyPassword(hash, PASSWORD), true, "correct pw verifies");
  assert.equal(await verifyPassword(hash, "wrong"), false, "wrong pw rejected");
  console.log("✓ argon2id hash/verify round-trips");

  // 2. Seed an operator (clean any prior run first).
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.user.create({ data: { email: EMAIL, passwordHash: hash } });
  console.log("✓ Seeded test operator");

  // 3. Credential path: right password passes, wrong password & unknown
  //    email both fail.
  assert.ok(await authorize(EMAIL, PASSWORD), "valid credentials authorize");
  assert.equal(await authorize(EMAIL, "nope"), null, "bad password denied");
  assert.equal(
    await authorize("ghost@example.com", PASSWORD),
    null,
    "unknown email denied",
  );
  // Email lookup is case-insensitive (we lowercase before querying).
  assert.ok(await authorize(EMAIL.toUpperCase(), PASSWORD), "email case-insensitive");
  console.log("✓ Credential checks pass/deny correctly");

  // Cleanup.
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  console.log("✓ Cleaned up test operator");

  console.log("\nPhase 3 auth verification passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
