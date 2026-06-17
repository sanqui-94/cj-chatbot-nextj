import { prisma } from "@/lib/db";
import { Status } from "@/generated/prisma/client";
import type { OrderView } from "@/lib/templates";

/**
 * The entire WAITING queue, FIFO ascending (oldest at top), no pagination (§1).
 * Shared by the server-rendered inbox page (initial paint) and the `/api/inbox`
 * route handler (SWR fetcher) so both return the identical serializable shape.
 */
export async function getWaitingOrders(): Promise<OrderView[]> {
  const rows = await prisma.order.findMany({
    where: { status: Status.WAITING },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((o) => ({
    id: o.id,
    code: o.code,
    passengerName: o.passengerName,
    phone: o.phone,
    pickupAddress: o.pickupAddress,
    destination: o.destination,
    notes: o.notes,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));
}
