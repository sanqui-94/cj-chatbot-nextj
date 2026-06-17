# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taxi order management web app for a local company in Bolivia. Visitors submit ride requests via a public form; a single authenticated operator manages the queue.

**Stack:** Next.js (App Router) · TypeScript · Prisma + PostgreSQL (Neon) · NextAuth/Auth.js (Credentials + JWT) · Tailwind + shadcn/ui · Zod · SWR

## Commands

```bash
pnpm dev              # start dev server
pnpm build            # prisma generate + next build
pnpm lint             # ESLint
docker compose up -d  # start local Postgres (see docker-compose.yml)
pnpm db:migrate       # prisma migrate dev (create/apply migration)
pnpm db:deploy        # prisma migrate deploy (production)
pnpm db:studio        # prisma studio — inspect DB
pnpm prisma generate  # regenerate client into src/generated/prisma
```

## Environment variables

```
DATABASE_URL   # Neon pooled (PgBouncer) — used at runtime
DIRECT_URL     # Neon unpooled — used only by Prisma for migrations
AUTH_SECRET    # NextAuth JWT secret
NEXTAUTH_URL   # deployed URL (if required by the Auth.js version)
```

## Architecture

### Prisma 7 specifics

- **Driver adapter required.** Runtime connects via `@prisma/adapter-pg` (node-postgres), not an embedded engine. `pg` speaks plain TCP, so the same client works against local Docker Postgres (dev) and Neon's pooled endpoint (prod). The singleton lives in `src/lib/db.ts` — import `prisma` from there.
- **Generated client** lives at `src/generated/prisma` (gitignored). Import `PrismaClient` from `@/generated/prisma/client`. Run `pnpm prisma generate` after schema changes (also runs on `postinstall` and `build`).
- **Connection URLs are NOT in `schema.prisma`** (Prisma 7 removed `url`/`directUrl` from the datasource block). They live in `prisma.config.ts`, which loads `.env` via `dotenv` and uses `DIRECT_URL` (falling back to `DATABASE_URL`) for Migrate/Studio.
- **Local dev DB:** `docker-compose.yml` runs Postgres 17 on `localhost:5432` (user/pass/db all `taxi`). `.env` points at it; `.env.example` shows the Neon format.

### Data model

Three Prisma models: `Order`, `DailyCounter`, `User` (see `IMPLEMENTATION.md §3`).

Order codes (`P-MMDD-NNNN`) are generated atomically: upsert+increment on `DailyCounter` and insert `Order` happen **in a single transaction**. The local date key uses `America/La_Paz` (UTC−4, no DST) — never UTC.

Status state machine: `WAITING → DISPATCHED` and `WAITING → ARCHIVED`, both reversible to `WAITING`. Reverting nulls `dispatchedAt`/`archivedAt`; `createdAt` is unchanged so the order resurfaces at its original FIFO position.

### Request flow

- **Public form** (`/`) — Server Action: validate with Zod (client + server), anti-abuse checks (honeypot, min fill-time, DB-backed per-IP throttle via `ipHash`), persist order, return code.
- **Operator login** (`/login`) — Credentials provider, argon2 password check, JWT session.
- **Inbox** (`/inbox`) — authenticated; loads entire WAITING queue FIFO ascending (no pagination); SWR polls every ~4000ms.
- **History** (`/history`) — authenticated; cursor/keyset pagination on `(createdAt, id)`; range + status filter; never loads everything.
- **Read route handlers** (`/api/inbox`, `/api/history`) — session-guarded; fetchers for SWR.
- **Mutations** — all Server Actions; caller awaits then triggers SWR revalidation; buttons disable during round-trip.
- **`/api/health`** — returns 200 for uptime monitor.

### SWR behaviour

Polling pauses when the tab is hidden (`visibilitychange`). No WebSockets, no SSE.

### Configurable constants (single source of truth)

All live in one file (e.g. `lib/config.ts`):

```ts
export const BADGE_THRESHOLDS = { greenMax: 15, amberMax: 25 }; // minutes
export const POLL_INTERVAL_MS = 4000;
export const TIMEZONE = "America/La_Paz";
export const COMPANY_NAME = "{NOMBRE_EMPRESA}";           // replace before launch
export const THROTTLE = { windowMin: 10, maxPerWindow: 5 };
export const HISTORY_DEFAULT_DAYS = 7;
export const HISTORY_PAGE_SIZE = 50;
```

### Bolivian phone validation

Strip spaces/dashes → exactly 8 digits starting with `6` or `7` → store as `+591XXXXXXXX`. Same Zod schema on client and server.

### Inbox badge colours (waiting time)

- Green: 0–15 min (`BADGE_THRESHOLDS.greenMax`)
- Amber: 15–25 min (`BADGE_THRESHOLDS.amberMax`)
- Red: >25 min

### Clipboard templates

Two copy actions per card (client component, `navigator.clipboard`). Empty optional fields are omitted. See `IMPLEMENTATION.md §1` for exact template strings.

## Operator provisioning

No sign-up UI. Seed a `User` row manually in Neon using the `hash-pw` script to produce the `passwordHash`.
