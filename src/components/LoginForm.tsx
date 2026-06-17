"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const INITIAL: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, INITIAL);

  return (
    <form className="lp-login-form" action={formAction}>
      <div className="lp-field">
        <label className="lp-lbl" htmlFor="email">
          <span className="lp-lbl-i" aria-hidden="true">
            ✉️
          </span>
          <span>Correo</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="lp-input"
          autoComplete="username"
          placeholder="operador@empresa.com"
          required
        />
      </div>

      <div className="lp-field">
        <label className="lp-lbl" htmlFor="password">
          <span className="lp-lbl-i" aria-hidden="true">
            🔒
          </span>
          <span>Contraseña</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="lp-input"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error && <p className="lp-alert lp-alert-err">{state.error}</p>}

      <button type="submit" className="lp-cta" disabled={isPending}>
        <span>{isPending ? "Ingresando…" : "Ingresar"}</span>
      </button>
    </form>
  );
}
