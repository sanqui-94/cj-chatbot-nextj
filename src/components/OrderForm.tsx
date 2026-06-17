"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createOrder } from "@/app/actions/orders";
import { orderInputSchema, type OrderFormValues } from "@/lib/validation";
import { HONEYPOT_FIELD } from "@/lib/config";
import { z } from "zod";

const EMPTY: OrderFormValues = {
  passengerName: "",
  phone: "",
  pickupAddress: "",
  destination: "",
  notes: "",
};

type FieldErrors = Partial<Record<keyof OrderFormValues, string[]>>;

export default function OrderForm() {
  const [values, setValues] = useState<OrderFormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Captured on mount — used for the server-side min-fill-time check.
  const renderedAt = useRef(0);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  function update(field: keyof OrderFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Client-side validation mirrors the server schema.
    const parsed = orderInputSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors as FieldErrors);
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const result = await createOrder({
        ...values,
        [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "",
        renderedAt: renderedAt.current,
      });

      if (result.ok) {
        setSuccessCode(result.code);
        setValues(EMPTY);
      } else {
        setFormError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors as FieldErrors);
        }
      }
    });
  }

  if (successCode) {
    return (
      <div className="lp-success" aria-live="polite">
        <p className="lp-success-head">
          <span className="dot" /> Pedido recibido
        </p>
        <h3 className="lp-display lp-success-title">Vamos en camino.</h3>
        <p className="lp-success-body">
          Su código de pedido es
          <br />
          <span className="lp-code lp-num">{successCode}</span>
          <br />
          Espere confirmación por WhatsApp; puede consultar por su pedido con
          este código.
        </p>
        <button
          type="button"
          onClick={() => {
            setSuccessCode(null);
            renderedAt.current = Date.now();
          }}
          className="lp-success-again"
        >
          Pedir otro taxi
        </button>
      </div>
    );
  }

  return (
    <form className="lp-form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot: hidden from users, must stay empty. */}
      <div aria-hidden="true" className="lp-hp">
        <label htmlFor={HONEYPOT_FIELD}>No completar</label>
        <input
          ref={honeypotRef}
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="lp-grid">
        <Field
          id="passengerName"
          icon="👤"
          label="Tu nombre"
          value={values.passengerName}
          onChange={(v) => update("passengerName", v)}
          errors={fieldErrors.passengerName}
          placeholder="Ej. Juan Pérez"
          autoComplete="name"
        />

        <Field
          wide
          id="pickupAddress"
          icon="📍"
          label="¿De dónde te recogemos?"
          value={values.pickupAddress}
          onChange={(v) => update("pickupAddress", v)}
          errors={fieldErrors.pickupAddress}
          placeholder="Av. Heroínas esq. Baptista, frente al Banco Nacional"
          hint="Calle + referencia (ej. esquina, color de edificio, frente a…)"
          multiline
        />

        <Field
          wide
          id="destination"
          icon="🏁"
          label="¿A dónde vas?"
          optional
          value={values.destination}
          onChange={(v) => update("destination", v)}
          errors={fieldErrors.destination}
          placeholder="Aeropuerto Jorge Wilstermann"
        />

        <Field
          wide
          id="notes"
          icon="📝"
          label="Detalles del viaje"
          optional
          value={values.notes}
          onChange={(v) => update("notes", v)}
          errors={fieldErrors.notes}
          placeholder="2 pasajeros con equipaje de mano"
          hint="Equipaje, mascotas, n.º de pasajeros, etc."
          multiline
        />

        <Field
          id="phone"
          icon="📱"
          label="Celular de contacto"
          value={values.phone}
          onChange={(v) => update("phone", v)}
          errors={fieldErrors.phone}
          placeholder="+591 7 001 2345"
          hint="Para confirmarte el taxi por WhatsApp"
          inputMode="tel"
          autoComplete="tel"
        />
      </div>

      {formError && <p className="lp-alert lp-alert-err">{formError}</p>}

      <div className="lp-cta-row">
        <button type="submit" className="lp-cta" disabled={isPending}>
          <span>{isPending ? "Enviando…" : "Pedir taxi"}</span>
        </button>
        <div className="lp-cta-hint">
          Le confirmamos por WhatsApp.
          <br />
          Sin registro, sin app.
        </div>
      </div>
    </form>
  );
}

type FieldProps = {
  id: string;
  icon: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  errors?: string[];
  optional?: boolean;
  wide?: boolean;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  inputMode?: "tel" | "text";
};

function Field({
  id,
  icon,
  label,
  value,
  onChange,
  errors,
  optional,
  wide,
  multiline,
  placeholder,
  hint,
  autoComplete,
  inputMode,
}: FieldProps) {
  const invalid = Boolean(errors?.length);
  const controlClass = (multiline ? "lp-textarea" : "lp-input") + (invalid ? " lp-err" : "");

  return (
    <div className={"lp-field" + (wide ? " lp-wide" : "")}>
      <label className="lp-lbl" htmlFor={id}>
        <span className="lp-lbl-i" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
        {optional && <span className="lp-lbl-opt">opcional</span>}
      </label>

      {multiline ? (
        <textarea
          id={id}
          name={id}
          rows={2}
          className={controlClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid}
        />
      ) : (
        <input
          id={id}
          name={id}
          type="text"
          className={controlClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={invalid}
        />
      )}

      {hint && !invalid && <div className="lp-help">{hint}</div>}
      {invalid && <div className="lp-help lp-err-msg">{errors![0]}</div>}
    </div>
  );
}
