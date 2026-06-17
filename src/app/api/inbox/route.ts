import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWaitingOrders } from "@/lib/orders";

// Session-guarded read endpoint — the SWR fetcher for the inbox queue.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const orders = await getWaitingOrders();
  return NextResponse.json(orders);
}
