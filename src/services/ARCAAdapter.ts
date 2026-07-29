/**
 * ARCA (Agencia de Recaudación y Control Aduanero - ex-AFIP) Official Electronic Invoicing Adapter
 * Connects POS frontend to secure WSAA + WSFEV1 / WSMTXCA Backend Edge Functions.
 * Issuer identity is supplied and cross-checked by the backend.
 */

import { supabase } from "../lib/supabase";
import { Order } from "../types";

export type ARCAEnvironment = "homologation" | "production";
export type FiscalStatus = "draft" | "authorizing" | "authorized" | "observed" | "rejected" | "uncertain";

export interface ARCARequestPayload {
  orderId: string;
  invoiceType: "A" | "B" | "C";
  customerCuitDni: string;
  customerName: string;
  idempotencyKey: string;
}

export interface ARCAResponse {
  success: boolean;
  status: FiscalStatus;
  cae?: string;
  caeExpiration?: string;
  invoiceNumber?: string;
  qrCodeUrl?: string;
  issuerCuit?: string;
  issuerName?: string;
  issuerAddress?: string;
  observations?: string[];
  errors?: string[];
  environment?: ARCAEnvironment;
}

export class ARCAAdapter {
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
      const bytes = new TextEncoder().encode(JSON.stringify(data));
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const base64Data = btoa(binary);
      return `https://www.arca.gob.ar/fe/qr/?p=${base64Data}`;
    } catch (e) {
      console.error("Error building ARCA QR Base64:", e);
      return "";
    }
  }

  /**
   * Requests real CAE fiscal authorization via secure Backend Edge Function.
   * If backend is not reached or credentials are not yet configured, returns a safe draft state.
   */
  public static async authorizeInvoice(
    order: Order,
    customerCuitDni: string,
    customerName: string,
    invoiceType: "A" | "B" | "C"
  ): Promise<ARCAResponse> {
    const cleanDoc = customerCuitDni.replace(/\D/g, "");
    const idempotencyKey = `fiscal:${order.id}:${invoiceType}:${cleanDoc || "0"}`;

    const payload: ARCARequestPayload = {
      orderId: order.id,
      invoiceType,
      customerCuitDni: cleanDoc,
      customerName: customerName.trim() || "Consumidor Final",
      idempotencyKey
    };

    try {
      const { data, error } = await supabase.functions.invoke<ARCAResponse>("arca-authorize", {
        body: payload
      });
      if (error || !data) {
        return {
          success: false,
          status: "uncertain",
          errors: [error?.message || "El backend fiscal no devolvió una respuesta verificable."]
        };
      }
      return data;
    } catch (error) {
      return {
        success: false,
        status: "uncertain",
        errors: [error instanceof Error ? error.message : "Error de red desconocido."]
      };
    }
  }
}

export const arcaAdapter = ARCAAdapter;
