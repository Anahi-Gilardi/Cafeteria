import { Order } from "../types";
import WhatsAppAdapter from "./WhatsAppAdapter";
import { SupabaseSyncService } from "./SupabaseSyncService";

export interface CreatePublicOrderDTO {
  customerName: string;
  customerPhone: string;
  fulfillmentType: "salon" | "takeaway" | "delivery";
  tableNumber?: string;
  deliveryAddress?: { street: string; number: string; floor?: string; notes?: string };
  items: {
    itemId: string;
    name: string;
    quantity: number;
    customizationSummary: string;
    price: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
}

class WhatsAppOrderService {
  private static instance: WhatsAppOrderService;
  private ordersStore: Order[] = [];

  private constructor() {}

  public static getInstance(): WhatsAppOrderService {
    if (!WhatsAppOrderService.instance) {
      WhatsAppOrderService.instance = new WhatsAppOrderService();
    }
    return WhatsAppOrderService.instance;
  }

  /**
   * Step A: Process public digital order, inject into system, & send WhatsApp confirmation
   */
  public async createPublicOrder(dto: CreatePublicOrderDTO): Promise<Order> {
    const orderId = `PED-${crypto.randomUUID()}`;
    const newOrder: Order = {
      id: orderId,
      items: dto.items,
      subtotal: dto.subtotal,
      tax: dto.tax,
      total: dto.total,
      type: dto.fulfillmentType === "takeaway" ? "Llevar" : "Mesa",
      priceList: dto.fulfillmentType === "takeaway" ? "Takeaway" : dto.fulfillmentType === "delivery" ? "Delivery" : "Salon",
      fulfillmentType: dto.fulfillmentType,
      tableNumber: dto.tableNumber,
      deliveryAddress: dto.deliveryAddress,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      clientPhone: dto.customerPhone,
      status: "Recibido",
      createdAt: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      estimatedMinutes: dto.fulfillmentType === "delivery" ? 35 : 15,
      source: dto.fulfillmentType === "salon" ? "qr_mesa" : "public_menu"
    };

    const persisted = await SupabaseSyncService.saveOrder(newOrder);
    if (!persisted.success || !persisted.order) {
      throw new Error(persisted.error || "No se pudo registrar el pedido en Supabase.");
    }
    const persistedOrder = persisted.order;

    // Keep a local view only after the server has accepted and priced the order.
    this.ordersStore.unshift(persistedOrder);

    // 1. Format and Enqueue WhatsApp Confirmation (Step A) to Customer
    if (dto.customerPhone) {
      const customerMsg = WhatsAppAdapter.formatOrderConfirmation(persistedOrder);
      WhatsAppAdapter.enqueueMessage({
        to: dto.customerPhone,
        body: customerMsg,
        orderId: persistedOrder.id,
        type: "ORDER_CONFIRMATION",
        timestamp: new Date().toISOString()
      });
    }

    // 2. Enqueue WhatsApp Notification to Restaurant Counter
    const restaurantMsg = `🔔 *NUEVO PEDIDO INGRESADO DESDE MENÚ DIGITAL* 🔔
Pedido #${persistedOrder.id} - ${dto.customerName} (${dto.customerPhone})
Modalidad: ${dto.fulfillmentType.toUpperCase()} ${dto.tableNumber ? `(Mesa ${dto.tableNumber})` : ""}
Total: $${persistedOrder.total.toLocaleString("es-AR")}`;

    WhatsAppAdapter.enqueueMessage({
      to: "543585042311", // Resto Bar Del Teatro main WhatsApp
      body: restaurantMsg,
      orderId: persistedOrder.id,
      type: "ORDER_CONFIRMATION",
      timestamp: new Date().toISOString()
    });

    console.log(`[WhatsAppOrderService] Order #${persistedOrder.id} persisted and queued for notification.`);
    return persistedOrder;
  }

  /**
   * Step B: Triggered when KDS marks order or item as "Listo"
   */
  public async notifyOrderReady(order: Order): Promise<void> {
    console.log(`[WhatsAppOrderService] Order #${order.id} marked as LISTO! Triggering WhatsApp notification...`);

    const phone = order.clientPhone || order.customerPhone;
    if (!phone) {
      console.warn(`[WhatsAppOrderService] No customer phone found for Order #${order.id}. Skipping WhatsApp.`);
      return;
    }

    const readyMsg = WhatsAppAdapter.formatOrderReady(order);
    WhatsAppAdapter.enqueueMessage({
      to: phone,
      body: readyMsg,
      orderId: order.id,
      type: "ORDER_READY",
      timestamp: new Date().toISOString()
    });

    // Also offer direct wa.me trigger helper
    WhatsAppAdapter.openWhatsAppWeb(phone, readyMsg);
  }
}

export default WhatsAppOrderService.getInstance();
