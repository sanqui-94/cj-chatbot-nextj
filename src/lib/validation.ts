import { z } from "zod";

// Shared by client and server. Bolivian mobile: strip non-digits, tolerate a
// leading 591 country code, then require exactly 8 digits starting with 6 or 7,
// and store the normalized E.164 form (+591XXXXXXXX).
const phoneField = z
  .string()
  .trim()
  .transform((v) => {
    let d = v.replace(/\D/g, "");
    if (d.length === 11 && d.startsWith("591")) d = d.slice(3);
    return d;
  })
  .pipe(
    z
      .string()
      .regex(
        /^[67]\d{7}$/,
        "Teléfono inválido: 8 dígitos que empiezan en 6 o 7",
      ),
  )
  .transform((d) => `+591${d}`);

// Optional free-text: empty string becomes undefined so blank fields are omitted.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const orderInputSchema = z.object({
  passengerName: z
    .string()
    .trim()
    .min(1, "Ingrese el nombre")
    .max(80, "Máximo 80 caracteres"),
  phone: phoneField,
  pickupAddress: z
    .string()
    .trim()
    .min(1, "Ingrese la dirección de origen")
    .max(200, "Máximo 200 caracteres"),
  destination: optionalText(200),
  notes: optionalText(500),
});

/** Validated, normalized order data ready to persist. */
export type OrderInput = z.infer<typeof orderInputSchema>;

/** Raw shape the form sends to the server action (before validation). */
export type OrderFormValues = {
  passengerName: string;
  phone: string;
  pickupAddress: string;
  destination: string;
  notes: string;
};
