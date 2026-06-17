"use client";

import { useState, useTransition } from "react";
import {
  archiveOrder,
  dispatchOrder,
  type MutationResult,
} from "@/app/actions/inbox";
import {
  customerMessage,
  driverBlock,
  type OrderView,
} from "@/lib/templates";
import { badgeLevel, waitingLabel, waitingMinutes } from "@/lib/badge";

type CopyKind = "driver" | "customer";

export default function InboxCard({
  order,
  now,
  revalidate,
}: {
  order: OrderView;
  now: number | null;
  revalidate: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopyKind | null>(null);

  // `now` is null until the client mounts (avoids hydration mismatch).
  const minutes = now === null ? null : waitingMinutes(order.createdAt, now);
  const level = minutes === null ? "muted" : badgeLevel(minutes);

  function run(action: () => Promise<MutationResult>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) revalidate();
      else {
        setError(res.error);
        // Stale card (the order already moved on): refetch so it drops out.
        if (res.stale) revalidate();
      }
    });
  }

  async function copy(kind: CopyKind, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(
        () => setCopied((c) => (c === kind ? null : c)),
        1500,
      );
    } catch {
      setError("No se pudo copiar al portapapeles.");
    }
  }

  return (
    <li className="lp-card">
      <div className="lp-card-top">
        <span className="lp-card-code lp-num">{order.code}</span>
        <span className={`lp-badge lp-badge-${level}`}>
          {minutes === null ? "esperando…" : waitingLabel(minutes)}
        </span>
      </div>

      <dl className="lp-card-fields">
        <Row label="Nombre" value={order.passengerName} />
        <Row label="Teléfono" value={order.phone} />
        <Row label="Origen" value={order.pickupAddress} />
        {order.destination && <Row label="Destino" value={order.destination} />}
        {order.notes && <Row label="Notas" value={order.notes} />}
      </dl>

      {error && <p className="lp-alert lp-alert-err">{error}</p>}

      <div className="lp-card-actions">
        <button
          type="button"
          className="lp-act lp-act-primary"
          disabled={isPending}
          onClick={() => run(() => dispatchOrder(order.id))}
        >
          Despachar
        </button>
        <button
          type="button"
          className="lp-act"
          disabled={isPending}
          onClick={() => run(() => archiveOrder(order.id))}
        >
          Archivar
        </button>
        <button
          type="button"
          className="lp-act"
          onClick={() => copy("driver", driverBlock(order))}
        >
          {copied === "driver" ? "¡Copiado!" : "Copiar datos"}
        </button>
        <button
          type="button"
          className="lp-act"
          onClick={() => copy("customer", customerMessage(order))}
        >
          {copied === "customer" ? "¡Copiado!" : "Copiar mensaje"}
        </button>
      </div>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="lp-card-row">
      <dt className="lp-card-k">{label}</dt>
      <dd className="lp-card-v">{value}</dd>
    </div>
  );
}
