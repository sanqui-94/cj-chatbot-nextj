import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { COMPANY_NAME } from "@/lib/config";
import { getWaitingOrders } from "@/lib/orders";
import InboxFeed from "@/components/InboxFeed";

// Always render fresh: the queue changes constantly and SWR takes over on the client.
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Initial paint; SWR re-fetches /api/inbox every ~4s thereafter.
  const orders = await getWaitingOrders();

  return (
    <main className="lp-panel">
      <header className="lp-panel-head">
        <div>
          <p className="lp-eyebrow">Cola de pedidos</p>
          <h1 className="lp-display lp-panel-title">{COMPANY_NAME}</h1>
        </div>
        <div className="lp-panel-user">
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

      <InboxFeed initialOrders={orders} />
    </main>
  );
}
