import Image from "next/image";
import OrderForm from "@/components/OrderForm";
import { COMPANY_NAME } from "@/lib/config";

export default function Home() {
  return (
    <div className="lp-app">
      {/* Brand head: logo bar */}
      <header className="lp-brand-head">
        <div className="lp-brand-logo-plate">
          <Image
            src="/brand/logo-color.png"
            alt={COMPANY_NAME}
            width={220}
            height={56}
            className="lp-brand-logo"
            priority
          />
        </div>
        <span className="lp-chip">
          <span className="lp-chip-dot" /> 24 hrs
        </span>
      </header>

      {/* Form panel */}
      <main className="lp-form-wrap">
        <header className="lp-form-head">
          <p className="lp-eyebrow">Pide tu taxi</p>
          <h2 className="lp-display lp-form-title">
            Un solo paso. Llega rápido.
          </h2>
          <p className="lp-form-sub">
            Llena los datos y le confirmamos su taxi por WhatsApp.
          </p>
        </header>

        <OrderForm />

        <div className="lp-foot">
          <span>© {COMPANY_NAME} · Cochabamba, Bolivia</span>
          <span>Servicio 24 hrs · Tarifas según destino</span>
        </div>
      </main>

      {/* Brand body: hero + contact */}
      <aside className="lp-brand-body">
        <Image
          src="/brand/logo-white.png"
          alt=""
          width={680}
          height={680}
          className="lp-brand-bg"
          aria-hidden
        />

        <div className="lp-brand-hero">
          <h1 className="lp-display lp-hero-title">
            Tu radio
            <br />
            móvil de
            <br />
            <em>confianza</em>.
          </h1>
          <p className="lp-hero-sub">
            Pide tu taxi en Cochabamba en menos de un minuto. Llena el
            formulario, mandamos un radio móvil a tu puerta.
          </p>

          <div className="lp-features">
            <span className="lp-feat">
              <span className="lp-feat-i">🌹</span> Choferes verificados
            </span>
            <span className="lp-feat">
              <span className="lp-feat-i">⚡</span> Respuesta inmediata
            </span>
            <span className="lp-feat">
              <span className="lp-feat-i">📍</span> Cochabamba · 24/7
            </span>
          </div>
        </div>

        <div className="lp-brand-foot">
          <a className="lp-call" href="tel:4241111">
            <span className="lp-call-label">Número central</span>
            <span className="lp-call-num lp-num">4241111</span>
          </a>
          <div className="lp-social">
            <a
              className="lp-social-btn"
              data-net="facebook"
              href="https://www.facebook.com/CiudadJardinBolivia"
              target="_blank"
              rel="noopener"
              aria-label="Facebook"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.25-1.5 1.5-1.5h1.6V4.4c-.3-.05-1.2-.15-2.3-.15-2.3 0-3.8 1.4-3.8 4v2.25H8v3h2.5V21z" />
              </svg>
            </a>
            <a
              className="lp-social-btn"
              data-net="instagram"
              href="https://www.instagram.com/radiotaxiciudadjardinsrl"
              target="_blank"
              rel="noopener"
              aria-label="Instagram"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              className="lp-social-btn"
              data-net="whatsapp"
              href="https://wa.link/lfiskd"
              target="_blank"
              rel="noopener"
              aria-label="WhatsApp"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 3a9 9 0 00-7.7 13.7L3 21l4.5-1.2A9 9 0 1012 3zm5.2 12.7c-.2.6-1.2 1.2-1.7 1.3-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.7.8 1.8.1.1.1.3 0 .5l-.3.4-.4.4c-.1.1-.2.3-.1.5.2.3.7 1.2 1.5 1.9 1 .9 1.8 1.2 2.1 1.3.3.1.4.1.6-.1.2-.2.7-.8.8-1 .2-.3.3-.2.6-.1.2.1 1.5.7 1.7.8.3.1.4.2.5.3.1.2.1.7-.1 1.2z" />
              </svg>
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
