import jsPDF from "jspdf";
import { MenuItem } from "../types";
import { MENU_ITEMS } from "../data/menu";

export function resolvePdfMenuItems(inputMenuItems: MenuItem[]): MenuItem[] {
  return inputMenuItems.map((item) => {
    const catalogItem = MENU_ITEMS.find((candidate) => candidate.id === item.id);
    return catalogItem ? { ...item, image: item.image || catalogItem.image } : item;
  });
}

export class MenuPDFService {
  /**
   * Helper to load an image URL or Base64 into a clean Data URL for jsPDF
   */
  private static loadImageBase64(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      if (!url) {
        resolve(null);
        return;
      }

      if (url.startsWith("data:image")) {
        resolve(url);
        return;
      }

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = 160;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
            return;
          }
        } catch {
          // Ignore CORS or canvas errors silently
        }
        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  /**
   * Generates and downloads a complete, multi-page PDF of the active menu catalog with Photos & QR Code
   */
  public static async generateMenuPDF(inputMenuItems: MenuItem[]): Promise<void> {
    // Supabase is canonical for prices; the bundled catalog only supplies missing images.
    const menuItems = resolvePdfMenuItems(inputMenuItems || []);
    if (menuItems.length === 0) {
      throw new Error("No hay productos disponibles en Supabase para generar la carta oficial.");
    }

    // Digital Menu Web Link for QR Code
    const digitalMenuUrl = typeof window !== "undefined" && window.location.origin
      ? `${window.location.origin}/`
      : "https://cafeteria-ten-pied.vercel.app/";

    // Preload QR Code and Product Images
    const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(digitalMenuUrl)}`;
    const qrCodeBase64Promise = this.loadImageBase64(qrCodeApiUrl);

    // Preload top product images to keep PDF export fast (< 2.5 seconds max)
    const imageMap = new Map<string, string | null>();
    const imagePromises = menuItems.map(async (item) => {
      if (item.image) {
        const b64 = await this.loadImageBase64(item.image);
        imageMap.set(item.id, b64);
      }
    });

    const [qrCodeBase64] = await Promise.all([
      qrCodeBase64Promise,
      Promise.all(imagePromises)
    ]);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 0;

    // Helper to render Page 1 Cover Header Banner with QR Code
    const drawCoverHeader = () => {
      // Header Background (Bordó Teatral #843747)
      doc.setFillColor(132, 55, 71); // #843747
      doc.rect(0, 0, pageWidth, 48, "F");

      // Double decorative border in soft cream #D7BBA8
      doc.setDrawColor(215, 187, 168);
      doc.setLineWidth(0.7);
      doc.rect(5, 5, pageWidth - 10, 38, "S");

      // Main Restaurant Title
      doc.setTextColor(255, 255, 255); // White
      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      doc.text("CASTAÑO — RESTO BAR", 12, 18);

      // Subtitle & Address
      doc.setTextColor(243, 231, 219); // Light cream #F3E7DB
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("CONSTITUCIÓN 944 • RÍO CUARTO, CÓRDOBA", 12, 25);

      // Promo Badge Box (Cream Background #FFF9F4)
      doc.setFillColor(255, 249, 244);
      doc.rect(12, 29, 135, 10, "F");
      doc.setDrawColor(215, 187, 168);
      doc.setLineWidth(0.4);
      doc.rect(12, 29, 135, 10, "S");

      doc.setTextColor(132, 55, 71); // Bordó
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("MENÚ EJECUTIVO DEL DÍA: $12.500 (ENTRADA + PRINCIPAL + BEBIDA + POSTRE)", 15, 35.5);

      // QR Code Box on Top Right (x = pageWidth - 46mm, y = 6mm, size = 38mm x 36mm)
      doc.setFillColor(255, 249, 244);
      doc.rect(pageWidth - 46, 7, 38, 34, "F");
      doc.setDrawColor(215, 187, 168);
      doc.setLineWidth(0.5);
      doc.rect(pageWidth - 46, 7, 38, 34, "S");

      if (qrCodeBase64) {
        try {
          doc.addImage(qrCodeBase64, "JPEG", pageWidth - 43, 8.5, 21, 21);
        } catch {
          // Fallback if image embedding fails
        }
      }

      doc.setTextColor(132, 55, 71);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text("📱 CARTA DIGITAL", pageWidth - 27, 32.5, { align: "center" });
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(111, 90, 85);
      doc.text("Escaneá para fotos HD", pageWidth - 27, 36.5, { align: "center" });

      currentY = 54;
    };

    // Helper to render Page 2+ Headers
    const drawSecondaryHeader = () => {
      doc.setFillColor(132, 55, 71);
      doc.rect(0, 0, pageWidth, 16, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("CASTAÑO — RESTO BAR (CARTA OFICIAL)", 12, 11);

      doc.setTextColor(243, 231, 219);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Constitución 944, Río Cuarto • Carta Digital Online", pageWidth - 12, 11, { align: "right" });

      doc.setDrawColor(215, 187, 168);
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

      // Check if space left for category header + at least 1 item (~28mm)
      if (currentY + 28 > pageHeight - 16) {
        doc.addPage();
        drawSecondaryHeader();
      }

      // Render Category Section Bar (Bordó #843747 with Cream Border)
      doc.setFillColor(132, 55, 71);
      doc.rect(10, currentY, pageWidth - 20, 8.5, "F");

      doc.setDrawColor(215, 187, 168);
      doc.setLineWidth(0.4);
      doc.rect(10, currentY, pageWidth - 20, 8.5, "S");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(titleText, 14, currentY + 5.8);

      currentY += 14;

      // Render items in category with photo thumbnails
      itemsInCat.forEach(item => {
        const priceStr = `$${(item.offerPrice || item.price).toLocaleString("es-AR")}`;
        const itemImgB64 = imageMap.get(item.id);

        // Product text wrap calculation (leaving 22mm for left photo thumbnail)
        const textStartX = 32;
        const textWidth = pageWidth - textStartX - 14;
        const descLines = item.description ? doc.splitTextToSize(item.description, textWidth) : [];
        const requiredHeight = Math.max(17, 7 + (descLines.length * 3.5) + 3);

        if (currentY + requiredHeight > pageHeight - 16) {
          doc.addPage();
          drawSecondaryHeader();
        }

        // Render Photo Thumbnail (15mm x 15mm)
        const photoX = 12;
        const photoY = currentY - 1;
        const photoSize = 15;

        if (itemImgB64) {
          try {
            doc.addImage(itemImgB64, "JPEG", photoX, photoY, photoSize, photoSize);
            doc.setDrawColor(215, 187, 168);
            doc.setLineWidth(0.4);
            doc.rect(photoX, photoY, photoSize, photoSize, "S");
          } catch {
            // Fallback placeholder
            doc.setFillColor(232, 212, 195);
            doc.rect(photoX, photoY, photoSize, photoSize, "F");
            doc.setTextColor(132, 55, 71);
            doc.setFontSize(7);
            doc.text("📷", photoX + 5, photoY + 9);
          }
        } else {
          // Placeholder badge for items without custom photos
          doc.setFillColor(232, 212, 195);
          doc.rect(photoX, photoY, photoSize, photoSize, "F");
          doc.setDrawColor(215, 187, 168);
          doc.setLineWidth(0.3);
          doc.rect(photoX, photoY, photoSize, photoSize, "S");

          doc.setTextColor(132, 55, 71);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          const initials = item.name.substring(0, 2).toUpperCase();
          doc.text(initials, photoX + 5, photoY + 9.5);
        }

        // Product Name (Cacao #332424)
        doc.setTextColor(51, 36, 36);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);

        let displayName = item.name;
        if (item.isOffer) displayName += "  [OFERTA DEL DÍA]";
        else if (item.tags && item.tags.length > 0) displayName += `  [${item.tags[0].toUpperCase()}]`;

        doc.text(displayName, textStartX, currentY + 3);

        // Price (Right aligned in Bordó #843747)
        doc.setTextColor(132, 55, 71);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.text(priceStr, pageWidth - 14, currentY + 3, { align: "right" });

        // Description (Subtitle #6F5A55)
        if (descLines.length > 0) {
          doc.setTextColor(111, 90, 85);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7.8);
          doc.text(descLines, textStartX, currentY + 7.5);
          currentY += Math.max(17, 7.5 + (descLines.length * 3.5));
        } else {
          currentY += 17;
        }

        // Dotted separator line between items
        doc.setDrawColor(215, 187, 168);
        doc.setLineWidth(0.15);
        doc.line(12, currentY - 1, pageWidth - 14, currentY - 1);
        currentY += 3.5;
      });

      currentY += 3;
    });

    // Footers on all pages (with page count and QR reminder)
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Bottom Footer Bar (Bordó #843747)
      doc.setFillColor(132, 55, 71);
      doc.rect(0, pageHeight - 10, pageWidth, 10, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("CASTAÑO — RESTO BAR • Constitución 944, Río Cuarto • Tel: 358 5042311 • Carta Digital Online", 12, pageHeight - 4);

      doc.setTextColor(243, 231, 219);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 12, pageHeight - 4, { align: "right" });
    }

    // Save PDF output
    doc.save("Carta_Oficial_Castano.pdf");
  }
}
