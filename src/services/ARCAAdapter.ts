/**
 * ARCA (Agencia de Recaudación y Control Aduanero - ex-AFIP) Official Electronic Invoicing Adapter
 * Connects POS frontend to secure WSAA + WSFEV1 / WSMTXCA Backend Edge Functions.
 * Resto Bar Del Teatro - Constitución 944, Río Cuarto (Córdoba) - CUIT: 30-71234567-8
 */

import { Order, FiscalDetails } from "../types";

export type ARCAEnvironment = "homologation" | "production";
export type FiscalStatus = "draft" | "authorizing" | "authorized" | "observed" | "rejected" | "uncertain";

export interface ARCARequestPayload {
  environment: ARCAEnvironment;
  cuitEmisor: string;
  ptoVta: number;
  tipoCmp: number; // 1 = Factura A, 6 = Factura B, 11 = Factura C
  concepto: number; // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios
  tipoDocRec: number; // 80 = CUIT, 96 = DNI, 99 = Consumidor Final
  nroDocRec: number;
  importeTotal: number;
  importeNeto: number;
  importeIVA: number;
  idempotencyKey: string;
}

export interface ARCAResponse {
  success: boolean;
  status: FiscalStatus;
  cae?: string;
  caeExpiration?: string;
  invoiceNumber?: string;
  qrCodeUrl?: string;
  observations?: string[];
  errors?: string[];
  rawResponse?: any;
}

export class ARCAAdapter {
  private static readonly CUIT_EMISOR = "30712345678";
  private static readonly PTO_VTA = 5;
  private static environment: ARCAEnvironment = "homologation";

  /**
   * Configures environment mode (homologation or production)
   */
  public static setEnvironment(env: ARCAEnvironment): void {
    this.environment = env;
  }

  /**
   * Generates Official ARCA QR URL (Version 1 Specification)
   */
  public static generateOfficialArcaQR(data: {
    ver: number;
    fecha: string;
    cuit: number;
    ptoVta: number;
    tipoCmp: number;
    nroCmp: number;
    importe: number;
    moneda: string;
    ctz: number;
    tipoDocRec: number;
    nroDocRec: number;
    tipoCodAut: "E" | "A"; // E = CAE, A = CAEA
    codAut: number;
  }): string {
    try {
      const jsonStr = JSON.stringify(data);
      const base64Data = btoa(jsonStr);
      // Official ARCA URL (ex-AFIP)
      return `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`;
    } catch (e) {
      console.error("Error building ARCA QR Base64:", e);
      return "";
    }
  }

  /**
   * Requests real CAE fiscal authorization via secure Backend Edge Function.
   * If backend is not reached or credentials are not yet configured, returns a safe draft state.
   */
  public static async authorizeInvoice(order: Order, customerCuitDni: string, customerName: string, invoiceType: "A" | "B" | "C"): Promise<ARCAResponse> {
    const cleanDoc = customerCuitDni.replace(/\D/g, "");
    const idempotencyKey = `inv-${order.id}-${Date.now()}`;

    const payload: ARCARequestPayload = {
      environment: this.environment,
      cuitEmisor: this.CUIT_EMISOR,
      ptoVta: this.PTO_VTA,
      tipoCmp: invoiceType === "A" ? 1 : invoiceType === "B" ? 6 : 11,
      concepto: 1, // Productos
      tipoDocRec: cleanDoc.length === 11 ? 80 : cleanDoc.length === 8 ? 96 : 99,
      nroDocRec: cleanDoc ? parseInt(cleanDoc) : 0,
      importeTotal: order.total,
      importeNeto: parseFloat((order.total / 1.21).toFixed(2)),
      importeIVA: parseFloat((order.total - order.total / 1.21).toFixed(2)),
      idempotencyKey
    };

    // Attempt to invoke backend edge function if configured
    try {
      const response = await fetch("/api/arca/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const resData: ARCAResponse = await response.json();
        return resData;
      }
    } catch (e) {
      // Backend not yet reachable in current environment
    }

    // Safe Fallback: Return draft state with clear indication that backend WSAA authorization is pending
    return {
      success: false,
      status: "draft",
      invoiceNumber: `00005-BORRADOR-${order.id.slice(-6).toUpperCase()}`,
      observations: [
        "El comprobante se generó como Borrador No Fiscal.",
        "La autorización WSAA/WSFEV1 requiere configurar los certificados digitales ARCA (.crt y .key) en las variables de entorno del servidor Backend."
      ]
    };
  }
}

export const arcaAdapter = ARCAAdapter;
