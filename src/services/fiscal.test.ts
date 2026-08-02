import { describe, expect, it } from "vitest";
import { ARCAAdapter } from "./ARCAAdapter";
import { ArcaBillingService } from "./ArcaBillingService";
import { BillingAdapter } from "./BillingAdapter";
import { AuthService } from "./AuthService";
import { isAuthorizedFiscalDetails } from "./ReceiptPDFService";
import type { Order } from "../types";

const order: Order = {
  id: "PED-TEST-1",
  items: [
    {
      itemId: "arg-cafecito-jarrito",
      name: "Café",
      quantity: 1,
      price: 1210,
      customizationSummary: ""
    }
  ],
  subtotal: 1210,
  tax: 210,
  total: 1210,
  type: "Mesa",
  priceList: "Salon",
  status: "Completado",
  createdAt: "2026-07-29T12:00:00.000Z",
  estimatedMinutes: 0
};

describe("fiscal safety", () => {
  it("creates only an explicitly non-fiscal draft locally", () => {
    const fiscal = ArcaBillingService.generateDraftInvoice(order, {
      cuitOrDni: "30123456780",
      nameOrReason: "Cliente de prueba",
      ivaCondition: "Responsable Inscripto"
    });
    expect(fiscal.cae).toBe("SIN_AUTORIZACION_FISCAL");
    expect(fiscal.qrCodeUrl).toBe("");
    expect(fiscal.invoiceNumber).toMatch(/^BORRADOR-/);
    expect(fiscal.invoiceNumber).not.toContain("00005");
  });

  it("builds an official ARCA v1 QR URL only from supplied authorization data", () => {
    const url = ARCAAdapter.generateOfficialArcaQR({
      ver: 1,
      fecha: "2026-07-29",
      cuit: 30712345678,
      ptoVta: 5,
      tipoCmp: 6,
      nroCmp: 123,
      importe: 1210,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: 96,
      nroDocRec: 12345678,
      tipoCodAut: "E",
      codAut: 74123456789012
    });
    expect(url).toMatch(/^https:\/\/www\.arca\.gob\.ar\/fe\/qr\/\?p=/);
  });

  it("calculates the ARCA payload totals consistently", () => {
    const payload = BillingAdapter.buildARCAPayload(
      order,
      "Factura B",
      "12345678"
    );
    expect(payload.impTotal).toBe(1210);
    expect(payload.impNeto + payload.impIVA).toBe(1210);
    expect(payload.docTipo).toBe(96);
  });

  it("validates DNI and rejects malformed documents", () => {
    expect(ArcaBillingService.validateCuitOrDni("12.345.678").isValid).toBe(true);
    expect(ArcaBillingService.validateCuitOrDni("123").isValid).toBe(false);
  });

  it("does not choose Factura C from the recipient condition", () => {
    const fiscal = ArcaBillingService.generateDraftInvoice(order, {
      cuitOrDni: "30123456780",
      nameOrReason: "Cliente monotributista",
      ivaCondition: "Monotributo"
    });
    expect(fiscal.invoiceType).toBe("B");
  });

  it("never treats a CAE-looking draft or an incomplete authorization as fiscal", () => {
    expect(isAuthorizedFiscalDetails({
      invoiceType: "B",
      invoiceNumber: "00005-00000123",
      cae: "74123456789012",
      caeExpiration: "2026-08-10",
      neto: 1000,
      iva21: 210,
      iva105: 0,
      status: "draft",
      qrCodeUrl: "https://www.arca.gob.ar/fe/qr/?p=test",
      issuerCuit: "30712345678"
    })).toBe(false);
    expect(isAuthorizedFiscalDetails({
      invoiceType: "B",
      invoiceNumber: "00005-00000123",
      cae: "74123456789012",
      caeExpiration: "2026-08-10",
      neto: 1000,
      iva21: 210,
      iva105: 0,
      status: "authorized",
      qrCodeUrl: "https://www.arca.gob.ar/fe/qr/?p=test",
      issuerCuit: "30712345678"
    })).toBe(true);
  });

  it("keeps role permissions least-privileged", () => {
    expect(AuthService.hasPermission("cajero", "caja:cobrar")).toBe(true);
    expect(AuthService.hasPermission("cajero", "users:delete")).toBe(false);
    expect(AuthService.hasPermission("barista", "caja:cobrar")).toBe(false);
    expect(AuthService.hasPermission("mesero", "orders:update")).toBe(true);
  });
});
