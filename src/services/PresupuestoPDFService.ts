import jsPDF from "jspdf";

export class PresupuestoPDFService {
  /**
   * Generates and downloads a complete commercial quotation PDF for Resto Bar Del Teatro
   */
  public static generatePresupuestoPDF(): void {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 0;

    // --- PAGE 1: PORTADA Y RESUMEN EJECUTIVO ---

    // Top Header Banner (Dark Chocolate & Gold)
    doc.setFillColor(26, 17, 11); // #1A110B
    doc.rect(0, 0, pageWidth, 48, "F");

    // Decorative Gold Line
    doc.setDrawColor(212, 175, 55); // #D4AF37
    doc.setLineWidth(1);
    doc.rect(6, 6, pageWidth - 12, 36, "S");

    doc.setTextColor(255, 223, 0); // #FFDF00
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PRESUPUESTO TÉCNICO & COMERCIAL", pageWidth / 2, 18, { align: "center" });

    doc.setTextColor(253, 251, 247);
    doc.setFontSize(12);
    doc.text("SISTEMA INTEGRAL DE GESTIÓN GASTRO — CASTAÑO", pageWidth / 2, 26, { align: "center" });

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("DESARROLLO DE SOFTWARE ERP/POS & CARTA DIGITAL EN LA NUBE", pageWidth / 2, 34, { align: "center" });

    doc.setTextColor(200, 190, 180);
    doc.setFontSize(8);
    doc.text("Cliente: Resto Bar Del Teatro (Constitucion 944, Rio Cuarto) • Fecha: 27 de Julio de 2026", pageWidth / 2, 40, { align: "center" });

    currentY = 56;

    // Section 1: Executive Summary Box
    doc.setFillColor(250, 248, 245);
    doc.rect(10, currentY, pageWidth - 20, 28, "F");
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.4);
    doc.rect(10, currentY, pageWidth - 20, 28, "S");

    doc.setTextColor(26, 17, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("1. RESUMEN EJECUTIVO DE LA SOLUCIÓN", 14, currentY + 7);

    doc.setTextColor(60, 50, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const summaryText = "El presente documento detalla la propuesta comercial y tecnica para la implantacion del Sistema Integral de Gestion Gastronomica ERP/POS y Carta Digital del establecimiento Resto Bar Del Teatro. La plataforma ofrece una arquitectura moderna, multiusuario, responsiva y conectada en tiempo real mediante infraestructura Supabase PostgreSQL y servidores Vercel.";
    const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 28);
    doc.text(splitSummary, 14, currentY + 13);

    currentY += 34;

    // Section 2: Detailed Modules Breakdown
    doc.setFillColor(42, 27, 18);
    doc.rect(10, currentY, pageWidth - 20, 8, "F");
    doc.setTextColor(255, 223, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. ALCANCE Y MÓDULOS INCLUIDOS EN EL SISTEMA", 14, currentY + 5.5);

    currentY += 12;

    const modules = [
      {
        title: "a) Modulo Mozo / POS de Comandas",
        desc: "Toma de pedidos por salon, retiro y delivery. Calculo dinámico, notas especiales, division de cuenta por comensales o articulos y llamado digital de mozos."
      },
      {
        title: "b) KDS Cocina & Chef Display",
        desc: "Pantalla interactiva en vivo segmentada por estaciones (Parrilla, Barista, Cocina Caliente, Tragos). Control de tiempos y estados de preparacion."
      },
      {
        title: "c) Caja, Facturación & Adaptador ARCA",
        desc: "Arqueos de caja X/Z, registro de pagos (efectivo, MP, tarjetas, cta cte), emision de pretickets no fiscales e integracion fiscal ARCA con QR Versión 1."
      },
      {
        title: "d) Mapa de Salon Interactivo & Reservas",
        desc: "Vista en tiempo real del estado de mesas (libre, ocupada, reservada). Formulario publico con seleccion de turnos, capacidad y horario con validacion estricta."
      },
      {
        title: "e) Stock, Insumos & Auditoria a Ciegas",
        desc: "Gestion de inventario con alertas purpura para insumos vencidos, recetas vinculadas, control de minimos, historial de mermas y auditoria a ciegas."
      },
      {
        title: "f) Dashboard & Analítica Financiera",
        desc: "Estadisticas de ventas diarias, plato mas vendido, volumen por canal, costos de mermas, profit-sharing y reportes descargables en PDF."
      },
      {
        title: "g) Carta Digital QR & Portada Publicitaria",
        desc: "Landing page publica responsiva 390px, menu interactivo QR para smartphones con llamada al mozo, filtros sin acentos y generador de Carta PDF oficial."
      },
      {
        title: "h) Personal, Fichaje Biométrico & Propinas",
        desc: "Control de asistencia con reloj biologico/biometrico, calculo de promedios semanales, distribucion de propinas y perfiles calibrados por rol."
      },
      {
        title: "i) Seguridad, RLS & Perfiles RBAC",
        desc: "Autenticacion segura con contraseñas encriptadas, permisos por roles (Dueño, Admin, Barista, Mesero) y migraciones PostgreSQL con Row Level Security (RLS)."
      }
    ];

    modules.forEach((mod) => {
      if (currentY + 16 > pageHeight - 20) {
        doc.addPage();
        // Page 2 header
        doc.setFillColor(26, 17, 11);
        doc.rect(0, 0, pageWidth, 14, "F");
        doc.setTextColor(255, 223, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("RESTO BAR DEL TEATRO — PRESUPUESTO COMERCIAL", 12, 9.5);
        doc.setDrawColor(212, 175, 55);
        doc.line(0, 14, pageWidth, 14);
        currentY = 20;
      }

      doc.setTextColor(153, 101, 21); // Gold dark
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(mod.title, 14, currentY);

      doc.setTextColor(70, 60, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const splitDesc = doc.splitTextToSize(mod.desc, pageWidth - 28);
      doc.text(splitDesc, 14, currentY + 4);

      currentY += 4 + (splitDesc.length * 3.5) + 2;
    });

    // --- PAGE OVERFLOW CHECK FOR FINANCIAL SECTION ---
    if (currentY + 75 > pageHeight - 25) {
      doc.addPage();
      doc.setFillColor(26, 17, 11);
      doc.rect(0, 0, pageWidth, 14, "F");
      doc.setTextColor(255, 223, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("RESTO BAR DEL TEATRO — PROPUESTA ECONÓMICA", 12, 9.5);
      doc.setDrawColor(212, 175, 55);
      doc.line(0, 14, pageWidth, 14);
      currentY = 20;
    } else {
      currentY += 4;
    }

    // Section 3: Commercial Proposal & Payment Terms
    doc.setFillColor(42, 27, 18);
    doc.rect(10, currentY, pageWidth - 20, 8, "F");
    doc.setTextColor(255, 223, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("3. PROPUESTA ECONÓMICA & PLANES DE PAGO", 14, currentY + 5.5);

    currentY += 12;

    // Option A: Contado
    doc.setFillColor(255, 253, 245);
    doc.rect(10, currentY, (pageWidth - 24) / 2, 40, "F");
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.6);
    doc.rect(10, currentY, (pageWidth - 24) / 2, 40, "S");

    doc.setTextColor(26, 17, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("OPCIÓN 1: PAGO CONTADO", 14, currentY + 6);

    doc.setTextColor(153, 101, 21);
    doc.setFontSize(13);
    doc.text("$ 2.000.000 ARS", 14, currentY + 14);

    doc.setTextColor(80, 70, 65);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("• Unico pago de contado por la propiedad", 14, currentY + 21);
    doc.text("  e implementacion del sistema completo.", 14, currentY + 25);
    doc.text("• Mantenimiento Mensual: $150.000 ARS/mes", 14, currentY + 31);
    doc.text("  (Hosting, backups, soporte y Supabase).", 14, currentY + 35);

    // Option B: 12 Cuotas
    const rightColX = 14 + (pageWidth - 24) / 2 + 2;
    doc.setFillColor(255, 253, 245);
    doc.rect(rightColX - 4, currentY, (pageWidth - 24) / 2, 40, "F");
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.6);
    doc.rect(rightColX - 4, currentY, (pageWidth - 24) / 2, 40, "S");

    doc.setTextColor(26, 17, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("OPCIÓN 2: 12 CUOTAS FIJAS", rightColX, currentY + 6);

    doc.setTextColor(153, 101, 21);
    doc.setFontSize(13);
    doc.text("12x $ 200.000 ARS", rightColX, currentY + 14);

    doc.setTextColor(80, 70, 65);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("• Financiacion en 12 cuotas fijas mensuales", rightColX, currentY + 21);
    doc.text("  de $200.000 ARS por el desarrollo.", rightColX, currentY + 25);
    doc.text("• Mantenimiento Mensual: $150.000 ARS/mes", rightColX, currentY + 31);
    doc.text("• Total mensual abonado: $350.000 ARS/mes", rightColX, currentY + 35);

    currentY += 46;

    // Section 4: Maintenance & SLA Services
    doc.setFillColor(245, 242, 235);
    doc.rect(10, currentY, pageWidth - 20, 22, "F");
    doc.setDrawColor(200, 180, 160);
    doc.setLineWidth(0.3);
    doc.rect(10, currentY, pageWidth - 20, 22, "S");

    doc.setTextColor(26, 17, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("SERVICIOS INCLUIDOS EN EL MANTENIMIENTO ($150.000 ARS/MES):", 14, currentY + 5.5);

    doc.setTextColor(70, 60, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("1. Infraestructura Cloud Supabase PostgreSQL con copias de seguridad diarias automatizadas.", 14, currentY + 10.5);
    doc.text("2. Despliegue continuo en Vercel con certificado SSL de alta seguridad y dominio personalizado.", 14, currentY + 14.5);
    doc.text("3. Soporte tecnico prioritario via WhatsApp/telefono y actualizaciones de seguridad preventivas.", 14, currentY + 18.5);

    currentY += 28;

    // Section 5: Acceptance Signatures
    if (currentY + 28 > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }

    doc.setDrawColor(180, 160, 140);
    doc.setLineWidth(0.4);

    // Signature 1
    doc.line(20, currentY + 14, 85, currentY + 14);
    doc.setTextColor(60, 50, 45);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Resto Bar Del Teatro", 52.5, currentY + 18, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Firma de Conformidad Cliente", 52.5, currentY + 22, { align: "center" });

    // Signature 2
    doc.line(pageWidth - 85, currentY + 14, pageWidth - 20, currentY + 14);
    doc.setFont("helvetica", "bold");
    doc.text("Equipo de Desarrollo de Software", pageWidth - 52.5, currentY + 18, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Firma Responsable Técnico", pageWidth - 52.5, currentY + 22, { align: "center" });

    // Footers on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(26, 17, 11);
      doc.rect(0, pageHeight - 10, pageWidth, 10, "F");

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("CASTAÑO — RESTO BAR • Presupuesto de Software ERP/POS • Rio Cuarto, Cordoba", 12, pageHeight - 4);

      doc.setTextColor(253, 251, 247);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 12, pageHeight - 4, { align: "right" });
    }

    // Save document
    doc.save("Presupuesto_Sistema_Castano.pdf");
  }
}
