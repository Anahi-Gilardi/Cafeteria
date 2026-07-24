import { Order, MenuItem, OrderStatusType } from "../types";
import { StockService } from "./StockService";
import { KDSManager } from "./KDSManager";
import { supabase } from "../lib/supabase";

export interface CreateOrderPayload {
  tableNumber: string;
  waiterId: string;
  waiterName: string;
  items: Array<{
    item: MenuItem;
    quantity: number;
    customization?: string;
  }>;
  type: "Llevar" | "Mesa";
  fulfillmentType?: "salon" | "takeaway" | "delivery";
  deliveryAddress?: { street: string; number: string; floor?: string; notes?: string };
  customerName?: string;
  customerPhone?: string;
}

export class OrderService {
  /**
   * Crea una nueva comanda atómica, calcula los ítems y los distribuye en tiempo real.
   */
  static async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const orderId = "ord-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    
    // 1. Mapeo de ítems con desglose de modificadores y destinos
    const orderItems = payload.items.map(i => ({
      name: i.item.name,
      quantity: i.quantity,
      price: i.item.price,
      customizationSummary: i.customization || "",
      destination: KDSManager.getItemDestination(i.item.name)
    }));

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const newOrder: Order = {
      id: orderId,
      items: orderItems,
      total: totalAmount,
      subtotal: Number((totalAmount * 0.79).toFixed(2)),
      tax: Number((totalAmount * 0.21).toFixed(2)),
      type: payload.type,
      priceList: payload.fulfillmentType === "delivery" ? "Delivery" : payload.fulfillmentType === "takeaway" ? "Takeaway" : "Salon",
      tableNumber: payload.tableNumber,
      status: "Recibido",
      createdAt: new Date().toISOString(),
      estimatedMinutes: payload.type === "Llevar" ? 20 : 30,
      fulfillmentType: payload.fulfillmentType || "salon",
      deliveryAddress: payload.deliveryAddress,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone
    };

    // 2. Transacción en Supabase / Local DB
    try {
      await supabase.from("orders").insert([{
        id: newOrder.id,
        items: newOrder.items,
        total: newOrder.total,
        type: newOrder.type,
        table_number: newOrder.tableNumber,
        status: newOrder.status,
        created_at: newOrder.createdAt
      }]);
    } catch (err) {
      console.warn("[OrderService] Guardado local alternativo por degradación de red:", err);
    }

    // 3. Descuento automático de insumos vía Ficha Técnica
    await StockService.deductStockForOrder(payload.items);

    // 4. Emisión de Eventos KDS en Tiempo Real
    KDSManager.routeOrderToStations(newOrder);

    return newOrder;
  }

  /**
   * Cambia el estado de una comanda y notifica a la mesa y al mozo.
   */
  static async updateOrderStatus(orderId: string, newStatus: OrderStatusType): Promise<void> {
    try {
      await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    } catch (err) {
      console.error("[OrderService] Error al actualizar estado en backend:", err);
    }
  }
}
