"use client";

import useSWR from "swr";
import InboxList from "./InboxList";
import { jsonFetcher } from "@/lib/fetcher";
import { POLL_INTERVAL_MS } from "@/lib/config";
import type { OrderView } from "@/lib/templates";

export const INBOX_KEY = "/api/inbox";

/**
 * SWR-polled inbox. Seeds from the server-rendered `initialOrders` (instant
 * first paint), then revalidates every ~4s. SWR's default `refreshWhenHidden:
 * false` pauses polling while the tab is hidden and `revalidateOnFocus` snaps
 * back in sync the moment the operator returns. Mutations revalidate the same
 * key via the `revalidate` callback so the queue converges without a reload.
 */
export default function InboxFeed({
  initialOrders,
}: {
  initialOrders: OrderView[];
}) {
  const { data, mutate } = useSWR<OrderView[]>(INBOX_KEY, jsonFetcher, {
    fallbackData: initialOrders,
    refreshInterval: POLL_INTERVAL_MS,
    revalidateOnFocus: true,
  });

  const orders = data ?? initialOrders;

  return (
    <>
      <div className="lp-inbox-meta">
        <span className="lp-inbox-count">
          {orders.length} {orders.length === 1 ? "pedido" : "pedidos"} en espera
        </span>
      </div>
      <InboxList orders={orders} revalidate={() => mutate()} />
    </>
  );
}
