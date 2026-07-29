import { ARCAPayload, Invoice, Order } from "../types";

export class BillingAdapter {
  /**
   * Builds the official ARCA (Ex-AFIP) payload structure for electronic invoicing.
   */
  public static buildARCAPayload(
    order: Order,
    voucherType: "Factura A" | "Factura B" | "Factura C" | "Ticket Consumidor Final",
    cuitDni: string
  ): ARCAPayload {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, ""); // AAAAMMDD

    let cbteTipo = 6; // Factura B
    let docTipo = 99; // Consumidor Final
    let docNro = 0;

    const cleanDoc = cuitDni.replace(/\D/g, "");

    if (voucherType === "Factura A") {
      cbteTipo = 1;
      docTipo = 80; // CUIT
      docNro = parseInt(cleanDoc) || 20111111112;
    } else if (voucherType === "Factura B") {
      cbteTipo = 6;
      docTipo = cleanDoc.length === 11 ? 80 : 96; // CUIT or DNI
      docNro = parseInt(cleanDoc) || 0;
    } else if (voucherType === "Factura C") {
      cbteTipo = 11;
      docTipo = cleanDoc.length === 11 ? 80 : (cleanDoc.length === 8 ? 96 : 99);
      docNro = parseInt(cleanDoc) || 0;
    }

    const total = order.total;
    const neto = parseFloat((total / 1.21).toFixed(2));
    const iva = parseFloat((total - neto).toFixed(2));

    return {
      ptoVta: 1,
      cbteTipo,
      docTipo,
      docNro,
      cbteFch: dateStr,
      impTotal: total,
      impTotConc: 0,
      impNeto: neto,
      impOpEx: 0,
      impIVA: iva,
      impTrib: 0,
      monId: "PES",
      monCotiz: 1
    };
  }

  /**
   * Triggers a clean 80mm / 58mm thermal ticket print window for Kitchen, Bar, or Checkout.
   */
  public static printThermalTicket(order: Order, station: "Cocina" | "Barra" | "Caja" | "Cliente", invoice?: Invoice): void {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const itemsFiltered = station === "Cocina" 
      ? order.items.filter(i => !i.name.toLowerCase().includes("bebida") && !i.name.toLowerCase().includes("jugo") && !i.name.toLowerCase().includes("café"))
      : station === "Barra"
      ? order.items.filter(i => i.name.toLowerCase().includes("bebida") || i.name.toLowerCase().includes("jugo") || i.name.toLowerCase().includes("café"))
      : order.items;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket ${station} - Resto Bar Del Teatro</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 78mm; padding: 4mm; margin: 0; font-size: 12px; color: #000; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 8px; }
          .title { font-size: 14px; font-weight: bold; }
          .subtitle { font-size: 10px; }
          .table-info { font-weight: bold; margin: 6px 0; border-bottom: 1px solid #000; padding-bottom: 4px; }
          .item-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .item-qty { font-weight: bold; }
          .total-row { border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; font-size: 14px; font-weight: bold; text-align: right; }
          .footer { text-align: center; margin-top: 12px; font-size: 10px; border-top: 1px dashed #000; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">RESTO BAR DEL TEATRO</div>
          <div class="subtitle">CONSTITUCIÓN 944 - RÍO CUARTO</div>
          <div class="subtitle">ESTACIÓN: ${station.toUpperCase()}</div>
        </div>
        <div class="table-info">
          MESA: ${order.tableNumber || "MOSTRADOR"} | TICKET #${order.id.slice(-6)}<br>
          FECHA: ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}<br>
          ATENCIÓN: Salón Principal
        </div>
        <div>
          ${itemsFiltered.map(i => `
            <div class="item-row">
              <span class="item-qty">${i.quantity}x ${i.name}</span>
              <span>$${(i.price * i.quantity).toLocaleString("es-AR")}</span>
            </div>
            ${i.customizationSummary ? `<div style="font-size:10px; font-style:italic; padding-left:10px;">• ${i.customizationSummary}</div>` : ""}
          `).join("")}
        </div>
        <div class="total-row">
          TOTAL: $${order.total.toLocaleString("es-AR")} ARS
        </div>
        ${invoice ? `
          <div style="margin-top:8px; font-size:10px; text-align:center;">
            COMPROBANTE: ${invoice.voucherType} ${invoice.nroComprobante}<br>
            CAE: ${invoice.cae} (VTO: ${invoice.caeExpiration})<br>
            CUIT/DNI: ${invoice.cuitDni} - ${invoice.clientName}
          </div>
        ` : ""}
        <div class="footer">
          ¡Gracias por su visita!<br>
          www.restobardelteatro.com
        </div>
        <script>
          window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Generates WhatsApp message link with fiscal ticket summary.
   */
  public static generateWhatsAppInvoiceLink(order: Order, invoice: Invoice, phone: string): string {
    const cleanPhone = phone.replace(/\D/g, "");
    const targetPhone = cleanPhone.startsWith("54") ? cleanPhone : "54" + cleanPhone;
    const message = `🧾 *COMPROBANTE FISCAL ARCA - RESTO BAR DEL TEATRO*\n📍 Constitución 944, Río Cuarto\n\n` +
      `*Comprobante:* ${invoice.voucherType} N° ${invoice.nroComprobante}\n` +
      `*Cliente:* ${invoice.clientName} (CUIT/DNI: ${invoice.cuitDni})\n` +
      `*Mesa:* ${order.tableNumber || "Mostrador"}\n` +
      `*Monto Total:* $${order.total.toLocaleString("es-AR")} ARS\n` +
      `*CAE:* ${invoice.cae} (Vto: ${invoice.caeExpiration})\n\n` +
      `*Detalle del Consumo:*\n` +
      order.items.map(i => `• ${i.quantity}x ${i.name} - $${(i.price * i.quantity).toLocaleString("es-AR")}`).join("\n") +
      `\n\n🔗 *Verificar QR Fiscal ARCA:* ${invoice.qrCodeUrl}`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  }
}
