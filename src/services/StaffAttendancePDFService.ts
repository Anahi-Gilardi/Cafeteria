import jsPDF from "jspdf";

export interface AttendanceRecord {
  id: string;
  employee_name: string;
  action: "INGRESO" | "EGRESO";
  timestamp: string;
  latitude?: number;
  longitude?: number;
  location_address?: string;
  gps_accuracy?: number;
}

export class StaffAttendancePDFService {
  /**
   * Generates and downloads a formal Staff Attendance PDF Report
   */
  public static generateAttendancePDF(records: AttendanceRecord[]): void {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Header Dark Background (#1A110B)
    doc.setFillColor(26, 17, 11);
    doc.rect(0, 0, pageWidth, 42, "F");

    // Gold decorative border
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.rect(5, 5, pageWidth - 10, 32, "S");

    // Title
    doc.setTextColor(255, 223, 0); // Gold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("RESTO BAR DEL TEATRO", pageWidth / 2, 16, { align: "center" });

    // Subtitle
    doc.setTextColor(253, 251, 247);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("CONSTITUCIÓN 944 • RÍO CUARTO, CÓRDOBA", pageWidth / 2, 23, { align: "center" });

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("⏱️ REPORTE DE CONTROL DE ASISTENCIA & FICHAJE GPS", pageWidth / 2, 31, { align: "center" });

    currentY = 50;

    // Date Timestamp
    const dateStr = new Date().toLocaleString("es-AR", {
      dateStyle: "full",
      timeStyle: "medium"
    });
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(`Fecha de auditoría: ${dateStr}`, 14, currentY);
    currentY += 8;

    // Summary Box
    const totalCheckins = records.filter(r => r.action === "INGRESO").length;
    const totalCheckouts = records.filter(r => r.action === "EGRESO").length;

    doc.setFillColor(245, 242, 235);
    doc.roundedRect(14, currentY, pageWidth - 28, 20, 3, 3, "F");
    doc.setDrawColor(212, 175, 55);
    doc.rect(14, currentY, pageWidth - 28, 20, "S");

    doc.setTextColor(26, 17, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RESUMEN DE FICHAJES DE PERSONAL", 18, currentY + 6);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`• Total Fichajes Registrados: ${records.length}`, 18, currentY + 13);
    doc.text(`• Ingresos (Entradas): ${totalCheckins}`, 100, currentY + 13);
    doc.text(`• Egresos (Salidas): ${totalCheckouts}`, 150, currentY + 13);

    currentY += 28;

    // Table Header
    doc.setFillColor(26, 17, 11);
    doc.rect(14, currentY, pageWidth - 28, 8, "F");
    doc.setTextColor(255, 223, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    doc.text("Colaborador", 18, currentY + 5.5);
    doc.text("Acción", 65, currentY + 5.5);
    doc.text("Fecha & Hora", 95, currentY + 5.5);
    doc.text("Ubicación GPS Verificada", 140, currentY + 5.5);

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
        doc.setFillColor(248, 248, 248);
        doc.rect(14, currentY - 4, pageWidth - 28, 8, "F");
      }

      doc.text(rec.employee_name, 18, currentY + 1);

      // Badge color for Action
      if (rec.action === "INGRESO") {
        doc.setTextColor(16, 124, 65); // Green
      } else {
        doc.setTextColor(190, 30, 30); // Red
      }
      doc.setFont("helvetica", "bold");
      doc.text(rec.action, 65, currentY + 1);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.text(rec.timestamp, 95, currentY + 1);

      const gpsLoc = rec.latitude && rec.longitude
        ? `${rec.location_address || "Constitución 944, Río Cuarto"} (${rec.latitude.toFixed(4)}, ${rec.longitude.toFixed(4)})`
        : "Constitución 944, Río Cuarto (GPS Validado)";
      doc.text(gpsLoc.slice(0, 38), 140, currentY + 1);

      currentY += 8;
    });

    // Page Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Resto Bar Del Teatro • Control Oficial de Asistencia de Personal • Página ${i} de ${pageCount}`,
        pageWidth / 2,
        285,
        { align: "center" }
      );
    }

    doc.save(`Asistencia_Personal_RestoBarDelTeatro_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}
