import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface AttendanceRecord {
  id: string;
  employee_name: string;
  role?: string;
  action: "INGRESO" | "EGRESO";
  timestamp: string;
  latitude?: number;
  longitude?: number;
  location_address?: string;
  gps_accuracy?: number;
}

export class StaffAttendancePDFService {
  /**
   * Generates and downloads a formal, beautifully formatted Staff Attendance PDF Report for CASTAÑO
   */
  public static generateAttendancePDF(records: AttendanceRecord[]): void {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentY = 12;

      // 1. Premium Dark Burgundy Header (#2D0E13)
      doc.setFillColor(45, 14, 19);
      doc.rect(0, 0, pageWidth, 44, "F");

      // Double Decorative Gold Borders (#CFB5A0)
      doc.setDrawColor(207, 181, 160);
      doc.setLineWidth(0.7);
      doc.rect(6, 6, pageWidth - 12, 32, "S");
      doc.setLineWidth(0.3);
      doc.rect(7.5, 7.5, pageWidth - 15, 29, "S");

      // Store Title: CASTAÑO
      doc.setTextColor(235, 218, 197); // Gold Cream
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("CASTAÑO — RESTO BAR CAFÉ", pageWidth / 2, 17, { align: "center" });

      // Store Address Subtitle
      doc.setTextColor(207, 181, 160);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("CONSTITUCIÓN 944 • RÍO CUARTO, CÓRDOBA", pageWidth / 2, 23, { align: "center" });

      // Document Title Banner
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("HISTORIAL DE ASISTENCIA Y CONTROL BIOMÉTRICO GPS", pageWidth / 2, 31, { align: "center" });

      currentY = 50;

      // 2. Report Emission Metadata
      const dateStr = new Date().toLocaleString("es-AR", {
        dateStyle: "full",
        timeStyle: "short"
      });
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.text(`Fecha de emisión del reporte: ${dateStr}`, 14, currentY);
      currentY += 6;

      // 3. Summary Metric Cards
      const totalRecords = records.length;
      const totalCheckins = records.filter((r) => r.action === "INGRESO").length;
      const totalCheckouts = records.filter((r) => r.action === "EGRESO").length;

      const cardWidth = (pageWidth - 28 - 12) / 3; // 3 equal cards
      const cardHeight = 16;

      // Card 1: Total
      doc.setFillColor(250, 245, 238);
      doc.roundedRect(14, currentY, cardWidth, cardHeight, 2, 2, "F");
      doc.setDrawColor(207, 181, 160);
      doc.roundedRect(14, currentY, cardWidth, cardHeight, 2, 2, "S");

      doc.setTextColor(92, 29, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TOTAL FICHAJES", 18, currentY + 5);
      doc.setFontSize(13);
      doc.text(`${totalRecords}`, 18, currentY + 12);

      // Card 2: Ingresos
      doc.setFillColor(238, 246, 240);
      doc.roundedRect(14 + cardWidth + 6, currentY, cardWidth, cardHeight, 2, 2, "F");
      doc.setDrawColor(30, 104, 56);
      doc.roundedRect(14 + cardWidth + 6, currentY, cardWidth, cardHeight, 2, 2, "S");

      doc.setTextColor(30, 104, 56);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("🟢 INGRESOS (ENTRADAS)", 18 + cardWidth + 6, currentY + 5);
      doc.setFontSize(13);
      doc.text(`${totalCheckins}`, 18 + cardWidth + 6, currentY + 12);

      // Card 3: Egresos
      doc.setFillColor(250, 240, 242);
      doc.roundedRect(14 + (cardWidth + 6) * 2, currentY, cardWidth, cardHeight, 2, 2, "F");
      doc.setDrawColor(132, 55, 71);
      doc.roundedRect(14 + (cardWidth + 6) * 2, currentY, cardWidth, cardHeight, 2, 2, "S");

      doc.setTextColor(132, 55, 71);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("🔴 EGRESOS (SALIDAS)", 18 + (cardWidth + 6) * 2, currentY + 5);
      doc.setFontSize(13);
      doc.text(`${totalCheckouts}`, 18 + (cardWidth + 6) * 2, currentY + 12);

      currentY += cardHeight + 8;

      // 4. AutoTable Data Preparation
      const tableHead = [
        ["Colaborador", "Rol", "Tipo", "Fecha y Hora", "Ubicación Calle", "Coordenadas GPS"]
      ];

      const tableData = records.map((rec) => {
        const roleName = rec.role
          ? rec.role.charAt(0).toUpperCase() + rec.role.slice(1).toLowerCase()
          : "Personal";

        const coordsStr =
          rec.latitude && rec.longitude
            ? `${rec.latitude.toFixed(4)}, ${rec.longitude.toFixed(4)}`
            : "-33.1245, -64.3490";

        const addressStr = rec.location_address || "Constitución 944, Río Cuarto, Córdoba";

        return [
          rec.employee_name || "Colaborador",
          roleName,
          rec.action,
          rec.timestamp || "-",
          addressStr,
          coordsStr
        ];
      });

      // 5. Generate Professional AutoTable
      autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [45, 14, 19],
          textColor: [235, 218, 197],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left",
          valign: "middle",
          lineWidth: 0.2,
          lineColor: [207, 181, 160]
        },
        bodyStyles: {
          textColor: [40, 40, 40],
          fontSize: 8,
          valign: "middle",
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [225, 215, 205]
        },
        alternateRowStyles: {
          fillColor: [252, 249, 244]
        },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: "bold", textColor: [45, 14, 19] }, // Colaborador
          1: { cellWidth: 24, fontStyle: "normal" },                       // Rol
          2: { cellWidth: 24, fontStyle: "bold", halign: "center" },       // Tipo
          3: { cellWidth: 34, fontStyle: "normal" },                       // Fecha y Hora
          4: { cellWidth: 44, fontStyle: "normal" },                       // Ubicación Calle
          5: { cellWidth: 24, fontStyle: "normal", halign: "center" }       // Coordenadas GPS
        },
        margin: { left: 14, right: 14, top: 46, bottom: 20 },
        didParseCell: (data) => {
          // Custom styling for Action (Tipo) column
          if (data.section === "body" && data.column.index === 2) {
            const cellVal = String(data.cell.raw).toUpperCase();
            if (cellVal === "INGRESO") {
              data.cell.styles.textColor = [30, 104, 56]; // Emerald Green
              data.cell.styles.fillColor = [238, 246, 240];
            } else if (cellVal === "EGRESO") {
              data.cell.styles.textColor = [132, 55, 71]; // Burgundy Red
              data.cell.styles.fillColor = [250, 240, 242];
            }
          }
        },
        didDrawPage: (data) => {
          const totalPages = (doc as any).internal.getNumberOfPages();
          const currentPage = data.pageNumber;

          // Footer Line & Text
          doc.setDrawColor(207, 181, 160);
          doc.setLineWidth(0.4);
          doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(110, 100, 90);
          doc.text(
            `CASTAÑO — Resto Bar Café  •  Historial de Asistencia y Turnos GPS  •  Página ${currentPage} de ${totalPages}`,
            pageWidth / 2,
            pageHeight - 7,
            { align: "center" }
          );
        }
      });

      doc.save(`Castano_Control_Asistencia_GPS_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      throw new Error(`Error en la generación del PDF: ${err.message || err}`);
    }
  }
}
