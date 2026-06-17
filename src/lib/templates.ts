import { COMPANY_NAME } from "./config";
import type { Status } from "@/generated/prisma/client";

/** Serializable order shape passed from the server page to client components. */
export type OrderView = {
  id: string;
  code: string;
  passengerName: string;
  phone: string;
  pickupAddress: string;
  destination: string | null;
  notes: string | null;
  status: Status;
  createdAt: string; // ISO string
};

/**
 * Driver data block (clipboard). Company-name header; empty optional fields
 * (destination, notes) are omitted automatically. See IMPLEMENTATION.md §1.
 */
export function driverBlock(o: OrderView): string {
  const lines = [
    COMPANY_NAME,
    `Pedido ${o.code}`,
    `Nombre: ${o.passengerName}`,
    `Teléfono: ${o.phone}`,
    `Origen: ${o.pickupAddress}`,
  ];
  if (o.destination) lines.push(`Destino: ${o.destination}`);
  if (o.notes) lines.push(`Notas: ${o.notes}`);
  return lines.join("\n");
}

/** Customer confirmation message (clipboard). */
export function customerMessage(o: OrderView): string {
  return `Hola ${o.passengerName}, su taxi desde ${o.pickupAddress} está confirmado. Su código es ${o.code}.`;
}
