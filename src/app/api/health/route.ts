import { NextResponse } from "next/server";

// Public liveness endpoint for an external uptime monitor (UptimeRobot / Better
// Stack). Intentionally dependency-free — returns 200 whenever the app is
// serving, independent of the database. See IMPLEMENTATION.md §1 (Deploy/infra).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
}
