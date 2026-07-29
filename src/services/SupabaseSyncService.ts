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
  return {
    id: order.id,
    created_at: order.createdAt || new Date().toISOString(),
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
    waiter_name: order.tableNumber ? "Personal de salón" : null,
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
    const idempotencyKey = `order:${order.id}`;
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      const { data, error } = await supabase.functions.invoke("create-public-order", {
        body: {
          idempotencyKey,
          orderType: payload.order_type,
          tableNumber: payload.table_number,
          customerName: payload.client_name,
          customerPhone: payload.client_phone,
          clientAddress: payload.client_address,
          tipAmount: payload.tip_amount,
          items: payload.items
        }
      });
      if (error || !data?.order) {
        return {
          success: false,
          error: error?.message || data?.error || "No se pudo guardar el pedido público."
        };
      }
      return { success: true, order: mapOrder(data.order) };
    }

    const { data, error } = await supabase.rpc("save_order_transaction", {
      p_order: payload,
      p_idempotency_key: idempotencyKey
    });
    if (error) {
      return { success: false, error: `${error.message} (${error.code})` };
    }
    return { success: true, order: mapOrder(data) };
  }

  static async updateOrderStatus(
    orderId: string,
    status: Order["status"]
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    return error
      ? { success: false, error: `${error.message} (${error.code})` }
      : { success: true };
  }

  static async archiveOrder(
    orderId: string
  ): Promise<{ success: boolean; archivedOrder?: ArchivedOrderRecord; error?: string }> {
    const { data, error } = await supabase.rpc("archive_order", {
      p_order_id: orderId
    });
    if (error || !data) {
      return {
        success: false,
        error: error ? `${error.message} (${error.code})` : "Supabase no devolvió la comanda archivada."
      };
    }
    return {
      success: true,
      archivedOrder: {
        orderId: data.order_id,
        archivedAt: data.archived_at,
        archivedBy: data.archived_by || undefined,
        archiveReason: data.archive_reason,
        order: mapOrder(data.order_snapshot)
      }
    };
  }

  static async fetchArchivedOrders(): Promise<{
    archivedOrders: ArchivedOrderRecord[];
    error?: string;
  }> {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) return { archivedOrders: [] };

    const { data, error } = await supabase
      .from("archived_orders")
      .select("order_id,archived_at,archived_by,archive_reason,order_snapshot")
      .order("archived_at", { ascending: false })
      .limit(1000);
    if (error) {
      return { archivedOrders: [], error: `${error.message} (${error.code})` };
    }

    return {
      archivedOrders: (data || []).map((row) => ({
        orderId: row.order_id,
        archivedAt: row.archived_at,
        archivedBy: row.archived_by || undefined,
        archiveReason: row.archive_reason,
        order: mapOrder(row.order_snapshot)
      }))
    };
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
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) return { orders: [] };

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
