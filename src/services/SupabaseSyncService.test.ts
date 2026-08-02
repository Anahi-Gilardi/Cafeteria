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

  it("does not report a deletion as successful when the protected RPC rejects it", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "paid orders cannot be deleted", code: "23514" }
    });

    const result = await SupabaseSyncService.deleteOrder("ORDER-PAID");

    expect(result.success).toBe(false);
    expect(result.error).toContain("23514");
    expect(result.error).toContain("no se puede eliminar");
    expect(mocks.rpc).toHaveBeenCalledWith("delete_order_transaction", {
      p_order_id: "ORDER-PAID",
      p_reason: "Eliminación manual desde Cocina & Chef"
    });
  });

  it("only confirms a deletion acknowledged by Supabase and exposes inventory restoration", async () => {
    mocks.rpc.mockResolvedValue({
      error: null,
      data: {
        deleted: true,
        order_id: "ORDER-DELETE",
        inventory_restored: true
      }
    });

    const result = await SupabaseSyncService.deleteOrder("ORDER-DELETE");

    expect(result.success).toBe(true);
    expect(result.inventoryRestored).toBe(true);
  });

  it("rejects a mismatched deletion acknowledgement", async () => {
    mocks.rpc.mockResolvedValue({
      error: null,
      data: { deleted: true, order_id: "OTHER-ORDER", inventory_restored: true }
    });

    const result = await SupabaseSyncService.deleteOrder("ORDER-DELETE");

    expect(result.success).toBe(false);
    expect(result.error).toContain("no confirmó");
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
    mocks.rpc.mockResolvedValue({
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

    const result = await SupabaseSyncService.saveOrder(order);

    expect(result.success).toBe(true);
    expect(result.order?.waiterName).toBe("Personal Real");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "persist_order_transaction",
      expect.objectContaining({
        p_order: expect.objectContaining({ waiter_name: "Personal Real" }),
        p_idempotency_key: "order:ORDER-WAITER"
      })
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("normalizes human-readable local timestamps before the database transaction", async () => {
    mocks.rpc.mockResolvedValue({
      error: null,
      data: {
        id: "ORDER-DATE",
        items: [],
        total: 0,
        status: "Recibido",
        created_at: "2026-08-02T12:00:00.000Z"
      }
    });
    const order: Order = {
      id: "ORDER-DATE",
      items: [{ itemId: "item-1", name: "Café", quantity: 1, price: 3900, customizationSummary: "" }],
      subtotal: 3900,
      tax: 0,
      total: 3900,
      type: "Mesa",
      priceList: "Salon",
      status: "Recibido",
      createdAt: "Hace instantes",
      estimatedMinutes: 15
    };

    await SupabaseSyncService.saveOrder(order);

    const call = mocks.rpc.mock.calls[0][1];
    expect(call.p_order.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(call.p_order.created_at).not.toBe("Hace instantes");
  });

  it("returns an actionable stock error and never bypasses the transaction", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "insufficient stock for item cafe", code: "23514" }
    });
    const order: Order = {
      id: "ORDER-STOCK",
      items: [{ itemId: "cafe", name: "Café", quantity: 99, price: 3900, customizationSummary: "" }],
      subtotal: 386100,
      tax: 0,
      total: 386100,
      type: "Mesa",
      priceList: "Salon",
      status: "Recibido",
      createdAt: new Date().toISOString(),
      estimatedMinutes: 15
    };

    const result = await SupabaseSyncService.saveOrder(order);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Stock insuficiente");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
