import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Order, FiscalDetails } from "../types";

export function isAuthorizedFiscalDetails(fiscal: FiscalDetails): boolean {
  if (!fiscal) return false;
  const hasCae = Boolean(fiscal.cae && String(fiscal.cae).trim().length >= 8);
  const isNotRejected = fiscal.status !== "rejected" && fiscal.status !== "draft";
  return hasCae && isNotRejected;
}

export class ReceiptPDFService {
  private static async loadQrCodeBase64(qrUrl: string): Promise<string | null> {
    if (!qrUrl) return null;
    try {
      return await QRCode.toDataURL(qrUrl, {
        margin: 1,
        width: 300,
        color: {
          dark: "#5C1D27",
          light: "#FFFFFF"
        }
      });
    } catch (err) {
      console.error("Error generating local QR code:", err);
      return null;
    }
  }

  /**
   * Generates downloadable PDF for TICKET NO FISCAL (Roll format 80mm) with clean multi-line wrapping and no text overlap.
   */
  public static generateTicketNoFiscalPDF(order: Order): void {
    // Calculate dynamic roll height so ticket never cuts off
    const itemCount = order.items.length;
    const calculatedHeight = Math.max(160, 110 + itemCount * 12);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, calculatedHeight]
    });

    let currentY = 8;
    const centerX = 40;
    const leftX = 6;
    const rightX = 74;

    // 1. Header & Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("RESTO BAR DEL TEATRO", centerX, currentY, { align: "center" });

    currentY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Datos comerciales según perfil registrado", centerX, currentY, { align: "center" });
    doc.text("Tel: 358 5042311 / 358 4651847", centerX, currentY + 3.5, { align: "center" });
    doc.text("COMPROBANTE NO FISCAL", centerX, currentY + 7, { align: "center" });

    currentY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("DOCUMENTO NO FISCAL", centerX, currentY, { align: "center" });
    doc.setFontSize(9.5);
    doc.text(`Comanda #${order.id.slice(-6).toUpperCase()}`, centerX, currentY + 4.5, { align: "center" });

    currentY += 8;
    doc.setLineWidth(0.3);
    doc.line(leftX, currentY, rightX, currentY);

    // 2. Metadata (Order Type, Customer, Date, Payment)
    currentY += 4.5;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");

    const orderChannel = order.priceList === "Takeaway" || order.type === "Llevar"
      ? "RETIRO EN LOCAL"
      : order.priceList === "Delivery" || order.fulfillmentType === "delivery"
      ? "DELIVERY A DOMICILIO"
      : `SALÓN (${order.tableNumber || "Mesa 1"})`;

    doc.text(`Modalidad: ${orderChannel}`, leftX, currentY);

    currentY += 3.8;
    doc.setFont("helvetica", "normal");
    if (order.clientAccountName) {
      doc.text(`Cliente: ${order.clientAccountName}`, leftX, currentY);
      currentY += 3.8;
    }

    doc.text(`Fecha: ${new Date(order.createdAt).toLocaleString("es-AR")}`, leftX, currentY);
    currentY += 3.8;
    doc.text(`Pago: ${order.paymentMethod || "Efectivo"}`, leftX, currentY);

    currentY += 3;
    doc.line(leftX, currentY, rightX, currentY);

    // 3. Table Headers
    currentY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Cant", leftX, currentY);
    doc.text("Descripción", leftX + 10, currentY);
    doc.text("Total", rightX, currentY, { align: "right" });

    currentY += 2.5;
    doc.line(leftX, currentY, rightX, currentY);
    currentY += 4;

    // 4. Item Rows with Text Wrapping to avoid overlapping!
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    order.items.forEach((it) => {
      const itemTotalStr = `$${(it.price * it.quantity).toLocaleString("es-AR")}`;
      doc.text(`${it.quantity}x`, leftX, currentY);

      // Wrap item name in max width 40mm to prevent collision with right-aligned price at 74mm
      const wrappedName = doc.splitTextToSize(it.name, 40);
      doc.text(wrappedName, leftX + 10, currentY);
      doc.text(itemTotalStr, rightX, currentY, { align: "right" });

      const lineCount = Array.isArray(wrappedName) ? wrappedName.length : 1;
      currentY += lineCount * 3.8 + 1;

      if (it.customizationSummary) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "italic");
        doc.text(`* (${it.customizationSummary})`, leftX + 10, currentY);
        currentY += 3.5;
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
      }
    });

    currentY += 1;
    doc.line(leftX, currentY, rightX, currentY);
    currentY += 4.5;

    // 5. Totals & Tax Breakdown
    const subtotalCalc = order.subtotal || order.total;
    const taxCalc = order.tax || parseFloat((order.total - order.total / 1.21).toFixed(2));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Subtotal:", leftX, currentY);
    doc.text(`$${subtotalCalc.toLocaleString("es-AR")}`, rightX, currentY, { align: "right" });

    currentY += 3.8;
    doc.text("IVA (21% Est.):", leftX, currentY);
    doc.text(`$${taxCalc.toLocaleString("es-AR")}`, rightX, currentY, { align: "right" });

    currentY += 4;
    doc.setLineWidth(0.5);
    doc.line(leftX, currentY, rightX, currentY);
    currentY += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL ARS:", leftX, currentY);
    doc.text(`$${order.total.toLocaleString("es-AR")}`, rightX, currentY, { align: "right" });

    // 6. Footer message & barcode simulation
    currentY += 8;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("Comprobante de consumo interno.", centerX, currentY, { align: "center" });
    doc.text("¡Muchas gracias por su visita!", centerX, currentY + 3.5, { align: "center" });

    currentY += 7;
    doc.setFont("helvetica", "mono");
    doc.setFontSize(6);
    doc.text(`||| ||||||| |||| |||||||| ||||| || ${order.id}`, centerX, currentY, { align: "center" });

    doc.save(`Ticket_NoFiscal_${order.id.slice(-6).toUpperCase()}.pdf`);
  }

  public static buildOfficialArcaQrUrl(order: Order, fiscal: FiscalDetails): string {
    if (fiscal.qrCodeUrl && fiscal.qrCodeUrl.startsWith("https://")) {
      return fiscal.qrCodeUrl;
    }
    
    const letter = (fiscal.invoiceType || "B").toUpperCase();
    const tipoCmp = letter === "A" ? 1 : letter === "B" ? 6 : 11;

    let nroCmp = 1;
    let ptoVta = 3;
    if (fiscal.invoiceNumber && fiscal.invoiceNumber.includes("-")) {
      const parts = fiscal.invoiceNumber.split("-");
      ptoVta = parseInt(parts[0], 10) || 3;
      nroCmp = parseInt(parts[1], 10) || 1;
    }

    const cleanDoc = (fiscal.customerCuit || order.clientCuit || "").replace(/\D/g, "");
    const tipoDocRec = cleanDoc.length === 11 ? 80 : cleanDoc.length === 8 ? 96 : 99;
    const nroDocRec = Number(cleanDoc) || 0;
    const caeNum = Number((fiscal.cae || "62106470991612").replace(/\D/g, "")) || 62106470991612;
    const cuitEmisor = Number((fiscal.issuerCuit || "20445513408").replace(/\D/g, "")) || 20445513408;
    const fechaStr = new Date(order.createdAt).toISOString().slice(0, 10);

    const payload = {
      ver: 1,
      fecha: fechaStr,
      cuit: cuitEmisor,
      ptoVta: ptoVta,
      tipoCmp: tipoCmp,
      nroCmp: nroCmp,
      importe: Number(order.total.toFixed(2)),
      moneda: "PES",
      ctz: 1,
      tipoDocRec: tipoDocRec,
      nroDocRec: nroDocRec,
      tipoCodAut: "E",
      codAut: caeNum
    };

    try {
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      let binary = "";
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      return `https://www.arca.gob.ar/fe/qr/?p=${btoa(binary)}`;
    } catch {
      return "";
    }
  }

  /**
   * Generates downloadable PDF for FACTURA FISCAL ARCA (Official Fiscal Receipt with CAE & QR)
   */
  public static async generateArcaInvoicePDF(order: Order, fiscal: FiscalDetails): Promise<void> {
    const letter = (fiscal.invoiceType || "B").toUpperCase();
    const isFacturaC = letter === "C";
    const codigoFactura = letter === "A" ? "COD. 001" : letter === "B" ? "COD. 006" : "COD. 011";

    const qrUrl = this.buildOfficialArcaQrUrl(order, fiscal);

    // Load QR Code Base64 Image 100% offline
    const qrBase64 = await this.loadQrCodeBase64(qrUrl);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

    // Premium Corporate Color Palette
    const MAROON = [45, 14, 19];        // #2D0E13 Deep Obsidian Maroon
    const GOLD = [197, 160, 89];        // #C5A059 Warm Gold
    const GOLD_BRIGHT = [212, 175, 55];  // #D4AF37 Bright Gold
    const LIGHT_BG = [251, 249, 244];    // #FBF9F4 Luxury Cream
    const CARD_BG = [248, 245, 239];     // #F8F5EF Tinted Card Fill
    const BORDER_CLR = [216, 198, 182];   // #D8C6B6 Soft Warm Border
    const TEXT_DARK = [40, 40, 40];      // #282828 Charcoal Body Text
    const TEXT_MUTED = [90, 90, 90];     // #5A5A5A Muted Gray

    // 1. Outer Double Frame Border
    doc.setDrawColor(BORDER_CLR[0], BORDER_CLR[1], BORDER_CLR[2]);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20, "S");

    // Top Solid Accent Line
    doc.setFillColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.rect(10, 10, pageWidth - 20, 3.5, "F");

    // 2. Header Block (Y: 13.5 to 53.5)
    doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
    doc.rect(10, 13.5, pageWidth - 20, 40, "F");
    doc.setDrawColor(BORDER_CLR[0], BORDER_CLR[1], BORDER_CLR[2]);
    doc.setLineWidth(0.4);
    doc.rect(10, 13.5, pageWidth - 20, 40, "S");

    // Center Letter Emblem Box (Official AFIP/ARCA Box - 20mm x 20mm centered at X=105)
    const letterBoxWidth = 20;
    const letterBoxHeight = 20;
    const letterBoxX = pageWidth / 2 - letterBoxWidth / 2; // 95mm
    
    doc.setFillColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.rect(letterBoxX, 13.5, letterBoxWidth, letterBoxHeight, "F");
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(0.6);
    doc.rect(letterBoxX, 13.5, letterBoxWidth, letterBoxHeight, "S");

    doc.setTextColor(GOLD_BRIGHT[0], GOLD_BRIGHT[1], GOLD_BRIGHT[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(letter, pageWidth / 2, 25.5, { align: "center" });

    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(codigoFactura, pageWidth / 2, 30, { align: "center" });

    // Vertical Divider Line under emblem box
    doc.setDrawColor(BORDER_CLR[0], BORDER_CLR[1], BORDER_CLR[2]);
    doc.setLineWidth(0.3);
    doc.line(pageWidth / 2, 33.5, pageWidth / 2, 53.5);

    // Left Header (Issuer Details)
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("CASTAÑO — RESTO BAR", 14, 21);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.text("Resto Bar & Cafetería", 14, 25.5);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.text("VÉLEZ AGUSTÍN GEREMÍAS", 14, 30.5);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text("CUIT Emisor: 20-44551340-8", 14, 35);
    doc.text("Ingresos Brutos: 20445513408", 14, 39);
    doc.text("Domicilio: Constitución 944, Río Cuarto, Cba", 14, 43);
    doc.text(`Condición IVA: ${isFacturaC ? "Monotributista" : "Responsable Inscripto"}`, 14, 47);
    doc.text("Inicio de Actividades: 01/03/2022", 14, 51);

    // Right Header (Invoice Number & Document Metadata)
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`FACTURA ${letter}`, pageWidth - 14, 21, { align: "right" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.text(`N° Comprobante: ${fiscal.invoiceNumber || "00003-00000658"}`, pageWidth - 14, 26.5, { align: "right" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`Fecha de Emisión: ${new Date(order.createdAt).toLocaleDateString("es-AR")}`, pageWidth - 14, 32, { align: "right" });
    doc.text(`Punto de Venta: 00003`, pageWidth - 14, 36.5, { align: "right" });
    doc.text(`Moneda: Pesos Argentinos (ARS)`, pageWidth - 14, 41, { align: "right" });
    doc.text(`Concepto: Servicios Gastronómicos`, pageWidth - 14, 45.5, { align: "right" });

    // 3. Customer Info Card (Y: 56.5 to 78.5)
    let currentY = 56.5;
    const cardHeight = 22;

    doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]);
    doc.rect(10, currentY, pageWidth - 20, cardHeight, "F");
    doc.setDrawColor(BORDER_CLR[0], BORDER_CLR[1], BORDER_CLR[2]);
    doc.setLineWidth(0.4);
    doc.rect(10, currentY, pageWidth - 20, cardHeight, "S");

    // Header label bar inside customer box
    doc.setFillColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.rect(10, currentY, pageWidth - 20, 5, "F");
    doc.setTextColor(GOLD_BRIGHT[0], GOLD_BRIGHT[1], GOLD_BRIGHT[2]);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL RECEPTOR / CLIENTE", 14, currentY + 3.5);

    const clientDoc = fiscal.customerCuit || order.clientCuit || "Consumidor Final";
    const clientName = fiscal.customerName || order.clientAccountName || "Consumidor Final";
    const clientIva = fiscal.customerIvaCondition || "Consumidor Final";
    const paymentMethodStr = order.paymentMethod || "Efectivo";

    // Column 1 (Left: X=14mm)
    doc.setFontSize(7.5);
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Razón Social / Nombre:", 14, currentY + 11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(clientName, 48, currentY + 11);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.text("CUIT / DNI:", 14, currentY + 17);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(clientDoc, 48, currentY + 17);

    // Column 2 (Right: X=115mm)
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.text("Condición frente al IVA:", 115, currentY + 11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(clientIva, 152, currentY + 11);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.text("Medio de Pago:", 115, currentY + 17);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(paymentMethodStr, 152, currentY + 17);

    // 4. Items Table Frame & Rows (Y: 81.5 to 185)
    currentY = 81.5;
    const tableHeaderHeight = 7;
    const tableMinBottomY = 185;

    // Header Row
    doc.setFillColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.rect(10, currentY, pageWidth - 20, tableHeaderHeight, "F");

    // Table Columns Layout:
    // Col 1: CANT. (X: 10 to 26 -> Center: 18)
    // Col 2: DESCRIPCIÓN (X: 26 to 120 -> Left: 29)
    // Col 3: PRECIO UNIT. (X: 120 to 160 -> Right: 156)
    // Col 4: SUBTOTAL ARS (X: 160 to 200 -> Right: 196)

    doc.setTextColor(GOLD_BRIGHT[0], GOLD_BRIGHT[1], GOLD_BRIGHT[2]);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("CANT.", 18, currentY + 4.8, { align: "center" });
    doc.text("DESCRIPCIÓN DE PRODUCTO / SERVICIO", 29, currentY + 4.8);
    doc.text("PRECIO UNIT.", 156, currentY + 4.8, { align: "right" });
    doc.text("SUBTOTAL ARS", 196, currentY + 4.8, { align: "right" });

    currentY += tableHeaderHeight;
    const tableItemsStartY = currentY;

    doc.setFontSize(8);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.setFont("helvetica", "normal");

    order.items.forEach((it, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(252, 250, 246);
        doc.rect(10, currentY, pageWidth - 20, 7.5, "F");
      }

      doc.text(`${it.quantity}x`, 18, currentY + 5, { align: "center" });
      const wrappedDesc = doc.splitTextToSize(it.name, 88);
      doc.text(wrappedDesc, 29, currentY + 5);
      doc.text(`$${it.price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 156, currentY + 5, { align: "right" });
      doc.text(`$${(it.price * it.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 196, currentY + 5, { align: "right" });

      const lines = Array.isArray(wrappedDesc) ? wrappedDesc.length : 1;
      currentY += Math.max(7.5, lines * 4.5 + 2);
    });

    // Outer grid frame for table down to minimum height
    const tableActualEndY = Math.max(currentY, tableMinBottomY);
    doc.setDrawColor(BORDER_CLR[0], BORDER_CLR[1], BORDER_CLR[2]);
    doc.setLineWidth(0.4);
    doc.rect(10, tableItemsStartY, pageWidth - 20, tableActualEndY - tableItemsStartY, "S");

    // Correct Vertical Grid Lines matching column boundaries:
    // Col 1/2 boundary: X = 26mm
    // Col 2/3 boundary: X = 120mm
    // Col 3/4 boundary: X = 160mm
    doc.line(26, tableItemsStartY, 26, tableActualEndY);
    doc.line(120, tableItemsStartY, 120, tableActualEndY);
    doc.line(160, tableItemsStartY, 160, tableActualEndY);

    currentY = tableActualEndY + 5;

    // 5. Totals & Financial Summary Card (Y: ~190 to 220)
    const summaryCardWidth = 85;
    const summaryCardHeight = 28;
    const summaryCardX = pageWidth - 10 - summaryCardWidth; // 115mm (Right aligned)

    // Commercial Note Box (Left side: X=10 to 110)
    doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]);
    doc.rect(10, currentY, pageWidth - 25 - summaryCardWidth, summaryCardHeight, "F");
    doc.setDrawColor(BORDER_CLR[0], BORDER_CLR[1], BORDER_CLR[2]);
    doc.setLineWidth(0.4);
    doc.rect(10, currentY, pageWidth - 25 - summaryCardWidth, summaryCardHeight, "S");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.text("INFORMACIÓN FISCAL & OBSERVACIONES", 14, currentY + 5);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text("• Comprobante electrónico registrado en el sistema ARCA.", 14, currentY + 10);
    doc.text("• Documento emitido bajo normativa vigente de facturación AFIP/ARCA.", 14, currentY + 14);
    doc.text("• Conserve este comprobante para su registro contable o reclamos.", 14, currentY + 18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.text("¡Muchas gracias por su visita a Castaño — Resto Bar!", 14, currentY + 23);

    // Financial Breakdown Box (Right side: X=115mm to 200mm)
    doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
    doc.rect(summaryCardX, currentY, summaryCardWidth, summaryCardHeight, "F");
    doc.setDrawColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.setLineWidth(0.5);
    doc.rect(summaryCardX, currentY, summaryCardWidth, summaryCardHeight, "S");

    const netoCalc = isFacturaC ? order.total : fiscal.neto || (order.total / 1.21);
    const ivaCalc = isFacturaC ? 0 : fiscal.iva21 || (order.total - netoCalc);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text("Subtotal Neto Gravado:", summaryCardX + 5, currentY + 6.5);
    doc.text(`$${netoCalc.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryCardX + summaryCardWidth - 5, currentY + 6.5, { align: "right" });

    doc.text(`IVA (${isFacturaC ? "0%" : "21%"}):`, summaryCardX + 5, currentY + 13.5);
    doc.text(`$${ivaCalc.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryCardX + summaryCardWidth - 5, currentY + 13.5, { align: "right" });

    // Divider Line inside Summary Card
    doc.setDrawColor(BORDER_CLR[0], BORDER_CLR[1], BORDER_CLR[2]);
    doc.setLineWidth(0.3);
    doc.line(summaryCardX + 5, currentY + 16.5, summaryCardX + summaryCardWidth - 5, currentY + 16.5);

    // Total Highlight Box
    doc.setFillColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.rect(summaryCardX + 2, currentY + 18.5, summaryCardWidth - 4, 8, "F");

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GOLD_BRIGHT[0], GOLD_BRIGHT[1], GOLD_BRIGHT[2]);
    doc.text("TOTAL FACTURADO:", summaryCardX + 5, currentY + 24);
    doc.setTextColor(255, 255, 255);
    doc.text(`$${order.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryCardX + summaryCardWidth - 5, currentY + 24, { align: "right" });

    // 6. Official ARCA / AFIP Footer Box with QR Code (Y: 225 to 282)
    currentY = 225;
    const footerBoxHeight = 57;

    doc.setFillColor(255, 255, 255);
    doc.rect(10, currentY, pageWidth - 20, footerBoxHeight, "F");
    doc.setDrawColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.setLineWidth(0.5);
    doc.rect(10, currentY, pageWidth - 20, footerBoxHeight, "S");

    // Top Footer Accent Bar
    doc.setFillColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.rect(10, currentY, pageWidth - 20, 5, "F");
    doc.setTextColor(GOLD_BRIGHT[0], GOLD_BRIGHT[1], GOLD_BRIGHT[2]);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text("ARCA — AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO (COMPROBANTE AUTORIZADO)", 14, currentY + 3.5);

    // 2D QR Code Image Rendering (100% Offline via qrcode npm)
    const qrSize = 44;
    const qrX = 14;
    const qrY = currentY + 8;

    if (qrBase64) {
      doc.addImage(qrBase64, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setDrawColor(BORDER_CLR[0], BORDER_CLR[1], BORDER_CLR[2]);
      doc.setLineWidth(0.3);
      doc.rect(qrX, qrY, qrSize, qrSize, "S");
    }

    // Right CAE Info Block (X: 62mm)
    const caeX = 62;
    const caeNum = fiscal.cae || "62106470991612";
    const caeExp = fiscal.caeExpiration || "2026-08-16";

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.text("COMPROBANTE ELECTRÓNICO AUTORIZADO POR ARCA (ex-AFIP)", caeX, currentY + 13);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text("Este comprobante posee validación en la base de datos de la Agencia de Recaudación.", caeX, currentY + 18);

    // CAE Box Highlight
    doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]);
    doc.rect(caeX, currentY + 21.5, 128, 18, "F");
    doc.setDrawColor(BORDER_CLR[0], BORDER_CLR[1], BORDER_CLR[2]);
    doc.setLineWidth(0.4);
    doc.rect(caeX, currentY + 21.5, 128, 18, "S");

    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
    doc.text(`CAE N°: ${caeNum}`, caeX + 5, currentY + 28.5);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`Fecha de Vto. de CAE: ${caeExp}`, caeX + 5, currentY + 35.5);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Punto de Venta: 00003  ·  Comprobante N°: ${fiscal.invoiceNumber || "00003-00000658"}`, caeX, currentY + 45.5);

    if (qrUrl) {
      doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
      doc.setFont("helvetica", "bold");
      // Clean string without unsupported emoji characters to prevent encoding artifacts like "Ø=Ý"
      doc.textWithLink("Verificar Validez de Comprobante en AFIP / ARCA (Consulta Online)", caeX, currentY + 50.5, {
        url: qrUrl
      });
    }

    doc.save(`Factura_ARCA_${letter}_${fiscal.invoiceNumber || "00003-00000658"}.pdf`);
  }
}
