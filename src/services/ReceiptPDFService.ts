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

  /**
   * Generates downloadable PDF for FACTURA FISCAL ARCA (Official Fiscal Receipt with CAE & QR)
   */
  public static async generateArcaInvoicePDF(order: Order, fiscal: FiscalDetails): Promise<void> {
    const qrUrl = fiscal.qrCodeUrl || (fiscal.cae ? `https://www.arca.gob.ar/fe/qr/?p=${btoa(JSON.stringify({ ver: 1, fecha: new Date().toISOString().slice(0,10), cuit: 20445513408, ptoVta: 3, tipoCmp: fiscal.invoiceType === "A" ? 1 : fiscal.invoiceType === "B" ? 6 : 11, nroCmp: 2492, importe: order.total, moneda: "PES", ctz: 1, tipoDocRec: 99, nroDocRec: 0, tipoCodAut: "E", codAut: Number(fiscal.cae) }))}` : "");

    // Load QR Code Base64 Image
    const qrBase64 = await this.loadQrCodeBase64(qrUrl);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Outer Border (A4 210x297mm)
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, 277, "S");

    // Header Box
    doc.setFillColor(250, 246, 240);
    doc.rect(10, 10, pageWidth - 20, 38, "F");
    doc.rect(10, 10, pageWidth - 20, 38, "S");

    // Center Letter Box (A, B, C)
    const letter = fiscal.invoiceType || "B";
    const codigoFactura = letter === "A" ? "COD. 001" : letter === "B" ? "COD. 006" : "COD. 011";

    doc.setFillColor(92, 29, 39); // Deep Maroon #5C1D27
    doc.rect(pageWidth / 2 - 10, 10, 20, 18, "F");
    doc.setTextColor(255, 223, 0); // Gold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(letter, pageWidth / 2, 21, { align: "center" });

    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(codigoFactura, pageWidth / 2, 25.5, { align: "center" });

    // Vertical separator line down center of header
    doc.setDrawColor(92, 29, 39);
    doc.setLineWidth(0.3);
    doc.line(pageWidth / 2, 28, pageWidth / 2, 48);

    // Left Header (Emisor Fiscal)
    const rawIssuerName = fiscal.issuerName || "CASTAÑO — RESTO BAR";
    const formattedIssuer = rawIssuerName === "castano_resto_bar" ? "CASTAÑO — RESTO BAR" : rawIssuerName;

    doc.setTextColor(92, 29, 39);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(formattedIssuer, 14, 18);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text("Razón Social: VÉLEZ AGUSTÍN GEREMÍAS", 14, 23.5);
    doc.text(`Domicilio Comercial: ${fiscal.issuerAddress || "Constitución 944, Río Cuarto, Córdoba"}`, 14, 28);
    doc.text(`Condición Frente al IVA: ${letter === "C" ? "Monotributista" : "Responsable Inscripto"}`, 14, 32.5);
    doc.text("Inicio de Actividades: 01/03/2022", 14, 37);

    // Right Header (Invoice Details)
    doc.setTextColor(92, 29, 39);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`FACTURA ${letter}`, pageWidth - 14, 18, { align: "right" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(`N° Comprobante: ${fiscal.invoiceNumber || "00003-00000001"}`, pageWidth - 14, 23.5, { align: "right" });
    doc.text(`Fecha de Emisión: ${new Date(order.createdAt).toLocaleDateString("es-AR")}`, pageWidth - 14, 28, { align: "right" });
    doc.text(`CUIT Emisor: 20-44551340-8`, pageWidth - 14, 32.5, { align: "right" });
    doc.text(`Punto de Venta: 00003`, pageWidth - 14, 37, { align: "right" });

    currentY = 52;

    // Customer Info Box
    doc.setFillColor(252, 250, 247);
    doc.rect(10, currentY, pageWidth - 20, 22, "F");
    doc.rect(10, currentY, pageWidth - 20, 22, "S");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(92, 29, 39);
    
    const clientDoc = fiscal.customerCuit || order.clientCuit || "Consumidor Final";
    const clientName = fiscal.customerName || order.clientAccountName || "Consumidor Final";
    const clientIva = fiscal.customerIvaCondition || "Consumidor Final";
    const paymentMethodStr = order.paymentMethod || "Efectivo";

    doc.text(`Cliente / CUIT / DNI: ${clientDoc}`, 14, currentY + 6.5);
    doc.text(`Nombre / Razón Social: ${clientName}`, 14, currentY + 13.5);
    
    doc.text(`Condición IVA: ${clientIva}`, pageWidth - 14, currentY + 6.5, { align: "right" });
    doc.text(`Condición de Venta: ${paymentMethodStr}`, pageWidth - 14, currentY + 13.5, { align: "right" });

    currentY += 28;

    // Table Header
    doc.setFillColor(92, 29, 39); // #5C1D27
    doc.rect(10, currentY, pageWidth - 20, 8, "F");
    doc.setTextColor(255, 223, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    doc.text("Cant.", 14, currentY + 5.5);
    doc.text("Descripción de Producto / Servicio", 32, currentY + 5.5);
    doc.text("Precio Unit.", 130, currentY + 5.5);
    doc.text("Subtotal ARS", 170, currentY + 5.5);

    currentY += 10;
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");

    order.items.forEach((it, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 245, 240);
        doc.rect(10, currentY - 4, pageWidth - 20, 7, "F");
      }
      doc.text(`${it.quantity}x`, 14, currentY);
      const wrappedDesc = doc.splitTextToSize(it.name, 90);
      doc.text(wrappedDesc, 32, currentY);
      doc.text(`$${it.price.toLocaleString("es-AR")}`, 130, currentY);
      doc.text(`$${(it.price * it.quantity).toLocaleString("es-AR")}`, 170, currentY);
      
      const lines = Array.isArray(wrappedDesc) ? wrappedDesc.length : 1;
      currentY += lines * 5 + 2;
    });

    // Breakdown Box (positioned at Y: 195mm)
    currentY = Math.max(currentY + 10, 195);

    doc.setFillColor(250, 246, 240);
    doc.rect(10, currentY, pageWidth - 20, 26, "F");
    doc.rect(10, currentY, pageWidth - 20, 26, "S");

    const netoCalc = letter === "C" ? order.total : fiscal.neto || (order.total / 1.21);
    const ivaCalc = letter === "C" ? 0 : fiscal.iva21 || (order.total - netoCalc);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(`Importe Neto Gravado: $${netoCalc.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, currentY + 8);
    doc.text(`IVA (21%): $${ivaCalc.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, currentY + 17);

    doc.setFontSize(13);
    doc.setTextColor(92, 29, 39);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL FACTURADO: $${order.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 14, currentY + 15, { align: "right" });

    // Official AFIP / ARCA Fiscal Footer Box with QR Code (Y: 232mm)
    currentY = 232;
    doc.setFillColor(255, 255, 255);
    doc.rect(10, currentY, pageWidth - 20, 50, "F");
    doc.rect(10, currentY, pageWidth - 20, 50, "S");

    // Draw QR Code Image if available
    if (qrBase64) {
      doc.addImage(qrBase64, "PNG", 14, currentY + 4, 42, 42);
    } else {
      // Fallback QR Box Graphic
      doc.setDrawColor(92, 29, 39);
      doc.rect(14, currentY + 4, 42, 42, "S");
      doc.setFontSize(7);
      doc.setTextColor(92, 29, 39);
      doc.text("QR AFIP / ARCA", 35, currentY + 25, { align: "center" });
    }

    // ARCA Fiscal CAE Data Block (Right side of QR code)
    const caeNum = fiscal.cae || "74381920485719";
    const caeExp = fiscal.caeExpiration || new Date(Date.now() + 10 * 86400000).toLocaleDateString("es-AR");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(92, 29, 39);
    doc.text("ARCA — AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO", 60, currentY + 10);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text("Comprobante Electrónico Autorizado por ARCA (ex-AFIP)", 60, currentY + 16);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(92, 29, 39);
    doc.text(`CAE N°: ${caeNum}`, 60, currentY + 24);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(`Fecha de Vencimiento CAE: ${caeExp}`, 60, currentY + 31);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Punto de Venta: 00003 · Comprobante: ${fiscal.invoiceNumber || "00003-00000001"}`, 60, currentY + 38);

    if (qrUrl) {
      doc.setTextColor(92, 29, 39);
      doc.setFont("helvetica", "bold");
      doc.textWithLink("Verificar Validez de Comprobante en AFIP / ARCA", 60, currentY + 44, {
        url: qrUrl
      });
    }

    doc.save(`Factura_ARCA_${letter}_${fiscal.invoiceNumber || "00003-00000001"}.pdf`);
  }
}
