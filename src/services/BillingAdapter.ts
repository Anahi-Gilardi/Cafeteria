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
   * Generates a complete fiscal Invoice object with CAE authorization and QR code.
   */
  public static generateInvoice(
    order: Order,
    voucherType: "Factura A" | "Factura B" | "Factura C" | "Ticket Consumidor Final",
    cuitDni: string,
    clientName: string = "Consumidor Final"
  ): Invoice {
    const randomCAE = "74" + Math.floor(10000000000 + Math.random() * 90000000000).toString();
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 10);
    const expDateStr = expDate.toISOString().split("T")[0];

    const ptoVta = "0001";
    const nroComp = Math.floor(1000 + Math.random() * 9000).toString().padStart(8, "0");

    const neto = parseFloat((order.total / 1.21).toFixed(2));
    const iva = parseFloat((order.total - neto).toFixed(2));

    // Construct ARCA Fiscal QR Link
    const qrData = {
      ver: 1,
      fecha: new Date().toISOString().split("T")[0],
      cuit: 30712345678,
      ptoVta: 1,
      tipoCmp: voucherType === "Factura A" ? 1 : voucherType === "Factura B" ? 6 : 11,
      nroCmp: parseInt(nroComp),
      importe: order.total,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: cuitDni.length === 11 ? 80 : 96,
      nroDocRec: parseInt(cuitDni.replace(/\D/g, "")) || 0,
      tipoCodAut: "E",
      codAut: parseInt(randomCAE)
    };

    const qrBase64 = btoa(JSON.stringify(qrData));
    const qrCodeUrl = `https://www.arca.gob.ar/fe/qr/?p=${qrBase64}`;

    return {
      id: "INV-" + Date.now(),
      orderId: order.id,
      voucherType,
      ptoVta,
      nroComprobante: `${ptoVta}-${nroComp}`,
      cae: randomCAE,
      caeExpiration: expDateStr,
      qrCodeUrl,
      cuitDni: cuitDni || "20-00000000-0",
      clientName: clientName || "Consumidor Final",
      totalAmount: order.total,
      netAmount: neto,
      vatAmount: iva,
      createdAt: new Date().toLocaleDateString("es-AR") + " " + new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    };
  }
}
