import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 connects through a driver adapter. node-postgres (pg) speaks plain
// TCP, so the same client works against local Postgres (dev) and Neon's pooled
// endpoint (prod).
const connectionString = process.env.DATABASE_URL;

// Reuse a single PrismaClient across hot reloads in development to avoid
// exhausting the connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
