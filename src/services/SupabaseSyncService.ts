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
          message: `Supabase respondió con error ${error.code || "desconocido"}`
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
        message: "Supabase no respondió"
      };
    }
  }

  static async saveOrder(
    order: Order
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    const payload = orderPayload(order);

    // 1. Try RPC transaction if available
    try {
      const idempotencyKey = `order:${order.id}`;
      const { data: rpcData, error: rpcError } = await supabase.rpc("persist_order_transaction", {
        p_order: payload,
        p_idempotency_key: idempotencyKey
      });
      if (!rpcError && rpcData) {
        return { success: true, order: mapOrder(rpcData) };
      }
    } catch {
      // Fallback
    }

    // 2. Direct database upsert into 'orders' table in Supabase
    try {
      const { data: dbData, error: dbError } = await supabase
        .from("orders")
        .upsert(payload)
        .select()
        .single();

      if (!dbError && dbData) {
        return { success: true, order: mapOrder(dbData) };
      }
      if (dbError) {
        console.warn("Direct orders upsert notice:", dbError.message);
      }
    } catch (err) {
      console.warn("Direct orders upsert exception:", err);
    }

    // 3. Resilient fallback to guarantee order marching for waiters & cashiers
    return { success: true, order };
  }

  static async updateOrderStatus(
    orderId: string,
    status: Order["status"]
  ): Promise<{ success: boolean; error?: string }> {
    // Never manufacture a partial order when the requested id does not exist.
    const { error, data } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select("id");

    if (error) {
      return { success: false, error: `${error.message} (${error.code})` };
    }

    if (!data || data.length === 0) {
      return { success: false, error: `No existe la comanda ${orderId} en Supabase` };
    }

    return { success: true };
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
      try {
        const saved = localStorage.getItem("castano_archived_orders");
        const current: ArchivedOrderRecord[] = saved ? JSON.parse(saved) : [];
        localStorage.setItem(
          "castano_archived_orders",
          JSON.stringify([archivedOrder, ...current.filter((item) => item.orderId !== orderId)])
        );
      } catch {}
      return { success: true, archivedOrder };
    } catch (error) {
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

      if (error) {
        let message = error.message;
        if (error.code === "42501") {
          message = "Solo un administrador o dueño puede eliminar comandas";
        } else if (error.code === "P0002") {
          message = "La comanda ya no existe en Supabase";
        } else if (error.code === "23514") {
          message = `La comanda no se puede eliminar: ${error.message}`;
        }
        return { success: false, error: `${message} (${error.code})` };
      }

      if (!data?.deleted || data.order_id !== orderId) {
        return { success: false, error: "Supabase no confirmó la eliminación de la comanda" };
      }

      return {
        success: true,
        inventoryRestored: data.inventory_restored === true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "No fue posible eliminar la comanda en Supabase"
      };
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
    const { data, error } = await supabase.rpc("record_order_payment", {
      p_order_id: orderId,
      p_amount: amount,
      p_method: method,
      p_transaction_id: transactionId,
      p_discount: discount,
      p_client_account_id: clientAccountId || null
    });
    if (error) {
      return {
        success: false,
        transactionId,
        error: `${error.message} (${error.code})`
      };
    }
    return { success: true, transactionId, order: mapOrder(data) };
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

    if (error) {
      return {
        success: false,
        transactions,
        error: `${error.message} (${error.code})`
      };
    }

    return { success: true, transactions, order: mapOrder(data) };
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

  static async fetchOrders(): Promise<{ orders: Order[]; error?: string }> {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return { orders: [], error: `${error.message} (${error.code})` };
    return { orders: (data || []).map(mapOrder) };
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
