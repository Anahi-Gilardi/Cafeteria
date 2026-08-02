import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn()
}));

vi.mock("../lib/supabase", () => ({
  supabaseProjectRef: "test-project",
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from
  }
}));

import { SupabaseSyncService } from "./SupabaseSyncService";
import type { Order } from "../types";

describe("SupabaseSyncService integrity", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.from.mockReset();
  });

  it("does not report an archive as successful when the RPC fails", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied", code: "42501" }
    });

    const result = await SupabaseSyncService.archiveOrder("ORDER-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("42501");
    expect(mocks.rpc).toHaveBeenCalledWith("archive_order", { p_order_id: "ORDER-1" });
  });

  it("only confirms an archive returned by Supabase", async () => {
    mocks.rpc.mockResolvedValue({
      error: null,
      data: {
        order_id: "ORDER-2",
        archived_at: "2026-08-01T12:00:00.000Z",
        archived_by: "auth-user",
        archive_reason: "archivado_manual",
        order_snapshot: {
          id: "ORDER-2",
          items: [],
          total: 1000,
          status: "Completado",
          created_at: "2026-08-01T11:00:00.000Z"
        }
      }
    });

    const result = await SupabaseSyncService.archiveOrder("ORDER-2");

    expect(result.success).toBe(true);
    expect(result.archivedOrder?.orderId).toBe("ORDER-2");
  });

  it("keeps mixed payments atomic when the batch RPC rejects them", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "payment total mismatch", code: "23514" }
    });

    const result = await SupabaseSyncService.recordPayments(
      "ORDER-3",
      [
        { amount: 500, method: "Efectivo", transactionId: "cash-1" },
        { amount: 500, method: "Tarjeta", transactionId: "card-1" }
      ]
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("23514");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "record_order_payment_batch",
      expect.objectContaining({ p_order_id: "ORDER-3" })
    );
  });

  it("does not create a partial order when a status update matches no row", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.from.mockReturnValue({ update });

    const result = await SupabaseSyncService.updateOrderStatus("MISSING", "Listo");

    expect(result.success).toBe(false);
    expect(result.error).toContain("No existe");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("persists and maps the real waiter instead of manufacturing one from the order id", async () => {
    const order: Order = {
      id: "ORDER-WAITER",
      items: [{ itemId: "item-1", name: "Café", quantity: 1, price: 3900, customizationSummary: "" }],
      subtotal: 3900,
      tax: 0,
      total: 3900,
      type: "Mesa",
      priceList: "Salon",
      tableNumber: "Mesa 1",
      waiterName: "Personal Real",
      status: "Recibido",
      createdAt: "2026-08-01T12:00:00.000Z",
      estimatedMinutes: 15
    };
    const single = vi.fn().mockResolvedValue({
      error: null,
      data: {
        id: order.id,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        type: order.type,
        price_list: order.priceList,
        table_number: order.tableNumber,
        waiter_name: order.waiterName,
        status: order.status,
        created_at: order.createdAt
      }
    });
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ upsert });

    const result = await SupabaseSyncService.saveOrder(order);

    expect(result.success).toBe(true);
    expect(result.order?.waiterName).toBe("Personal Real");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ waiter_name: "Personal Real" }),
      { onConflict: "id" }
    );
  });
});
