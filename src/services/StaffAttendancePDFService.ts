import jsPDF from "jspdf";

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
   * Generates and downloads a formal Staff Attendance PDF Report for CASTAÑO
   */
  public static generateAttendancePDF(records: AttendanceRecord[]): void {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 15;

      // Header Dark Burgundy (#2D0E13)
      doc.setFillColor(45, 14, 19);
      doc.rect(0, 0, pageWidth, 42, "F");

      // Gold decorative border
      doc.setDrawColor(207, 181, 160);
      doc.setLineWidth(0.8);
      doc.rect(5, 5, pageWidth - 10, 32, "S");

      // Title: CASTAÑO
      doc.setTextColor(235, 218, 197); // Cream/Gold
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("CASTAÑO — Resto Bar Café", pageWidth / 2, 16, { align: "center" });

      // Subtitle
      doc.setTextColor(207, 181, 160);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Constitución 944 • Río Cuarto, Córdoba", pageWidth / 2, 23, { align: "center" });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Historial de Asistencia y Turnos GPS", pageWidth / 2, 31, { align: "center" });

      currentY = 50;

      // Date Timestamp
      const dateStr = new Date().toLocaleString("es-AR", {
        dateStyle: "full",
        timeStyle: "medium"
      });
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text(`Fecha de emisión del reporte: ${dateStr}`, 14, currentY);
      currentY += 8;

      // Summary Box
      const totalCheckins = records.filter(r => r.action === "INGRESO").length;
      const totalCheckouts = records.filter(r => r.action === "EGRESO").length;

      doc.setFillColor(250, 242, 230);
      doc.roundedRect(14, currentY, pageWidth - 28, 20, 3, 3, "F");
      doc.setDrawColor(207, 181, 160);
      doc.rect(14, currentY, pageWidth - 28, 20, "S");

      doc.setTextColor(92, 29, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("RESUMEN GENERAL DE REGISTROS", 18, currentY + 6);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`• Total Fichajes: ${records.length}`, 18, currentY + 13);
      doc.text(`• Ingresos (Entradas): ${totalCheckins}`, 95, currentY + 13);
      doc.text(`• Egresos (Salidas): ${totalCheckouts}`, 150, currentY + 13);

      currentY += 28;

      // Table Header
      doc.setFillColor(92, 29, 39);
      doc.rect(14, currentY, pageWidth - 28, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);

      doc.text("Colaborador", 16, currentY + 5.5);
      doc.text("Rol", 52, currentY + 5.5);
      doc.text("Tipo", 75, currentY + 5.5);
      doc.text("Fecha y Hora", 96, currentY + 5.5);
      doc.text("Ubicación Calle", 132, currentY + 5.5);
      doc.text("Coordenadas GPS", 175, currentY + 5.5);

      currentY += 10;

      // Table Content Rows
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);

      records.forEach((rec, idx) => {
        if (currentY > 265) {
          doc.addPage();
          currentY = 20;
        }

        const isEven = idx % 2 === 0;
        if (isEven) {
          doc.setFillColor(248, 244, 238);
          doc.rect(14, currentY - 4, pageWidth - 28, 8, "F");
        }

        // Colaborador
        doc.text((rec.employee_name || "Colaborador").slice(0, 18), 16, currentY + 1);

        // Rol
        doc.text((rec.role || "Personal").slice(0, 12), 52, currentY + 1);

        // Tipo Badge
        if (rec.action === "INGRESO") {
          doc.setTextColor(46, 111, 64); // Green
        } else {
          doc.setTextColor(132, 55, 71); // Burgundy Red
        }
        doc.setFont("helvetica", "bold");
        doc.text(rec.action, 75, currentY + 1);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);

        // Fecha y Hora
        doc.text((rec.timestamp || "").slice(0, 19), 96, currentY + 1);

        // Dirección Calle
        const address = rec.location_address || "Constitución 944, Río Cuarto";
        doc.text(address.slice(0, 24), 132, currentY + 1);

        // Coordenadas GPS
        const coords = rec.latitude && rec.longitude
          ? `${rec.latitude.toFixed(4)}, ${rec.longitude.toFixed(4)}`
          : "-33.1245, -64.3490";
        doc.text(coords, 175, currentY + 1);

        currentY += 8;
      });

      // Page Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Castaño — Resto Bar Café • Historial de Asistencia y Turnos GPS • Página ${i} de ${pageCount}`,
          pageWidth / 2,
          285,
          { align: "center" }
        );
      }

      doc.save(`Castano_Control_Asistencia_GPS_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      throw new Error(`Error en la generación del PDF: ${err.message || err}`);
    }
  }
}
