export interface DeliveryZone {
  id: string;
  name: string;
  fee: number; // in $ ARS
  estimatedMinutes: number;
}

export const RIO_CUARTO_ZONES: DeliveryZone[] = [
  { id: "centro", name: "Centro / Microcentro (Frente al Teatro)", fee: 800, estimatedMinutes: 20 },
  { id: "banda_norte", name: "Banda Norte", fee: 1200, estimatedMinutes: 30 },
  { id: "alberdi", name: "Barrio Alberdi", fee: 1200, estimatedMinutes: 30 },
  { id: "villa_dalcar", name: "Villa Dalcar / San Eduardo", fee: 1500, estimatedMinutes: 35 },
  { id: "golf", name: "Golf / Bimaco / Universidad", fee: 1800, estimatedMinutes: 40 }
];

export class DeliveryZoneService {
  /**
   * Generates a Google Maps route link to the destination address in Río Cuarto.
   */
  public static getGoogleMapsLink(street: string, number: string): string {
    const addressQuery = `${street} ${number}, Río Cuarto, Córdoba, Argentina`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`;
  }

  /**
   * Generates a WhatsApp dispatch message link for the delivery driver.
   */
  public static generateDriverWhatsAppLink(
    orderId: string,
    customerName: string,
    customerPhone: string,
    street: string,
    number: string,
    notes: string = "",
    driverPhone: string = "543585042311"
  ): string {
    const mapsLink = this.getGoogleMapsLink(street, number);
    const cleanPhone = driverPhone.replace(/\D/g, "");
    const targetPhone = cleanPhone.startsWith("54") ? cleanPhone : "54" + cleanPhone;

    const message = `🛵 *NUEVO DESPACHO DE DELIVERY - RESTO BAR DEL TEATRO*\n\n` +
      `📦 *Pedido #:* ${orderId.slice(-6).toUpperCase()}\n` +
      `👤 *Cliente:* ${customerName} (${customerPhone})\n` +
      `📍 *Dirección:* ${street} ${number}, Río Cuarto\n` +
      `${notes ? `📝 *Instrucciones:* ${notes}\n` : ""}\n` +
      `🗺️ *Navegar con Google Maps:* ${mapsLink}`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  }
}
