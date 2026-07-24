import jsPDF from "jspdf";
import { MenuItem } from "../types";

export class MenuPDFService {
  /**
   * Generates and downloads a PDF of the active restaurant menu catalog
   */
  public static generateMenuPDF(menuItems: MenuItem[]): void {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // Header Background Accent (Dark Chocolate & Gold)
    doc.setFillColor(26, 17, 11); // #1A110B
    doc.rect(0, 0, pageWidth, 42, "F");

    // Gold decorative border
    doc.setDrawColor(212, 175, 55); // #D4AF37
    doc.setLineWidth(0.8);
    doc.rect(5, 5, pageWidth - 10, 32, "S");

    // Brand Title
    doc.setTextColor(255, 223, 0); // #FFDF00 Gold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("RESTO BAR DEL TEATRO", pageWidth / 2, 18, { align: "center" });

    // Subtitle
    doc.setTextColor(253, 251, 247); // #FDFBF7 Crisp white
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("CONSTITUCIÓN 944 • RÍO CUARTO, CÓRDOBA", pageWidth / 2, 25, { align: "center" });

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("⭐ MENÚ EJECUTIVO DEL DÍA: $8.000 (ENTRADA + PRINCIPAL + BEBIDA + POSTRE)", pageWidth / 2, 32, { align: "center" });

    currentY = 50;

    // Group items by category
    const categories: { [key: string]: string } = {
      executive: "⭐ MENÚ EJECUTIVO & PROMOCIONES",
      coffee: "☕ CAFETERÍA DE ESPECIALIDAD",
      bakery: "🍰 PASTELERÍA & REPOSTERÍA DE AUTOR",
      starters: "🥟 ENTRADAS & MINUTAS",
      mains: "🥩 PLATOS PRINCIPALES & COCINA",
      desserts: "🍨 POSTRES ARTESANALES",
      drinks: "🍸 BEBIDAS, VINOS & COCKTAILS"
    };

    Object.keys(categories).forEach(catKey => {
      const itemsInCat = menuItems.filter(i => i.category === catKey || (catKey === "coffee" && i.category === "traditional"));
      if (itemsInCat.length === 0) return;

      // Check for page overflow
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      // Category Header
      doc.setFillColor(42, 27, 18); // #2A1B12
      doc.rect(10, currentY, pageWidth - 20, 8, "F");

      doc.setTextColor(255, 223, 0); // Gold
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(categories[catKey], 14, currentY + 5.5);

      currentY += 12;

      // Render Items in category
      itemsInCat.forEach(item => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }

        // Product Name
        doc.setTextColor(26, 17, 11);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(item.name, 14, currentY);

        // Price
        doc.setTextColor(153, 101, 21); // Dark gold
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`$${item.price.toLocaleString("es-AR")}`, pageWidth - 14, currentY, { align: "right" });

        // Description
        if (item.description) {
          doc.setTextColor(100, 90, 85);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          const splitDesc = doc.splitTextToSize(item.description, pageWidth - 35);
          doc.text(splitDesc, 14, currentY + 4);
          currentY += 4 + splitDesc.length * 3.5;
        } else {
          currentY += 5;
        }

        // Dotted separator
        doc.setDrawColor(220, 210, 200);
        doc.setLineWidth(0.2);
        doc.line(14, currentY + 1, pageWidth - 14, currentY + 1);
        currentY += 4;
      });

      currentY += 4;
    });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(26, 17, 11);
      doc.rect(0, 287, pageWidth, 10, "F");

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("RESTO BAR DEL TEATRO • Río Cuarto • Tel: 358 5042311 / 358 4651847 • Instagram: @restobardelteatro_rio4", pageWidth / 2, 293, { align: "center" });
    }

    // Trigger download
    doc.save("Carta_Oficial_Resto_Bar_Del_Teatro.pdf");
  }
}
