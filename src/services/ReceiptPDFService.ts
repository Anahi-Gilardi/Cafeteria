import jsPDF from "jspdf";
import { Order, FiscalDetails } from "../types";

export function isAuthorizedFiscalDetails(fiscal: FiscalDetails): boolean {
  return (
    ["authorized", "observed"].includes(fiscal.status || "") &&
    /^\d{14}$/.test(fiscal.cae || "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(fiscal.caeExpiration || "") &&
    /^\d{5}-\d{8}$/.test(fiscal.invoiceNumber || "") &&
    Boolean(fiscal.qrCodeUrl && fiscal.issuerCuit)
  );
}

export class ReceiptPDFService {
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
  public static generateArcaInvoicePDF(order: Order, fiscal: FiscalDetails): void {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Outer Border
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, 275, "S");

    // Header Box
    doc.setFillColor(245, 245, 245);
    doc.rect(10, 10, pageWidth - 20, 35, "F");

    // Letter Box (A, B, C)
    doc.setFillColor(26, 17, 11); // Dark Obsidian
    doc.rect(pageWidth / 2 - 8, 10, 16, 16, "F");
    doc.setTextColor(255, 223, 0); // Gold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(fiscal.invoiceType, pageWidth / 2, 21, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`COD. ${fiscal.invoiceType === "A" ? "001" : fiscal.invoiceType === "B" ? "006" : "011"}`, pageWidth / 2, 25, { align: "center" });

    // Left Header (Issuer)
    doc.setTextColor(26, 17, 11);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(fiscal.issuerName || "EMISOR NO INFORMADO", 15, 20);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Razón Social: ${fiscal.issuerName || "No informada"}`, 15, 26);
    doc.text(`Domicilio Comercial: ${fiscal.issuerAddress || "No informado por ARCA"}`, 15, 30);
    doc.text("Condición IVA: según configuración fiscal ARCA", 15, 34);

    // Right Header (Invoice Details)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const isRealCae = isAuthorizedFiscalDetails(fiscal);
    doc.text(isRealCae ? "FACTURA" : "DOCUMENTO NO FISCAL", pageWidth - 15, 20, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`N° Comprobante: ${fiscal.invoiceNumber}`, pageWidth - 15, 26, { align: "right" });
    doc.text(`Fecha Emisión: ${new Date(order.createdAt).toLocaleDateString("es-AR")}`, pageWidth - 15, 30, { align: "right" });
    doc.text(`CUIT Emisor: ${fiscal.issuerCuit || "No informado"}`, pageWidth - 15, 34, { align: "right" });

    currentY = 50;

    // Customer Info Box
    doc.setFillColor(250, 250, 250);
    doc.rect(10, currentY, pageWidth - 20, 20, "F");
    doc.rect(10, currentY, pageWidth - 20, 20, "S");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Cliente / CUIT: ${fiscal.customerCuit || "Consumidor Final"}`, 15, currentY + 7);
    doc.text(`Nombre / Razón Social: ${fiscal.customerName || "Consumidor Final"}`, 15, currentY + 14);

    currentY += 28;

    // Table Header
    doc.setFillColor(26, 17, 11);
    doc.rect(10, currentY, pageWidth - 20, 8, "F");
    doc.setTextColor(255, 223, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    doc.text("Cant", 15, currentY + 5.5);
    doc.text("Descripción de Producto / Servicio", 35, currentY + 5.5);
    doc.text("P. Unit", 130, currentY + 5.5);
    doc.text("Subtotal", 170, currentY + 5.5);

    currentY += 10;
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");

    order.items.forEach((it, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 248, 248);
        doc.rect(10, currentY - 4, pageWidth - 20, 7, "F");
      }
      doc.text(`${it.quantity}x`, 15, currentY);
      const wrappedDesc = doc.splitTextToSize(it.name, 85);
      doc.text(wrappedDesc, 35, currentY);
      doc.text(`$${it.price.toLocaleString("es-AR")}`, 130, currentY);
      doc.text(`$${(it.price * it.quantity).toLocaleString("es-AR")}`, 170, currentY);
      
      const lines = Array.isArray(wrappedDesc) ? wrappedDesc.length : 1;
      currentY += lines * 5 + 2;
    });

    currentY = 220;

    // Fiscal Breakdown Box
    doc.setFillColor(245, 245, 245);
    doc.rect(10, currentY, pageWidth - 20, 30, "F");
    doc.rect(10, currentY, pageWidth - 20, 30, "S");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 17, 11);
    doc.text(`Importe Neto Gravado: $${fiscal.neto.toLocaleString("es-AR")}`, 15, currentY + 8);
    doc.text(`IVA (21% Incluido): $${fiscal.iva21.toLocaleString("es-AR")}`, 15, currentY + 16);

    doc.setFontSize(14);
    doc.setTextColor(16, 124, 65);
    doc.text(`${isRealCae ? "TOTAL" : "TOTAL PRE-TICKET"}: $${order.total.toLocaleString("es-AR")}`, pageWidth - 15, currentY + 18, { align: "right" });

    // Official ARCA CAE / Draft Box
    currentY = 255;
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    if (isRealCae) {
      doc.text(`CAE N°: ${fiscal.cae}`, 15, currentY);
      doc.text(`Fecha de Vencimiento CAE: ${fiscal.caeExpiration}`, 15, currentY + 5);
      doc.text("Comprobante Autorizado por ARCA (Agencia de Recaudación y Control Aduanero)", 15, currentY + 10);
      doc.textWithLink("Abrir verificación fiscal ARCA", pageWidth - 15, currentY + 10, {
        url: fiscal.qrCodeUrl!,
        align: "right"
      });
    } else {
      doc.text(`ESTADO FISCAL: DOCUMENTO NO FISCAL / BORRADOR PREVIO A FACTURACIÓN`, 15, currentY);
      doc.text(`CAE N°: PENDIENTE DE HOMOLOGACIÓN EN BACKEND`, 15, currentY + 5);
      doc.text("*** ESTE COMPROBANTE ES UN PRE-TICKET OPERATIVO INTERNO DE RESTO BAR DEL TEATRO ***", 15, currentY + 10);
    }

    doc.save(`${isRealCae ? "Factura_ARCA" : "PreTicket"}_${fiscal.invoiceType}_${fiscal.invoiceNumber}.pdf`);
  }
}
