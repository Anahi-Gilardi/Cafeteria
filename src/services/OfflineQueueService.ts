import { Order } from "../types";
import { supabase } from "../lib/supabase";

export interface PendingOfflineOrder {
  id: string;
  order: Order;
  timestamp: string;
  retryCount: number;
}

export class OfflineQueueService {
  private queueKey = "puglia_offline_orders_queue";

  public getPendingQueue(): PendingOfflineOrder[] {
    try {
      const saved = localStorage.getItem(this.queueKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  public enqueueOrder(order: Order): void {
    const queue = this.getPendingQueue();
    queue.push({
      id: order.id,
      order,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
    localStorage.setItem(this.queueKey, JSON.stringify(queue));
  }

  public async syncPendingQueue(onSyncedItem?: (orderId: string) => void): Promise<number> {
    const queue = this.getPendingQueue();
    if (queue.length === 0) return 0;

    let syncedCount = 0;
    const remainingQueue: PendingOfflineOrder[] = [];

    for (const item of queue) {
      try {
        const { error } = await supabase.from("orders").insert({
          id: item.order.id,
          subtotal: item.order.subtotal,
          tax: item.order.tax,
          total: item.order.total,
          type: item.order.type,
          status: item.order.status,
          created_at: item.order.createdAt,
          items: item.order.items,
          table_number: item.order.tableNumber,
          payment_method: item.order.paymentMethod
        });

        if (!error) {
          syncedCount++;
          if (onSyncedItem) onSyncedItem(item.order.id);
        } else {
          remainingQueue.push({ ...item, retryCount: item.retryCount + 1 });
        }
      } catch (err) {
        remainingQueue.push({ ...item, retryCount: item.retryCount + 1 });
      }
    }

    localStorage.setItem(this.queueKey, JSON.stringify(remainingQueue));
    return syncedCount;
  }
}

export const offlineQueueService = new OfflineQueueService();
