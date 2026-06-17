"use client";

import { useSyncExternalStore } from "react";
import InboxCard from "./InboxCard";
import type { OrderView } from "@/lib/templates";

// A single shared clock that ticks each minute. `useSyncExternalStore` returns
// the server snapshot (null) during SSR + the first client render, then the
// client snapshot — so badges fill in after hydration with no mismatch and no
// setState-in-effect. The cached value keeps getSnapshot stable between ticks.
let clockNow = Date.now();
function subscribeClock(onChange: () => void): () => void {
  const id = window.setInterval(() => {
    clockNow = Date.now();
    onChange();
  }, 30_000);
  return () => window.clearInterval(id);
}

/**
 * Renders the WAITING queue (FIFO, oldest first). Badge colours/labels stay
 * accurate between data loads via the shared clock. `revalidate` re-fetches the
 * SWR-polled queue after a mutation so the list converges immediately.
 */
export default function InboxList({
  orders,
  revalidate,
}: {
  orders: OrderView[];
  revalidate: () => void;
}) {
  const now = useSyncExternalStore(
    subscribeClock,
    () => clockNow,
    () => null as number | null,
  );

  if (orders.length === 0) {
    return <p className="lp-inbox-empty">No hay pedidos en espera.</p>;
  }

  return (
    <ul className="lp-inbox-list">
      {orders.map((o) => (
        <InboxCard key={o.id} order={o} now={now} revalidate={revalidate} />
      ))}
    </ul>
  );
}
