export interface OrderNotificationData {
  id: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  total: number;
  type: "Mesa" | "Llevar" | "Takeaway" | "Delivery";
}

export class WhatsAppNotificationService {
  public static sendReadyForPickupNotification(order: OrderNotificationData): string {
    const name = order.customerName || "Cliente";
    const orderNum = order.id.slice(-6).toUpperCase();
    const message = `✨ ¡Hola ${name}! Tu pedido #${orderNum} en *RESTO BAR DEL TEATRO* ya está preparado. Puedes pasar a retirarlo por nuestro local en Constitución 944. ¡Te esperamos! 🎭`;

    if (order.customerPhone) {
      const cleanPhone = order.customerPhone.replace(/\D/g, "");
      const phoneWithCountry = cleanPhone.startsWith("549") ? cleanPhone : `549${cleanPhone}`;
      const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    }
    return message;
  }

  public static sendDeliveryEnCaminoNotification(order: OrderNotificationData): string {
    const name = order.customerName || "Cliente";
    const orderNum = order.id.slice(-6).toUpperCase();
    const address = order.deliveryAddress || "tu domicilio";
    const total = order.total.toLocaleString("es-AR");

    const message = `🛵 ¡Hola ${name}! Tu pedido #${orderNum} ya salió con nuestro cadete hacia ${address}. En minutos estará en tu puerta. Total a pagar: $${total}.`;

    if (order.customerPhone) {
      const cleanPhone = order.customerPhone.replace(/\D/g, "");
      const phoneWithCountry = cleanPhone.startsWith("549") ? cleanPhone : `549${cleanPhone}`;
      const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    }
    return message;
  }
}
