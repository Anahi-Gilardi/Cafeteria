import jsPDF from "jspdf";
import { MenuItem } from "../types";
import { MENU_ITEMS } from "../data/menu";

export class MenuPDFService {
  /**
   * Generates and downloads a complete, multi-page PDF of the active menu catalog
   */
  public static generateMenuPDF(inputMenuItems: MenuItem[]): void {
    // Merge input menu items with master MENU_ITEMS to ensure 2026 prices
    const baseItems = inputMenuItems && inputMenuItems.length > 0 ? inputMenuItems : MENU_ITEMS;
    const menuItems = baseItems.map(item => {
      const catalogItem = MENU_ITEMS.find(m => m.id === item.id);
      if (catalogItem) {
        return {
          ...item,
          price: Math.max(item.price, catalogItem.price),
          offerPrice: catalogItem.offerPrice || item.offerPrice,
          takeawayPrice: catalogItem.takeawayPrice || item.takeawayPrice,
          deliveryPrice: catalogItem.deliveryPrice || item.deliveryPrice
        };
      }
      return item;
    });

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 0;

    // Helper to render Page 1 Cover Banner
    const drawCoverHeader = () => {
      // Header Background (Dark Chocolate #1A110B)
      doc.setFillColor(26, 17, 11);
      doc.rect(0, 0, pageWidth, 44, "F");

      // Gold decorative border box
      doc.setDrawColor(212, 175, 55); // #D4AF37
      doc.setLineWidth(0.8);
      doc.rect(6, 6, pageWidth - 12, 32, "S");

      // Main Title (No Emojis for clean Helvetica rendering)
      doc.setTextColor(255, 223, 0); // #FFDF00 Gold
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("RESTO BAR DEL TEATRO", pageWidth / 2, 18, { align: "center" });

      // Subtitle & Address
      doc.setTextColor(253, 251, 247); // White
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.text("CONSTITUCIÓN 944 • RÍO CUARTO, CÓRDOBA", pageWidth / 2, 25, { align: "center" });

      // Highlight Promo Badge
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("MENÚ EJECUTIVO DEL DÍA: $12.500 (ENTRADA + PRINCIPAL + BEBIDA + POSTRE)", pageWidth / 2, 32, { align: "center" });

      currentY = 52;
    };

    // Helper to render Page 2+ Headers
    const drawSecondaryHeader = () => {
      doc.setFillColor(26, 17, 11);
      doc.rect(0, 0, pageWidth, 16, "F");

      doc.setTextColor(255, 223, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("RESTO BAR DEL TEATRO — CARTA OFICIAL", 12, 11);

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Constitución 944, Río Cuarto", pageWidth - 12, 11, { align: "right" });

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(0, 16, pageWidth, 16);

      currentY = 24;
    };

    // Draw initial cover header
    drawCoverHeader();

    // Comprehensive Category Map matching ALL database & catalog category keys
    const categoryLabels: { [key: string]: string } = {
      executive: "MENÚ EJECUTIVO & PROMOCIONES DE MEDIODÍA",
      desayunos_meriendas: "DESAYUNOS, BRUNCH & MERIENDAS DE ESPECIALIDAD",
      pizzas_focaccias: "PIZZAS ARTESANALES & FOCACCIAS A LAS BRASAS",
      minutas_carnes: "MINUTAS, CARNES & ESPECIALIDADES DEL CHEF",
      pastas_caseras: "PASTAS CASERAS & SALSAS ARTESANALES",
      empanadas: "EMPANADAS CRIOLLAS & DE AUTOR",
      bebidas_sa: "BEBIDAS SIN ALCOHOL & JUGOS NATURALES",
      bebidas_alcohol: "BEBIDAS CON ALCOHOL, VINOS & COCKTAILS",
      postres: "POSTRES ARTESANALES & DULCES",

      // Legacy & Custom fallbacks
      coffee: "CAFETERÍA DE ESPECIALIDAD",
      bakery: "PASTELERÍA & REPOSTERÍA",
      starters: "ENTRADAS & TAPEOS",
      mains: "PLATOS PRINCIPALES",
      drinks: "BEBIDAS & COCKTAILS",
      traditional: "CLÁSICOS DE LA CASA"
    };

    // Find all distinct categories present in menuItems
    const presentCategories = Array.from(new Set(menuItems.map(i => i.category)));
    
    // Sort categories in logical menu sequence
    const preferredOrder = [
      "executive",
      "desayunos_meriendas",
      "coffee",
      "bakery",
      "pizzas_focaccias",
      "empanadas",
      "minutas_carnes",
      "pastas_caseras",
      "starters",
      "mains",
      "bebidas_sa",
      "bebidas_alcohol",
      "drinks",
      "postres",
      "desserts"
    ];

    presentCategories.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    // Iterate through present categories and render items
    presentCategories.forEach(catKey => {
      const itemsInCat = menuItems.filter(i => i.category === catKey);
      if (itemsInCat.length === 0) return;

      const titleText = (categoryLabels[catKey] || catKey.toUpperCase().replace(/_/g, " "));

      // Check if space left for category header + at least 1 item (~25mm)
      if (currentY + 25 > pageHeight - 20) {
        doc.addPage();
        drawSecondaryHeader();
      }

      // Render Category Section Bar
      doc.setFillColor(42, 27, 18); // Dark brown accent #2A1B12
      doc.rect(10, currentY, pageWidth - 20, 8, "F");

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.4);
      doc.rect(10, currentY, pageWidth - 20, 8, "S");

      doc.setTextColor(255, 223, 0); // Gold
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(titleText, 14, currentY + 5.5);

      currentY += 13;

      // Render items in category
      itemsInCat.forEach(item => {
        // Calculate item height requirement
        const priceStr = `$${(item.offerPrice || item.price).toLocaleString("es-AR")}`;
        const descLines = item.description ? doc.splitTextToSize(item.description, pageWidth - 35) : [];
        const requiredHeight = 6 + (descLines.length * 3.5) + 4;

        if (currentY + requiredHeight > pageHeight - 20) {
          doc.addPage();
          drawSecondaryHeader();
        }

        // Product Name
        doc.setTextColor(26, 17, 11);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(item.name, 14, currentY);

        // Price (Right aligned)
        doc.setTextColor(153, 101, 21); // Dark gold
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(priceStr, pageWidth - 14, currentY, { align: "right" });

        // Description
        if (descLines.length > 0) {
          doc.setTextColor(90, 80, 75);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.text(descLines, 14, currentY + 4);
          currentY += 4 + (descLines.length * 3.5);
        } else {
          currentY += 5;
        }

        // Dotted separator line
        doc.setDrawColor(225, 215, 205);
        doc.setLineWidth(0.15);
        doc.line(14, currentY + 1, pageWidth - 14, currentY + 1);
        currentY += 4.5;
      });

      currentY += 3;
    });

    // Footers on all pages (with total page count)
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Bottom Footer Bar
      doc.setFillColor(26, 17, 11);
      doc.rect(0, pageHeight - 10, pageWidth, 10, "F");

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("RESTO BAR DEL TEATRO • Constitución 944, Río Cuarto • Tel: 358 5042311 / 358 4651847", 12, pageHeight - 4);

      doc.setTextColor(253, 251, 247);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 12, pageHeight - 4, { align: "right" });
    }

    // Save PDF output
    doc.save("Carta_Oficial_Resto_Bar_Del_Teatro.pdf");
  }
}
