import { createHash } from "node:crypto";
import { headers } from "next/headers";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** One-way hash of the IP (salted with AUTH_SECRET) — we never store the raw IP. */
export function hashIp(ip: string): string {
  const salt = process.env.AUTH_SECRET ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
