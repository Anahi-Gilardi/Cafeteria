import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveOrder: vi.fn(),
  enqueueOrder: vi.fn()
}));

vi.mock("./SupabaseSyncService", () => ({
  SupabaseSyncService: { saveOrder: mocks.saveOrder }
}));

vi.mock("./OfflineQueueService", () => ({
  offlineQueueService: { enqueueOrder: mocks.enqueueOrder }
}));

import { OrderPersistenceService } from "./OrderPersistenceService";
import type { Order } from "../types";

const baseOrder: Order = {
  id: "ORDER-1",
  items: [{ itemId: "item-1", name: "Café", quantity: 1, price: 3900, customizationSummary: "" }],
  subtotal: 3900,
  tax: 0,
  total: 3900,
  type: "Mesa",
  priceList: "Salon",
  status: "Completado",
  createdAt: "2026-08-02T12:00:00.000Z",
  estimatedMinutes: 15,
  paymentMethod: "Efectivo"
};

describe("OrderPersistenceService", () => {
  beforeEach(() => {
    mocks.saveOrder.mockReset();
    mocks.enqueueOrder.mockReset();
  });

  it("persists edits beyond status changes, including payment method", async () => {
    mocks.saveOrder.mockResolvedValue({ success: true, order: { ...baseOrder, paymentMethod: "Tarjeta" } });

    const report = await OrderPersistenceService.persistChanges(
      [baseOrder],
      [{ ...baseOrder, paymentMethod: "Tarjeta" }]
    );

    expect(report).toEqual({ attempted: 1, persisted: 1, failedOrderIds: [] });
    expect(mocks.saveOrder).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: "Tarjeta" }));
  });

  it("does not rewrite unchanged orders", async () => {
    const report = await OrderPersistenceService.persistChanges([baseOrder], [{ ...baseOrder }]);

    expect(report.attempted).toBe(0);
    expect(mocks.saveOrder).not.toHaveBeenCalled();
  });

  it("queues the complete order when Supabase rejects an edit", async () => {
    mocks.saveOrder.mockResolvedValue({ success: false, error: "offline" });
    const changed = { ...baseOrder, paymentMethod: "MercadoPago" as const };

    const report = await OrderPersistenceService.persistChanges([baseOrder], [changed]);

    expect(report.failedOrderIds).toEqual([baseOrder.id]);
    expect(mocks.enqueueOrder).toHaveBeenCalledWith(changed, "offline");
  });
});
