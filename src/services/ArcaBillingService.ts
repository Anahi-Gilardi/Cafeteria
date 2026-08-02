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
    const invoiceType: "A" | "B" | "C" = customer.invoiceTypeChoice
      ? customer.invoiceTypeChoice
      : customer.ivaCondition === "Responsable Inscripto"
        ? "A"
        : "B";

    const draftNumber = "BORRADOR-" + order.id.slice(-6).toUpperCase();

    return {
      invoiceType,
      invoiceNumber: draftNumber,
      cae: "SIN_AUTORIZACION_FISCAL",
      caeExpiration: "-",
      neto: 0,
      iva21: 0,
      iva105: 0,
      customerCuit: cleanCuit || "00000000",
      customerName: customer.nameOrReason || "Consumidor Final",
      qrCodeUrl: "",
      status: "draft",
      errors: ["Clasificación fiscal y autorización ARCA pendientes."]
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
