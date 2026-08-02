import { beforeEach, describe, expect, it, vi } from "vitest";

const syncMocks = vi.hoisted(() => ({
  saveOrder: vi.fn(),
  updateOrderStatus: vi.fn()
}));

vi.mock("./SupabaseSyncService", () => ({
  SupabaseSyncService: syncMocks
}));

import { OfflineQueueService } from "./OfflineQueueService";

describe("OfflineQueueService", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    syncMocks.saveOrder.mockReset();
    syncMocks.updateOrderStatus.mockReset();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value)
    });
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("CustomEvent", class {
      constructor(public type: string, public init?: unknown) {}
    });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  it("keeps only the latest pending status for an order", () => {
    const queue = new OfflineQueueService();
    queue.enqueueStatusUpdate("ORDER-1", "Preparando", "offline");
    queue.enqueueStatusUpdate("ORDER-1", "Listo", "offline");

    expect(queue.getPendingQueue()).toEqual([
      expect.objectContaining({
        operation: "update_status",
        orderId: "ORDER-1",
        status: "Listo"
      })
    ]);
  });

  it("replays a status operation without overwriting the complete order", async () => {
    syncMocks.updateOrderStatus.mockResolvedValue({ success: true });
    const queue = new OfflineQueueService();
    queue.enqueueStatusUpdate("ORDER-2", "Listo");

    const result = await queue.syncPendingQueue();

    expect(result).toEqual({ synced: 1, pending: 0 });
    expect(syncMocks.updateOrderStatus).toHaveBeenCalledWith("ORDER-2", "Listo");
    expect(syncMocks.saveOrder).not.toHaveBeenCalled();
  });

  it("migrates legacy queued orders as save operations", () => {
    storage.set("castano_offline_orders_v2", JSON.stringify([
      {
        id: "LEGACY-1",
        order: { id: "LEGACY-1" },
        timestamp: "2026-08-01T00:00:00.000Z",
        retryCount: 0,
        nextRetryAt: "2026-08-01T00:00:00.000Z"
      }
    ]));

    const [entry] = new OfflineQueueService().getPendingQueue();
    expect(entry.operation).toBe("save_order");
    expect(entry.orderId).toBe("LEGACY-1");
  });
});
