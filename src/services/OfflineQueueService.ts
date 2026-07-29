import { Order } from "../types";
import { SupabaseSyncService } from "./SupabaseSyncService";

export interface PendingOfflineOrder {
  id: string;
  order: Order;
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
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  enqueueOrder(order: Order, reason?: string): void {
    const queue = this.getPendingQueue();
    if (queue.some((entry) => entry.id === order.id)) return;
    queue.push({
      id: order.id,
      order: { ...order, source: order.source || "offline_sync" },
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

      const result = await SupabaseSyncService.saveOrder(item.order);
      if (result.success) {
        synced += 1;
        onSyncedItem?.(item.id);
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
    this.persist(this.getPendingQueue().filter((item) => item.id !== orderId));
  }

  private persist(queue: PendingOfflineOrder[]): void {
    localStorage.setItem(this.queueKey, JSON.stringify(queue));
    window.dispatchEvent(
      new CustomEvent("castano:offline-queue", { detail: { pending: queue.length } })
    );
  }
}

export const offlineQueueService = new OfflineQueueService();
