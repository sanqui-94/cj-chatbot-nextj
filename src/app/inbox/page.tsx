import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { COMPANY_NAME } from "@/lib/config";

export default async function InboxPage() {
  const session = await auth();
  if (!session) redirect("/login");

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

      <p className="lp-form-sub">
        Sesión iniciada. La bandeja de pedidos (tarjetas, acciones y colores de
        espera) se construye en la Fase 4.
      </p>
    </main>
  );
}
