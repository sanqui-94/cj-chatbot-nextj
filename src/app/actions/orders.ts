"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/ip";
import { localDateKey, localMMDD } from "@/lib/time";
import { orderInputSchema } from "@/lib/validation";
import { HONEYPOT_FIELD, MIN_FILL_MS, THROTTLE } from "@/lib/config";

export type CreateOrderResult =
  | { ok: true; code: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const GENERIC_ERROR =
  "No se pudo registrar el pedido. Intente nuevamente en unos momentos.";

/**
 * Public Server Action: validate, run anti-abuse checks, persist the order with
 * an atomically-generated code, and return that code.
 */
export async function createOrder(
  raw: Record<string, unknown>,
): Promise<CreateOrderResult> {
  // --- Anti-abuse: honeypot (must be empty) ---
  const honeypot = raw[HONEYPOT_FIELD];
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    // Silently behave like success to a bot without persisting anything.
    return { ok: false, error: GENERIC_ERROR };
  }

  // --- Anti-abuse: minimum fill time ---
  const renderedAt = Number(raw.renderedAt);
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < MIN_FILL_MS) {
    return { ok: false, error: GENERIC_ERROR };
  }

  // --- Validation (server-side; mirrors the client) ---
  const parsed = orderInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revise los datos del formulario.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const data = parsed.data;

  // --- Anti-abuse: per-IP throttle ---
  const ipHash = hashIp(await getClientIp());
  const since = new Date(Date.now() - THROTTLE.windowMin * 60_000);
  const recent = await prisma.order.count({
    where: { ipHash, createdAt: { gte: since } },
  });
  if (recent >= THROTTLE.maxPerWindow) {
    return {
      ok: false,
      error: "Demasiados pedidos recientes. Espere unos minutos.",
    };
  }

  // --- Persist: atomic daily counter + order in one transaction ---
  try {
    const day = localDateKey();
    const mmdd = localMMDD();
    const order = await prisma.$transaction(async (tx) => {
      const counter = await tx.dailyCounter.upsert({
        where: { day },
        create: { day, count: 1 },
        update: { count: { increment: 1 } },
      });
      const code = `P-${mmdd}-${String(counter.count).padStart(4, "0")}`;
      return tx.order.create({
        data: {
          code,
          passengerName: data.passengerName,
          phone: data.phone,
          pickupAddress: data.pickupAddress,
          destination: data.destination,
          notes: data.notes,
          ipHash,
        },
      });
    });

    return { ok: true, code: order.code };
  } catch (err) {
    console.error("createOrder failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
