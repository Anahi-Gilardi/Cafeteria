import { Order } from "../types";

export interface WhatsAppMessagePayload {
  to: string; // Recipient WhatsApp phone number (e.g., 543585042311)
  body: string; // Formatted text message with Markdown emojis
  orderId: string;
  type: "ORDER_CONFIRMATION" | "ORDER_READY" | "STOCK_WARNING";
  timestamp: string;
}

class WhatsAppAdapter {
  private static instance: WhatsAppAdapter;
  private messageQueue: WhatsAppMessagePayload[] = [];
  private isProcessingQueue = false;
  private restaurantPhone = "543585042311"; // Resto Bar Del Teatro WhatsApp

  private constructor() {
    // Start background queue listener
    setInterval(() => this.processQueue(), 5000);
  }

  public static getInstance(): WhatsAppAdapter {
    if (!WhatsAppAdapter.instance) {
      WhatsAppAdapter.instance = new WhatsAppAdapter();
    }
    return WhatsAppAdapter.instance;
  }

  /**
   * Format Paso A: Order Entry Confirmation Message
   */
  public formatOrderConfirmation(order: Order): string {
    const clientName = order.customerName || "Cliente";
    const sourceLabel = order.fulfillmentType === "delivery" 
      ? "Delivery a domicilio 🛵" 
      : order.fulfillmentType === "takeaway" || order.type === "Llevar"
      ? "Retiro por local (Take Away) 🛍️"
      : `Mesa ${order.tableNumber || "Salón"} 🍽️`;

    const itemsList = order.items
      .map(it => `• *${it.quantity}x* ${it.name} ${it.customizationSummary ? `(_${it.customizationSummary}_)` : ""}`)
      .join("\n");

    return `🎭 *RESTO BAR DEL TEATRO* 🎭
Constitución 944, Río Cuarto

¡Hola *${clientName}*! Tu pedido *#${order.id}* ha sido ingresado correctamente.

📋 *Detalle del Pedido:*
${itemsList}

📍 *Modalidad:* ${sourceLabel}
💰 *Total:* $${order.total.toLocaleString("es-AR")}
👨‍🍳 *Estado:* En preparación por nuestro equipo.

_¡Gracias por elegir Resto Bar Del Teatro!_`;
  }

  /**
   * Format Paso B: Order Ready Notification Message
   */
  public formatOrderReady(order: Order): string {
    const clientName = order.customerName || "Cliente";
    const pickupInstructions = order.fulfillmentType === "delivery"
      ? "El repartidor ya está en camino a tu domicilio. 🛵"
      : order.fulfillmentType === "takeaway" || order.type === "Llevar"
      ? "Puedes acercarte a la barra a retirarlo. 🛍️"
      : `Te lo llevamos a la *Mesa ${order.tableNumber || "Salón"}* inmediatamente. 🍽️`;

    return `✨ *¡TU PEDIDO ESTÁ LISTO!* ✨

¡Hola *${clientName}*! Tu pedido *#${order.id}* en *RESTO BAR DEL TEATRO* ya está 100% preparado.

${pickupInstructions}

🎭 _¡Que lo disfrutes!_`;
  }

  /**
   * Enqueue a message so the application can prepare a wa.me handoff.
   * Automatic delivery requires a server-side WhatsApp provider.
   */
  public enqueueMessage(payload: WhatsAppMessagePayload): void {
    console.log(`[WhatsAppAdapter] Enqueuing ${payload.type} for ${payload.to}`);
    this.messageQueue.push(payload);
    this.processQueue();
  }

  /**
   * Process pending link-generation work without claiming external delivery.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (!msg) break;

      try {
        await this.dispatchMessage(msg);
      } catch (err) {
        console.error(`[WhatsAppAdapter] Failed to dispatch message ${msg.orderId}:`, err);
        // Re-enqueue if transient error (max 3 retries simulated)
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Prepare a direct wa.me URL. This does not send the message automatically.
   */
  private async dispatchMessage(msg: WhatsAppMessagePayload): Promise<void> {
    console.log(`[WhatsAppAdapter] Preparing ${msg.type} handoff for ${msg.to}...`);

    const cleanPhone = msg.to.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("54") ? cleanPhone : "54" + cleanPhone;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg.body)}`;

    if (typeof window !== "undefined") {
      (window as any).__lastWhatsAppUrl = waUrl;
    }

    console.log(`[WhatsAppAdapter] WhatsApp handoff prepared for order ${msg.orderId}.`);
  }

  /**
   * Helper to open WhatsApp web directly with pre-filled message
   */
  public openWhatsAppWeb(phone: string, text: string): void {
    const cleanPhone = phone.replace(/\D/g, "");
    const targetPhone = cleanPhone.startsWith("54") ? cleanPhone : "54" + cleanPhone;
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  }
}

export default WhatsAppAdapter.getInstance();
