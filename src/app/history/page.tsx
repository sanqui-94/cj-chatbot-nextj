import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { COMPANY_NAME } from "@/lib/config";
import { DEFAULT_HISTORY_PARAMS, historyKey } from "@/lib/history";
import { getHistory } from "@/lib/historyQuery";
import HistoryFeed from "@/components/HistoryFeed";

// Always render fresh: SWR takes over polling/pagination on the client.
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Initial paint (page 1, last 7 days, all statuses); SWR re-fetches thereafter.
  const initialData = await getHistory(DEFAULT_HISTORY_PARAMS);
  const initialKey = historyKey(DEFAULT_HISTORY_PARAMS);

  return (
    <main className="lp-panel">
      <header className="lp-panel-head">
        <div>
          <p className="lp-eyebrow">Historial de pedidos</p>
          <h1 className="lp-display lp-panel-title">{COMPANY_NAME}</h1>
        </div>
        <div className="lp-panel-user">
          <Link href="/inbox" className="lp-panel-link">
            Cola
          </Link>
          <span className="lp-panel-email">{session.user?.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="lp-panel-signout">
              Salir
            </button>
          </form>
        </div>
      </header>

      <HistoryFeed initialData={initialData} initialKey={initialKey} />
    </main>
  );
}
