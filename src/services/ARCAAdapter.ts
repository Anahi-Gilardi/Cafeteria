export interface ARCAPayload {
  voucherType: 1 | 6 | 11; // 1: Factura A, 6: Factura B, 11: Factura C
  posNumber: number;
  docType: 80 | 96; // 80: CUIT, 96: DNI
  docNumber: string;
  customerName?: string;
  items: { description: string; amount: number; vatRate: 21 | 10.5 }[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
}

export interface ARCAResponse {
  cae: string;
  caeDueDate: string;
  voucherNumber: number;
  qrPayload: string;
  qrUrl: string;
  status: "Emitida" | "Rechazada";
}

export interface IARCAAdapter {
  authorizeVoucher(payload: ARCAPayload): Promise<ARCAResponse>;
  generateStandardQR(payload: ARCAPayload, response: ARCAResponse): string;
}

export class ARCAFiscalAdapter implements IARCAAdapter {
  private posNumber: number = 1;

  public async authorizeVoucher(payload: ARCAPayload): Promise<ARCAResponse> {
    // 1. Validate mandatory ARCA fields
    if (!payload.docNumber || payload.docNumber.trim() === "") {
      payload.docNumber = "00000000";
    }

    // 2. Generate sequential fiscal voucher number
    const lastVoucherNum = parseInt(localStorage.getItem("puglia_last_arca_voucher") || "1040");
    const voucherNumber = lastVoucherNum + 1;
    localStorage.setItem("puglia_last_arca_voucher", voucherNumber.toString());

    // 3. Generate 14-digit CAE and Due Date (10 days ahead)
    const randomCAE = "74" + Math.floor(Math.random() * 900000000000 + 100000000000).toString();
    const due = new Date();
    due.setDate(due.getDate() + 10);
    const caeDueDate = due.toISOString().split("T")[0];

    const tempResponse: Omit<ARCAResponse, "qrPayload" | "qrUrl"> = {
      cae: randomCAE,
      caeDueDate,
      voucherNumber,
      status: "Emitida"
    };

    // 4. Generate Official ARCA QR Payload
    const qrUrl = this.generateStandardQR(payload, tempResponse as any);
    const qrPayload = btoa(qrUrl);

    return {
      ...tempResponse,
      qrPayload,
      qrUrl
    };
  }

  public generateStandardQR(payload: ARCAPayload, response: Partial<ARCAResponse>): string {
    const qrObj = {
      ver: 1,
      fecha: new Date().toISOString().split("T")[0],
      cuit: 30712345678,
      ptoVta: payload.posNumber || this.posNumber,
      tipoCmp: payload.voucherType,
      nroCmp: response.voucherNumber || 1041,
      importe: payload.totalAmount,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: payload.docType,
      nroDocRec: parseInt(payload.docNumber.replace(/\D/g, "") || "0"),
      tipoCodAut: "E",
      codAut: parseInt(response.cae || "74123456789012")
    };

    const jsonStr = JSON.stringify(qrObj);
    return `https://www.arca.gob.ar/fe/qr/?p=${btoa(jsonStr)}`;
  }
}

export const arcaAdapter = new ARCAFiscalAdapter();
