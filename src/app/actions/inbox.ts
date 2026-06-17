"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Status } from "@/generated/prisma/client";

export type MutationResult =
  | { ok: true }
  | { ok: false; error: string; stale?: boolean };

const GENERIC_ERROR = "No se pudo actualizar el pedido. Intente nuevamente.";
// The card was stale (the order already moved on); the caller refetches.
const STALE_ERROR = "El pedido ya cambió de estado. Se actualizó la lista.";

/** All inbox/history mutations are session-guarded (single operator role). */
async function requireOperator(): Promise<boolean> {
  const session = await auth();
  return Boolean(session);
}

/** WAITING → DISPATCHED. Stamps `dispatchedAt`. */
export async function dispatchOrder(id: string): Promise<MutationResult> {
  return mutate(id, Status.WAITING, {
    status: Status.DISPATCHED,
    dispatchedAt: new Date(),
    archivedAt: null,
  });
}

/** WAITING → ARCHIVED (always manual). Stamps `archivedAt`. */
export async function archiveOrder(id: string): Promise<MutationResult> {
  return mutate(id, Status.WAITING, {
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
  return mutate(id, [Status.DISPATCHED, Status.ARCHIVED], {
    status: Status.WAITING,
    dispatchedAt: null,
    archivedAt: null,
  });
}

async function mutate(
  id: string,
  from: Status | Status[],
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
    // Guard the source status in the WHERE clause so the check-and-set is
    // atomic: a card that polling left stale (the order already moved on)
    // matches no rows and is rejected instead of forcing an illegal
    // transition / clobbering the timestamp set by the real transition.
    const { count } = await prisma.order.updateMany({
      where: { id, status: Array.isArray(from) ? { in: from } : from },
      data,
    });
    if (count === 0) {
      return { ok: false, error: STALE_ERROR, stale: true };
    }
    // Both views read this status; revalidate so server-rendered lists refresh.
    revalidatePath("/inbox");
    revalidatePath("/history");
    return { ok: true };
  } catch (err) {
    console.error("order mutation failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
