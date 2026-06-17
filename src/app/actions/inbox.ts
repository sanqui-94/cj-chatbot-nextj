"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Status } from "@/generated/prisma/client";

export type MutationResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "No se pudo actualizar el pedido. Intente nuevamente.";

/** All inbox/history mutations are session-guarded (single operator role). */
async function requireOperator(): Promise<boolean> {
  const session = await auth();
  return Boolean(session);
}

/** WAITING → DISPATCHED. Stamps `dispatchedAt`. */
export async function dispatchOrder(id: string): Promise<MutationResult> {
  return mutate(id, {
    status: Status.DISPATCHED,
    dispatchedAt: new Date(),
    archivedAt: null,
  });
}

/** WAITING → ARCHIVED (always manual). Stamps `archivedAt`. */
export async function archiveOrder(id: string): Promise<MutationResult> {
  return mutate(id, {
    status: Status.ARCHIVED,
    archivedAt: new Date(),
    dispatchedAt: null,
  });
}

/**
 * DISPATCHED|ARCHIVED → WAITING. Nulls both timestamps so the order resurfaces
 * at its original FIFO position (`createdAt` is unchanged). Used from History.
 */
export async function revertToWaiting(id: string): Promise<MutationResult> {
  return mutate(id, {
    status: Status.WAITING,
    dispatchedAt: null,
    archivedAt: null,
  });
}

async function mutate(
  id: string,
  data: {
    status: Status;
    dispatchedAt?: Date | null;
    archivedAt?: Date | null;
  },
): Promise<MutationResult> {
  if (!(await requireOperator())) {
    return { ok: false, error: "No autorizado." };
  }
  try {
    await prisma.order.update({ where: { id }, data });
    // Both views read this status; revalidate so server-rendered lists refresh.
    revalidatePath("/inbox");
    revalidatePath("/history");
    return { ok: true };
  } catch (err) {
    console.error("order mutation failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
