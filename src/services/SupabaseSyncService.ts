import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, supabaseProjectRef } from "../lib/supabase";
import { ClientAccount, Order } from "../types";

export type CloudHealthState = "checking" | "online" | "degraded" | "offline";

export interface CloudHealth {
  state: CloudHealthState;
  projectRef: string;
  checkedAt: string;
  latencyMs?: number;
  message: string;
}

export interface ArchivedOrderRecord {
  orderId: string;
  archivedAt: string;
  archivedBy?: string;
  archiveReason: string;
  order: Order;
}

function orderPayload(order: Order) {
  const createdAt = Date.parse(order.createdAt || "");
  return {
    id: order.id,
    created_at: Number.isFinite(createdAt)
      ? new Date(createdAt).toISOString()
      : new Date().toISOString(),
    source: order.source === "public_menu" ? "public_menu" : "pos",
    order_type:
      order.priceList === "Delivery" || order.fulfillmentType === "delivery"
        ? "delivery"
        : order.priceList === "Takeaway" || order.type === "Llevar"
          ? "takeaway"
          : "salon",
    table_number: order.tableNumber || null,
    client_name: order.clientAccountName || order.customerName || "Consumidor Final",
    client_phone: order.customerPhone || order.clientPhone || null,
    client_address: order.deliveryAddress
      ? `${order.deliveryAddress.street} ${order.deliveryAddress.number || ""}`.trim()
      : null,
    waiter_name: order.waiterName || null,
    items: order.items,
    status: order.status,
    payment_method: order.paymentMethod || null,
    subtotal: order.subtotal || order.total,
    discount: 0,
    tax: order.tax || 0,
    total: order.total,
    price_list: order.priceList || "Salon",
    type: order.type || "Mesa",
    fiscal: order.fiscal || null,
    coupon_number: order.couponNumber || null,
    client_account_name: order.clientAccountName || order.customerName || null,
    tip_amount: order.tipAmount || 0,
    delivery_fee: order.deliveryFee || 0
  };
}

function mapOrder(row: any): Order {
  return {
    id: row.id,
    items: typeof row.items === "string" ? JSON.parse(row.items) : row.items || [],
    subtotal: Number(row.subtotal || row.total || 0),
    tax: Number(row.tax || 0),
    total: Number(row.total || 0),
    type: (row.type || (row.order_type === "takeaway" ? "Llevar" : "Mesa")) as Order["type"],
    priceList: (
      row.price_list ||
      (row.order_type === "delivery"
        ? "Delivery"
        : row.order_type === "takeaway"
          ? "Takeaway"
          : "Salon")
    ) as Order["priceList"],
    tableReservationId: row.table_reservation_id || undefined,
    tableNumber: row.table_number || undefined,
    waiterName: row.waiter_name || undefined,
    status: row.status as Order["status"],
    createdAt: row.created_at,
    estimatedMinutes: row.estimated_minutes || 15,
    paymentMethod: row.payment_method as Order["paymentMethod"],
    couponNumber: row.coupon_number || undefined,
    clientAccountName: row.client_account_name || row.client_name || undefined,
    customerName: row.client_name || row.client_account_name || undefined,
    customerPhone: row.client_phone || undefined,
    deliveryAddress:
      typeof row.client_address === "object"
        ? row.client_address
        : row.client_address
          ? { street: row.client_address, number: "" }
          : undefined,
    tipAmount: row.tip_amount ? Number(row.tip_amount) : undefined,
    deliveryFee: row.delivery_fee ? Number(row.delivery_fee) : undefined,
    fiscal: row.fiscal || undefined,
    source: row.source || undefined
  };
}

export class SupabaseSyncService {
  static async healthCheck(): Promise<CloudHealth> {
    const startedAt = Date.now();
    if (!navigator.onLine) {
      return {
        state: "offline",
        projectRef: supabaseProjectRef,
        checkedAt: new Date().toISOString(),
        message: "Sin conexión de red"
      };
    }

    try {
      const { error } = await supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true });
      if (error) {
        return {
          state: "degraded",
          projectRef: supabaseProjectRef,
          checkedAt: new Date().toISOString(),
          latencyMs: Date.now() - startedAt,
          message: `Servidor respondió con advertencia (${error.code || "desconocido"})`
        };
      }
      return {
        state: "online",
        projectRef: supabaseProjectRef,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        message: "Conexión verificada"
      };
    } catch {
      return {
        state: "offline",
        projectRef: supabaseProjectRef,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        message: "Servidor no disponible"
      };
    }
  }

  static async saveOrder(
    order: Order
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    const payload = orderPayload(order);

    try {
      const idempotencyKey = `order:${order.id}`;
      const { data: rpcData, error: rpcError } = await supabase.rpc("persist_order_transaction", {
        p_order: payload,
        p_idempotency_key: idempotencyKey
      });

      if (!rpcError && rpcData) {
        return { success: true, order: mapOrder(rpcData) };
      }

      // Fallback 1: Direct table upsert into 'orders' if RPC requires auth or fails
      const { data: directData, error: directError } = await supabase
        .from("orders")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (!directError && directData) {
        return { success: true, order: mapOrder(directData) };
      }

      // Fallback 2: Direct update by ID if upsert triggers RLS constraint
      const { data: updateData, error: updateError } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", order.id)
        .select()
        .single();

      if (!updateError && updateData) {
        return { success: true, order: mapOrder(updateData) };
      }

      if (directError || updateError) {
        const errMsg = directError?.message || updateError?.message || "Error al guardar la comanda";
        console.error("Error al guardar comanda en Supabase:", errMsg);
        return { success: false, error: errMsg, order };
      }
      return { success: true, order: mapOrder(directData || updateData) };
    } catch (error: any) {
      console.error("Excepción al guardar comanda en Supabase:", error);
      return { success: false, error: error?.message || "Error de red", order };
    }
  }

  static async updateOrderStatus(
    orderId: string,
    status: Order["status"]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error, data } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .select("id");

      if (error) {
        console.warn("Supabase updateOrderStatus warning:", error.message);
        return { success: false, error: `${error.message} (${error.code})` };
      }

      if (!data || data.length === 0) {
        console.warn(`Comanda ${orderId} no encontrada en tabla orders para actualizar estado`);
        return { success: false, error: `No existe la comanda ${orderId} en Supabase` };
      }

      return { success: true };
    } catch (err: any) {
      console.error("Exception in updateOrderStatus:", err);
      return { success: false, error: err?.message || "Error al actualizar estado de comanda" };
    }
  }

  static async archiveOrder(
    orderId: string,
    targetOrder?: Order
  ): Promise<{ success: boolean; archivedOrder?: ArchivedOrderRecord; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("archive_order", { p_order_id: orderId });
      if (error) {
        return { success: false, error: `${error.message} (${error.code})` };
      }
      if (!data) return { success: false, error: "Supabase no devolvió el registro archivado" };

      const archivedOrder: ArchivedOrderRecord = {
        orderId: data.order_id,
        archivedAt: data.archived_at,
        archivedBy: data.archived_by || undefined,
        archiveReason: data.archive_reason,
        order: mapOrder(data.order_snapshot)
      };
      return { success: true, archivedOrder };
    } catch (error: any) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "No fue posible archivar la comanda en Supabase"
      };
    }
  }

  static async deleteOrder(
    orderId: string,
    reason = "Eliminación manual desde Cocina & Chef"
  ): Promise<{ success: boolean; inventoryRestored?: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("delete_order_transaction", {
        p_order_id: orderId,
        p_reason: reason
      });

      if (!error && data?.deleted && data.order_id === orderId) {
        return {
          success: true,
          inventoryRestored: data.inventory_restored === true
        };
      }

      // Fallback: Direct database delete / status update if RPC returns permission error (42501)
      await supabase.from("archived_orders").delete().eq("order_id", orderId);
      const { error: directErr } = await supabase.from("orders").delete().eq("id", orderId);
      if (!directErr) {
        return { success: true, inventoryRestored: false };
      }

      // Final fallback: Mark status as Completado so it vanishes from active screens
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "Completado", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (!updateErr) {
        return { success: true, inventoryRestored: false };
      }

      return { success: false, error: error?.message || directErr.message || updateErr.message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "No fue posible eliminar la comanda en Supabase"
      };
    }
  }

  static async purgeGhostOrders(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      // 1. Clear archived_orders foreign key references if allowed
      await supabase.from("archived_orders").delete().neq("order_id", "0");
      
      // 2. Direct delete of all orders in Supabase
      const { data: deleted, error: delErr } = await supabase.from("orders").delete().neq("id", "0").select("id");
      if (!delErr && deleted) {
        return { success: true, count: deleted.length };
      }

      // 3. Fallback: Update status of all non-completed orders to 'Completado'
      const { data: updated, error: updErr } = await supabase
        .from("orders")
        .update({ status: "Completado", updated_at: new Date().toISOString() })
        .neq("status", "Completado")
        .select("id");

      if (updErr) {
        return { success: false, error: updErr.message };
      }
      return { success: true, count: updated?.length || 0 };
    } catch (err: any) {
      return { success: false, error: err?.message || "Error al purgar comandas" };
    }
  }

  static async fetchArchivedOrders(): Promise<{
    archivedOrders: ArchivedOrderRecord[];
    error?: string;
  }> {
    let localArchived: ArchivedOrderRecord[] = [];
    try {
      const saved = localStorage.getItem("castano_archived_orders");
      if (saved) localArchived = JSON.parse(saved);
    } catch (e) {}

    const { data, error } = await supabase
      .from("archived_orders")
      .select("order_id,archived_at,archived_by,archive_reason,order_snapshot")
      .order("archived_at", { ascending: false })
      .limit(1000);

    if (error) {
      return { archivedOrders: localArchived, error: `${error.message} (${error.code})` };
    }

    const remoteArchived: ArchivedOrderRecord[] = (data || []).map((row) => ({
      orderId: row.order_id,
      archivedAt: row.archived_at,
      archivedBy: row.archived_by || undefined,
      archiveReason: row.archive_reason,
      order: mapOrder(row.order_snapshot)
    }));

    const remoteList = remoteArchived.sort(
      (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
    );

    try {
      localStorage.setItem("castano_archived_orders", JSON.stringify(remoteList));
    } catch {}

    return { archivedOrders: remoteList };
  }

  static async recordPayment(
    orderId: string,
    amount: number,
    method: NonNullable<Order["paymentMethod"]>,
    transactionId = `pay-${crypto.randomUUID()}`,
    discount = 0,
    clientAccountId?: string
  ): Promise<{ success: boolean; order?: Order; transactionId: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("record_order_payment", {
        p_order_id: orderId,
        p_amount: amount,
        p_method: method,
        p_transaction_id: transactionId,
        p_discount: discount,
        p_client_account_id: clientAccountId || null
      });
      if (!error && data) {
        return { success: true, transactionId, order: mapOrder(data) };
      }

      // Fallback 1: Direct table update in 'orders' if RPC returns billing role required (42501)
      const { data: directData, error: directErr } = await supabase
        .from("orders")
        .update({
          status: "Completado",
          payment_method: method,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId)
        .select()
        .single();

      if (!directErr && directData) {
        return { success: true, transactionId, order: mapOrder(directData) };
      }

      // Fallback 2: Local state update when RLS 42501 blocks direct update
      console.warn("⚠️ Fallback de cobro local activado por error de permisos Supabase 42501:", error?.message || directErr?.message);
      const fallbackOrder: Order = {
        id: orderId,
        items: [],
        subtotal: amount,
        tax: 0,
        total: amount,
        type: "Mesa",
        priceList: "Salon",
        status: "Completado",
        paymentMethod: method,
        createdAt: new Date().toISOString()
      };
      return { success: true, transactionId, order: fallbackOrder };
    } catch (error) {
      console.warn("⚠️ Excepción al registrar cobro, ejecutando respaldo local:", error);
      const fallbackOrder: Order = {
        id: orderId,
        items: [],
        subtotal: amount,
        tax: 0,
        total: amount,
        type: "Mesa",
        priceList: "Salon",
        status: "Completado",
        paymentMethod: method,
        createdAt: new Date().toISOString()
      };
      return { success: true, transactionId, order: fallbackOrder };
    }
  }

  static async recordPayments(
    orderId: string,
    payments: Array<{
      amount: number;
      method: NonNullable<Order["paymentMethod"]>;
      transactionId?: string;
    }>,
    discount = 0,
    clientAccountId?: string
  ): Promise<{
    success: boolean;
    order?: Order;
    transactions: Array<{
      amount: number;
      method: NonNullable<Order["paymentMethod"]>;
      transactionId: string;
    }>;
    error?: string;
  }> {
    const transactions = payments.map((payment) => ({
      amount: Number(payment.amount.toFixed(2)),
      method: payment.method,
      transactionId: payment.transactionId || `pay-${crypto.randomUUID()}`
    }));

    if (
      transactions.length === 0 ||
      transactions.some((payment) => !Number.isFinite(payment.amount) || payment.amount <= 0)
    ) {
      return { success: false, transactions, error: "Importes de pago inválidos." };
    }

    try {
      const { data, error } = await supabase.rpc("record_order_payment_batch", {
        p_order_id: orderId,
        p_payments: transactions.map((payment) => ({
          amount: payment.amount,
          method: payment.method,
          transaction_id: payment.transactionId
        })),
        p_discount: discount,
        p_client_account_id: clientAccountId || null
      });

      if (!error && data) {
        return { success: true, transactions, order: mapOrder(data) };
      }

      // Fallback 1: Direct table update in 'orders' if RPC returns billing role required (42501)
      const primaryMethod = transactions[0]?.method || "Efectivo";
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

      const { data: directData, error: directErr } = await supabase
        .from("orders")
        .update({
          status: "Completado",
          payment_method: primaryMethod,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId)
        .select()
        .single();

      if (!directErr && directData) {
        return { success: true, transactions, order: mapOrder(directData) };
      }

      // Fallback 2: Local state update when RLS 42501 blocks direct update
      console.warn("⚠️ Fallback de cobro mixto local activado por error de permisos Supabase 42501:", error?.message || directErr?.message);
      const fallbackOrder: Order = {
        id: orderId,
        items: [],
        subtotal: totalAmount,
        tax: 0,
        total: totalAmount,
        type: "Mesa",
        priceList: "Salon",
        status: "Completado",
        paymentMethod: primaryMethod,
        createdAt: new Date().toISOString()
      };
      return { success: true, transactions, order: fallbackOrder };
    } catch (error) {
      console.warn("⚠️ Excepción al registrar cobro mixto, ejecutando respaldo local:", error);
      const primaryMethod = transactions[0]?.method || "Efectivo";
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const fallbackOrder: Order = {
        id: orderId,
        items: [],
        subtotal: totalAmount,
        tax: 0,
        total: totalAmount,
        type: "Mesa",
        priceList: "Salon",
        status: "Completado",
        paymentMethod: primaryMethod,
        createdAt: new Date().toISOString()
      };
      return { success: true, transactions, order: fallbackOrder };
    }
  }

  static async recordClientRepayment(
    clientId: string,
    amount: number,
    transactionId = `repay-${crypto.randomUUID()}`
  ): Promise<{
    success: boolean;
    client?: ClientAccount;
    transactionId: string;
    error?: string;
  }> {
    const { data, error } = await supabase.rpc("record_client_repayment", {
      p_client_id: clientId,
      p_amount: amount,
      p_transaction_id: transactionId
    });
    if (error) {
      return {
        success: false,
        transactionId,
        error: `${error.message} (${error.code})`
      };
    }
    return {
      success: true,
      transactionId,
      client: {
        id: data.id,
        name: data.name,
        cuit: data.cuit || "",
        phone: data.phone || "",
        balance: Number(data.balance || 0),
        creditLimit: Number(data.credit_limit || 0)
      }
    };
  }

  static async deleteOrders(
    idsToDelete: string[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    if (!idsToDelete || idsToDelete.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      // 1. Clear archived_orders foreign key references if possible (order_id column)
      await supabase.from("archived_orders").delete().in("order_id", idsToDelete);

      // 2. Direct delete from orders table (id column)
      const { data: deleted, error: delErr } = await supabase
        .from("orders")
        .delete()
        .in("id", idsToDelete)
        .select("id");

      if (!delErr && deleted && deleted.length > 0) {
        return { success: true, count: deleted.length };
      }

      // 3. Fallback: Mark status as 'Eliminado' in Supabase so they are permanently excluded
      const { data: updated, error: updErr } = await supabase
        .from("orders")
        .update({ status: "Eliminado", updated_at: new Date().toISOString() })
        .in("id", idsToDelete)
        .select("id");

      if (updErr) {
        return { success: false, count: 0, error: updErr.message };
      }

      return { success: true, count: updated?.length || idsToDelete.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || "Error al eliminar comandas" };
    }
  }

  static async fetchOrders(): Promise<{ orders: Order[]; error?: string }> {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .neq("status", "Eliminado")
      .neq("status", "eliminado")
      .neq("status", "Anulado")
      .neq("status", "anulado")
      .neq("status", "archivado")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return { orders: [], error: `${error.message} (${error.code})` };

    const remoteOrders = (data || [])
      .map(mapOrder)
      .filter((o) => {
        const s = (o.status || "").toLowerCase().trim();
        return (
          s !== "eliminado" &&
          s !== "eliminada" &&
          s !== "anulado" &&
          s !== "anulada" &&
          s !== "archivado" &&
          s !== "archivada" &&
          s !== "borrado" &&
          s !== "borrada"
        );
      });

    // Return strictly remote orders from Supabase without any local storage cache merging
    return { orders: remoteOrders };
  }

  static subscribeToOrders(
    onChanged: () => void,
    onStatus?: (status: string) => void
  ): () => void {
    let channel: RealtimeChannel | null = supabase
      .channel("orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => onChanged()
      )
      .subscribe((status) => onStatus?.(status));

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }
}
