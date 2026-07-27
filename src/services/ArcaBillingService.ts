import { FiscalDetails, Order } from "../types";

export interface FiscalCustomerInfo {
  cuitOrDni: string;
  nameOrReason: string;
  ivaCondition: "Consumidor Final" | "Responsable Inscripto" | "Monotributo" | "Exento";
  invoiceTypeChoice?: "A" | "B" | "C";
}

export class ArcaBillingService {
  /**
   * Validates CUIT format using official Modulo 11 verification algorithm or DNI (8 digits)
   */
  public static validateCuitOrDni(input: string): { isValid: boolean; message: string } {
    const clean = input.replace(/\D/g, "");
    if (!clean) {
      return { isValid: false, message: "El CUIT/DNI no puede estar vacío." };
    }

    if (clean.length === 8) {
      return { isValid: true, message: "DNI válido (Consumidor Final)." };
    }

    if (clean.length === 11) {
      // Validate CUIT Modulo 11
      const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(clean[i]) * multipliers[i];
      }
      const remainder = sum % 11;
      let checkDigit = 11 - remainder;
      if (checkDigit === 11) checkDigit = 0;
      if (checkDigit === 10) checkDigit = 9;

      if (checkDigit !== parseInt(clean[10])) {
        return { isValid: false, message: "El CUIT ingresado no es válido (dígito verificador incorrecto)." };
      }
      return { isValid: true, message: "CUIT verificado correctamente." };
    }

    return { isValid: false, message: "El documento debe tener 8 dígitos (DNI) o 11 dígitos (CUIT)." };
  }

  /**
   * Generates a non-fiscal draft preview of the invoice.
   * REAL fiscal invoices with CAE/CAEA are requested exclusively via Backend Edge Functions.
   */
  public static generateDraftInvoice(order: Order, customer: FiscalCustomerInfo): FiscalDetails {
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

    const ptoVta = "00005";
    const draftNumber = "BORRADOR-" + order.id.slice(-6).toUpperCase();

    // Compute Tax Breakdown (Neto vs IVA 21% incluido)
    const total = order.total;
    const neto = parseFloat((total / 1.21).toFixed(2));
    const iva21 = parseFloat((total - neto).toFixed(2));

    return {
      invoiceType,
      invoiceNumber: `${ptoVta}-${draftNumber}`,
      cae: "SIN_AUTORIZACION_FISCAL",
      caeExpiration: "-",
      neto,
      iva21,
      iva105: 0,
      customerCuit: cleanCuit || "00000000",
      customerName: customer.nameOrReason || "Consumidor Final",
      qrCodeUrl: "" // No QR code generated without real ARCA authorization
    };
  }

  /**
   * Legacy adapter for backward compatibility.
   * Explicitly marks non-fiscal receipts as drafts until WSAA/WSMTXCA backend integration.
   */
  public static generateArcaInvoice(order: Order, customer: FiscalCustomerInfo): FiscalDetails {
    return this.generateDraftInvoice(order, customer);
  }
}
