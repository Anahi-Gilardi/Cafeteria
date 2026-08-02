import { Order, OrderStatusType } from "../types";
import { SupabaseSyncService } from "./SupabaseSyncService";

export interface PendingOfflineOrder {
  id: string;
  operation: "save_order" | "update_status";
  orderId: string;
  order?: Order;
  status?: OrderStatusType;
  timestamp: string;
  retryCount: number;
  nextRetryAt: string;
  lastError?: string;
}

const MAX_RETRIES = 8;

export class OfflineQueueService {
  private readonly queueKey = "castano_offline_orders_v2";

  getPendingQueue(): PendingOfflineOrder[] {
    try {
      const saved = localStorage.getItem(this.queueKey);
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((entry: any) => ({
        ...entry,
        operation: entry.operation || "save_order",
        orderId: entry.orderId || entry.order?.id || entry.id
      }));
    } catch {
      return [];
    }
  }

  enqueueOrder(order: Order, reason?: string): void {
    const queue = this.getPendingQueue();
    const queueId = `save:${order.id}`;
    if (queue.some((entry) => entry.id === queueId || (entry.operation === "save_order" && entry.orderId === order.id))) return;
    queue.push({
      id: queueId,
      operation: "save_order",
      orderId: order.id,
      order: { ...order, source: order.source || "offline_sync" },
      timestamp: new Date().toISOString(),
      retryCount: 0,
      nextRetryAt: new Date().toISOString(),
      lastError: reason
    });
    this.persist(queue);
  }

  enqueueStatusUpdate(orderId: string, status: OrderStatusType, reason?: string): void {
    const queue = this.getPendingQueue().filter(
      (entry) => !(entry.operation === "update_status" && entry.orderId === orderId)
    );
    queue.push({
      id: `status:${orderId}`,
      operation: "update_status",
      orderId,
      status,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      nextRetryAt: new Date().toISOString(),
      lastError: reason
    });
    this.persist(queue);
  }

  async syncPendingQueue(
    onSyncedItem?: (orderId: string) => void
  ): Promise<{ synced: number; pending: number }> {
    const queue = this.getPendingQueue();
    if (queue.length === 0 || !navigator.onLine) {
      return { synced: 0, pending: queue.length };
    }

    let synced = 0;
    const remaining: PendingOfflineOrder[] = [];
    const now = Date.now();

    for (const item of queue) {
      if (new Date(item.nextRetryAt).getTime() > now) {
        remaining.push(item);
        continue;
      }

      const result = item.operation === "update_status"
        ? item.status
          ? await SupabaseSyncService.updateOrderStatus(item.orderId, item.status)
          : { success: false, error: "La operación no contiene un estado" }
        : item.order
          ? await SupabaseSyncService.saveOrder(item.order)
          : { success: false, error: "La operación no contiene una comanda" };
      if (result.success) {
        synced += 1;
        onSyncedItem?.(item.orderId);
        continue;
      }

      const retryCount = item.retryCount + 1;
      const delayMinutes = Math.min(60, 2 ** Math.min(retryCount, 6));
      remaining.push({
        ...item,
        retryCount,
        nextRetryAt: new Date(now + delayMinutes * 60_000).toISOString(),
        lastError:
          retryCount >= MAX_RETRIES
            ? `Requiere revisión manual: ${result.error || "error desconocido"}`
            : result.error
      });
    }

    this.persist(remaining);
    return { synced, pending: remaining.length };
  }

  remove(orderId: string): void {
    this.persist(this.getPendingQueue().filter((item) => item.orderId !== orderId));
  }

  private persist(queue: PendingOfflineOrder[]): void {
    localStorage.setItem(this.queueKey, JSON.stringify(queue));
    window.dispatchEvent(
      new CustomEvent("castano:offline-queue", { detail: { pending: queue.length } })
    );
  }
}

export const offlineQueueService = new OfflineQueueService();
