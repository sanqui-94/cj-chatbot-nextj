import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

// Convenience operator provisioning (idempotent upsert by email):
//   pnpm create-operator "<email>" "<password>" ["<name>"]
// The spec's canonical path is `hash-pw` + a manual Neon insert; this script
// is the one-shot equivalent for local dev / first prod seed.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const [emailArg, password, name] = process.argv.slice(2);
  if (!emailArg || !password) {
    console.error('Usage: pnpm create-operator "<email>" "<password>" ["<name>"]');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name: name ?? null },
    update: { passwordHash, name: name ?? undefined },
  });

  console.log(`✓ Operator ready: ${user.email} (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
