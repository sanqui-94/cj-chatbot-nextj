import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DATABASE_URL = Neon pooled (PgBouncer); DIRECT_URL = unpooled, used by
    // Migrate/Studio. Falls back to the pooled URL if DIRECT_URL is unset.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
