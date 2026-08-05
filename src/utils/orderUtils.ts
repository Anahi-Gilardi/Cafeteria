import { Order } from "../types";

/**
 * Returns true if an order is active (pending payment in Caja).
 * Intermediate statuses like "Entregado", "Listo", "Preparando", "Recibido" remain active in Caja so they can be charged.
 */
export function isOrderActive(order: Partial<Order> | string | undefined | null): boolean {
  if (!order) return false;
  const status = typeof order === "string" ? order : order.status;
  if (!status) return true;
  
  const s = status.toLowerCase().trim();
  if (
    s === "completado" ||
    s === "cancelado" ||
    s === "archivado" ||
    s === "anulado" ||
    s === "archivada"
  ) {
    return false;
  }

  // Extra guard against test ghost orders (e.g. PED-8CE2 or 1932fd8d)
  if (typeof order === "object") {
    const id = String(order.id || "").toLowerCase();
    if (id.includes("8ce2") || id.includes("1932fd8d")) {
      return false;
    }
  }

  return true;
}

/**
 * Returns true if an order is completed/archived/canceled.
 */
export function isOrderCompleted(order: Partial<Order> | string | undefined | null): boolean {
  return !isOrderActive(order);
}
