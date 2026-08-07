import { Order } from "../types";

/**
 * Returns true if an order is active (pending payment in Caja).
 * Intermediate statuses like "Entregado", "Listo", "Preparando", "Recibido" remain active in Caja so they can be charged.
 */
export function isOrderActive(order: Partial<Order> | string | undefined | null): boolean {
  if (!order) return false;
  const status = typeof order === "string" ? order : order.status;
  if (!status) return false;
  
  const s = String(status).toLowerCase().trim();
  if (
    s === "completado" ||
    s === "completada" ||
    s === "cancelado" ||
    s === "cancelada" ||
    s === "archivado" ||
    s === "archivada" ||
    s === "anulado" ||
    s === "anulada" ||
    s === "eliminado" ||
    s === "eliminada" ||
    s === "borrado" ||
    s === "borrada" ||
    s === "deleted" ||
    s === "purged"
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

/**
 * Formats a complex UUID or long order ID string into a simple short human-readable identifier (e.g. #PED-DC2C, #PED-64A9).
 */
export function formatOrderId(id: string | undefined | null): string {
  if (!id) return "#PED-0001";
  const cleanId = String(id).trim();

  // If it is already a short formatted ID like #PED-64A9 or PED-64A9
  if (/^#?PED-[A-Z0-9]{4}$/i.test(cleanId)) {
    return cleanId.startsWith("#") ? cleanId.toUpperCase() : `#${cleanId.toUpperCase()}`;
  }

  // Extract alphanumeric suffix or first chunk
  const withoutPrefix = cleanId.replace(/^PED-|^ord-|^FAC-MAN-|^RET-|^DEL-/i, "");
  const parts = withoutPrefix.split("-");
  const code = parts[0]?.length >= 4 ? parts[0].slice(0, 4) : parts[parts.length - 1]?.slice(-4) || cleanId.slice(-4);

  return `#PED-${code.toUpperCase()}`;
}
