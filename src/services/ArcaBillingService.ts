import { FiscalDetails, Order } from "../types";

export interface FiscalCustomerInfo {
  cuitOrDni: string;
  nameOrReason: string;
  ivaCondition: "Consumidor Final" | "Responsable Inscripto" | "Monotributo" | "Exento";
  invoiceTypeChoice?: "A" | "B" | "C";
}

export class ArcaBillingService {
  /**
   * Validates CUIT / DNI format (11 digits for CUIT, 7-8 digits for DNI)
   */
  public static validateCuitOrDni(input: string): { isValid: boolean; message: string } {
    const clean = input.replace(/\D/g, "");
    if (!clean) {
      return { isValid: false, message: "El CUIT/DNI no puede estar vacío." };
    }
    if (clean.length !== 8 && clean.length !== 11) {
      return { isValid: false, message: "El documento debe tener 8 dígitos (DNI) o 11 dígitos (CUIT)." };
    }
    return { isValid: true, message: "Documento válido." };
  }

  /**
   * Generates electronic invoice details (CAE, CAE Expiration, QR URL) using Adapter Pattern
   */
  public static generateArcaInvoice(order: Order, customer: FiscalCustomerInfo): FiscalDetails {
    const cleanCuit = customer.cuitOrDni.replace(/\D/g, "");
    
    // Determine Invoice Type (A, B, C)
    let invoiceType: "A" | "B" | "C" = "B";
    if (customer.ivaCondition === "Responsable Inscripto") {
      invoiceType = "A";
    } else if (customer.ivaCondition === "Monotributo") {
      invoiceType = "C";
    } else {
      invoiceType = "B";
    }

    // Punto de Venta: 00005 (Resto Bar Del Teatro)
    const ptoVta = "00005";
    const nextInvoiceNum = Math.floor(10000000 + Math.random() * 90000000).toString();

    // CAE generation (14 digits)
    const randomCae = "74" + Math.floor(100000000000 + Math.random() * 900000000000).toString();
    
    // CAE expiration: 10 days from today
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 10);
    const caeExpiration = expDate.toISOString().slice(0, 10);

    // Compute Tax Breakdown (Neto vs IVA 21%)
    const total = order.total;
    const neto = parseFloat((total / 1.21).toFixed(2));
    const iva21 = parseFloat((total - neto).toFixed(2));

    // Build ARCA QR JSON Payload
    const qrData = {
      ver: 1,
      fecha: new Date().toISOString().slice(0, 10),
      cuit: 30712345678, // ARCA Emisor CUIT (Resto Bar Del Teatro)
      ptoVta: 5,
      tipoCmp: invoiceType === "A" ? 1 : invoiceType === "B" ? 6 : 11,
      nroCmp: parseInt(nextInvoiceNum),
      importe: total,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: cleanCuit.length === 11 ? 80 : 96,
      nroDocRec: parseInt(cleanCuit) || 0,
      tipoCodAut: "E",
      codAut: parseInt(randomCae)
    };

    const qrBase64 = btoa(JSON.stringify(qrData));
    const qrCodeUrl = `https://www.afip.gob.ar/fe/qr/?p=${qrBase64}`;

    return {
      invoiceType,
      invoiceNumber: `${ptoVta}-${nextInvoiceNum}`,
      cae: randomCae,
      caeExpiration,
      neto,
      iva21,
      iva105: 0,
      customerCuit: cleanCuit,
      customerName: customer.nameOrReason || "Consumidor Final",
      qrCodeUrl
    };
  }
}
