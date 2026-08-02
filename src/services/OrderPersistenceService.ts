import type { Order } from "../types";
import { offlineQueueService } from "./OfflineQueueService";
import { SupabaseSyncService } from "./SupabaseSyncService";

export interface OrderPersistenceReport {
  attempted: number;
  persisted: number;
  failedOrderIds: string[];
}

function orderFingerprint(order: Order): string {
  return JSON.stringify(order);
}

export class OrderPersistenceService {
  static async persistChanges(previousOrders: Order[], nextOrders: Order[]): Promise<OrderPersistenceReport> {
    const previousById = new Map(previousOrders.map((order) => [order.id, order]));
    const changedOrders = nextOrders.filter((order) => {
      const previous = previousById.get(order.id);
      return !previous || orderFingerprint(previous) !== orderFingerprint(order);
    });

    const failedOrderIds: string[] = [];
    await Promise.all(
      changedOrders.map(async (order) => {
        const result = await SupabaseSyncService.saveOrder(order);
        if (!result.success) {
          failedOrderIds.push(order.id);
          offlineQueueService.enqueueOrder(order, result.error);
        }
      })
    );

    return {
      attempted: changedOrders.length,
      persisted: changedOrders.length - failedOrderIds.length,
      failedOrderIds
    };
  }
}
