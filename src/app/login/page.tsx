import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { COMPANY_NAME } from "@/lib/config";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  // Already signed in → straight to the inbox.
  const session = await auth();
  if (session) redirect("/inbox");

  return (
    <main className="lp-login">
      <div className="lp-login-card">
        <header className="lp-login-head">
          <p className="lp-eyebrow">Panel del operador</p>
          <h1 className="lp-display lp-login-title">{COMPANY_NAME}</h1>
          <p className="lp-form-sub">Ingrese para administrar la cola de pedidos.</p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
