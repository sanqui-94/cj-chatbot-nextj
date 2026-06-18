"use client";

import { useState, useTransition } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { POLL_INTERVAL_MS, TIMEZONE } from "@/lib/config";
import { revertToWaiting } from "@/app/actions/inbox";
import {
  historyKey,
  statusLabel,
  RANGE_OPTIONS,
  STATUS_OPTIONS,
  type HistoryPage,
  type HistoryRange,
  type HistoryRow,
  type HistoryStatusFilter,
} from "@/lib/history";

const dateFmt = new Intl.DateTimeFormat("es-BO", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * SWR-polled, keyset-paginated history table. Filters (range + status) live in
 * client state and reset pagination to page 1; the SWR key encodes everything
 * so polling, pagination, and the seeded `fallbackData` all share one cache.
 * `keepPreviousData` keeps the current page visible while the next loads.
 */
export default function HistoryFeed({
  initialData,
  initialKey,
}: {
  initialData: HistoryPage;
  initialKey: string;
}) {
  const [range, setRange] = useState<HistoryRange>("7d");
  const [status, setStatus] = useState<HistoryStatusFilter>("ALL");
  const [cursor, setCursor] = useState<string | null>(null);
  const [dir, setDir] = useState<"next" | "prev">("next");

  const key = historyKey({ range, status, cursor, dir });
  const { data, isLoading, mutate } = useSWR<HistoryPage>(key, jsonFetcher, {
    fallbackData: key === initialKey ? initialData : undefined,
    refreshInterval: POLL_INTERVAL_MS,
    keepPreviousData: true,
  });

  const page = data ?? initialData;

  function resetTo(next: () => void) {
    next();
    setCursor(null);
    setDir("next");
  }

  function goNext() {
    if (!page.nextCursor) return;
    setCursor(page.nextCursor);
    setDir("next");
  }

  function goPrev() {
    if (!page.prevCursor) return;
    setCursor(page.prevCursor);
    setDir("prev");
  }

  return (
    <>
      <div className="lp-hist-filters">
        <label className="lp-hist-field">
          <span className="lp-hist-label">Rango</span>
          <select
            className="lp-hist-select"
            value={range}
            onChange={(e) =>
              resetTo(() => setRange(e.target.value as HistoryRange))
            }
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="lp-hist-field">
          <span className="lp-hist-label">Estado</span>
          <select
            className="lp-hist-select"
            value={status}
            onChange={(e) =>
              resetTo(() => setStatus(e.target.value as HistoryStatusFilter))
            }
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {page.rows.length === 0 ? (
        <p className="lp-inbox-empty">No hay pedidos en este rango.</p>
      ) : (
        <div className="lp-hist-tablewrap">
          <table className="lp-hist-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Fecha y hora</th>
                <th>Estado</th>
                <th aria-label="Acción" />
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <HistoryTableRow
                  key={row.id}
                  row={row}
                  revalidate={() => mutate()}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="lp-hist-pager">
        <button
          type="button"
          className="lp-act"
          disabled={!page.prevCursor || isLoading}
          onClick={goPrev}
        >
          Anteriores
        </button>
        <button
          type="button"
          className="lp-act"
          disabled={!page.nextCursor || isLoading}
          onClick={goNext}
        >
          Siguientes
        </button>
      </div>
    </>
  );
}

function HistoryTableRow({
  row,
  revalidate,
}: {
  row: HistoryRow;
  revalidate: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function revert() {
    setError(null);
    startTransition(async () => {
      const res = await revertToWaiting(row.id);
      if (res.ok || res.stale) revalidate();
      else setError(res.error);
    });
  }

  return (
    <tr>
      <td className="lp-hist-code lp-num">{row.code}</td>
      <td className="lp-hist-time">{dateFmt.format(new Date(row.createdAt))}</td>
      <td>
        <span className={`lp-hist-status lp-hist-status-${row.status.toLowerCase()}`}>
          {statusLabel(row.status)}
        </span>
      </td>
      <td className="lp-hist-action">
        {row.status === "WAITING" ? (
          <span className="lp-hist-dash">—</span>
        ) : (
          <button
            type="button"
            className="lp-act"
            disabled={isPending}
            onClick={revert}
          >
            {isPending ? "…" : "Reactivar"}
          </button>
        )}
        {error && <span className="lp-hist-err">{error}</span>}
      </td>
    </tr>
  );
}
