import { Order } from "../types";

/**
 * Returns true if an order is active (not completed, delivered, canceled, or archived).
 */
export function isOrderActive(order: Partial<Order> | string | undefined | null): boolean {
  if (!order) return false;
  const status = typeof order === "string" ? order : order.status;
  if (!status) return true;
  
  const s = status.toLowerCase().trim();
  return (
    s !== "completado" &&
    s !== "entregado" &&
    s !== "cancelado" &&
    s !== "archivado" &&
    s !== "anulado" &&
    s !== "finalizado" &&
    s !== "archivada"
  );
}

/**
 * Returns true if an order is completed/delivered/archived/canceled.
 */
export function isOrderCompleted(order: Partial<Order> | string | undefined | null): boolean {
  return !isOrderActive(order);
}
