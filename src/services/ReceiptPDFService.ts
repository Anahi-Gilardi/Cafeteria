import jsPDF from "jspdf";
import { Order, FiscalDetails } from "../types";

export class ReceiptPDFService {
  /**
   * Generates downloadable PDF for TICKET NO FISCAL (Roll format 80mm)
   */
  public static generateTicketNoFiscalPDF(order: Order): void {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 180] // Thermal roll format 80mm
    });

    let currentY = 10;
    const centerX = 40;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("RESTO BAR DEL TEATRO", centerX, currentY, { align: "center" });

    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Constitución 944 • Río Cuarto", centerX, currentY, { align: "center" });
    doc.text("Tel: 358 5042311 / 358 4651847", centerX, currentY + 4, { align: "center" });

    currentY += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DOCUMENTO NO FISCAL", centerX, currentY, { align: "center" });
    doc.text(`Comanda #${order.id.slice(-6).toUpperCase()}`, centerX, currentY + 4, { align: "center" });

    currentY += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Ubicación: ${order.tableNumber || order.type}`, 5, currentY);
    doc.text(`Fecha: ${new Date(order.createdAt).toLocaleString("es-AR")}`, 5, currentY + 4);

    currentY += 8;
    doc.line(5, currentY, 75, currentY);

    // Items table
    currentY += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Cant", 5, currentY);
    doc.text("Descripción", 18, currentY);
    doc.text("Total", 65, currentY);

    currentY += 4;
    doc.line(5, currentY, 75, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    order.items.forEach((it) => {
      if (currentY > 165) {
        doc.addPage();
        currentY = 10;
      }
      doc.text(`${it.quantity}x`, 5, currentY);
      doc.text(it.name.slice(0, 22), 18, currentY);
      doc.text(`$${(it.price * it.quantity).toLocaleString("es-AR")}`, 65, currentY);
      currentY += 5;
    });

    currentY += 2;
    doc.line(5, currentY, 75, currentY);
    currentY += 6;

    // Totals
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`TOTAL: $${order.total.toLocaleString("es-AR")}`, 75, currentY, { align: "right" });

    currentY += 10;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("Comprobante de consumo interno.", centerX, currentY, { align: "center" });
    doc.text("¡Muchas gracias por su visita!", centerX, currentY + 4, { align: "center" });

    doc.save(`Ticket_NoFiscal_${order.id.slice(-6)}.pdf`);
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
    doc.text("RESTO BAR DEL TEATRO", 15, 20);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Razón Social: RESTO BAR DEL TEATRO S.A.", 15, 26);
    doc.text("Domicilio Comercial: Constitución 944, Río Cuarto", 15, 30);
    doc.text("Condición IVA: Responsable Inscripto", 15, 34);

    // Right Header (Invoice Details)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURA", pageWidth - 15, 20, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`N° Comprobante: ${fiscal.invoiceNumber}`, pageWidth - 15, 26, { align: "right" });
    doc.text(`Fecha Emisión: ${new Date(order.createdAt).toLocaleDateString("es-AR")}`, pageWidth - 15, 30, { align: "right" });
    doc.text(`CUIT Emisor: 30-71234567-8`, pageWidth - 15, 34, { align: "right" });

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
      doc.text(it.name.slice(0, 45), 35, currentY);
      doc.text(`$${it.price.toLocaleString("es-AR")}`, 130, currentY);
      doc.text(`$${(it.price * it.quantity).toLocaleString("es-AR")}`, 170, currentY);
      currentY += 7;
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
    doc.text(`IVA (21%): $${fiscal.iva21.toLocaleString("es-AR")}`, 15, currentY + 16);

    doc.setFontSize(14);
    doc.setTextColor(16, 124, 65);
    doc.text(`TOTAL FACTURADO: $${order.total.toLocaleString("es-AR")}`, pageWidth - 15, currentY + 18, { align: "right" });

    // Official ARCA CAE Box
    currentY = 255;
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(`CAE N°: ${fiscal.cae}`, 15, currentY);
    doc.text(`Fecha de Vencimiento CAE: ${fiscal.caeExpiration}`, 15, currentY + 5);
    doc.text("Comprobante Autorizado por ARCA (Agencia de Recaudación y Control Aduanero)", 15, currentY + 10);

    doc.save(`Factura_ARCA_${fiscal.invoiceType}_${fiscal.invoiceNumber}.pdf`);
  }
}
