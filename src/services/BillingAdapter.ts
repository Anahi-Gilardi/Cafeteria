import { Order, FiscalDetails } from "../types";
import { ARCAFiscalAdapter } from "./ARCAAdapter";

export interface PaymentPart {
  method: "Efectivo" | "Tarjeta" | "MercadoPago" | "Fiado / Cta Cte";
  amount: number;
}

export class BillingAdapter {
  /**
   * Procesa cobro split-bill multi-medio de pago.
   */
  static processSplitBill(totalOrderAmount: number, paymentParts: PaymentPart[]): {
    success: boolean;
    remainingBalance: number;
    error?: string;
  } {
    const totalPaid = paymentParts.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalOrderAmount - totalPaid;

    if (remaining > 0.01) {
      return {
        success: false,
        remainingBalance: remaining,
        error: `Saldo insuficiente. Falta abonar $${remaining.toFixed(2)}.`
      };
    }

    return {
      success: true,
      remainingBalance: 0
    };
  }

  /**
   * Genera comprobante fiscal de ARCA / AFIP con CAE y QR.
   */
  static async authorizeArcaVoucher(
    order: Order,
    voucherType: "Factura B" | "Factura A" | "Consumidor Final" = "Factura B",
    clientDoc: string = "00000000"
  ): Promise<FiscalDetails> {
    const adapter = new ARCAFiscalAdapter();
    const subtotal = Number((order.total * 0.79).toFixed(2));
    const vatAmount = Number((order.total * 0.21).toFixed(2));

    const res = await adapter.authorizeVoucher({
      voucherType: voucherType === "Factura A" ? 1 : 6,
      posNumber: 1,
      docType: clientDoc.length === 11 ? 80 : 96,
      docNumber: clientDoc,
      customerName: order.customerName || "Consumidor Final",
      items: order.items.map(i => ({ description: i.name, amount: i.price * i.quantity, vatRate: 21 })),
      subtotal,
      vatAmount,
      totalAmount: order.total
    });

    return {
      cae: res.cae,
      caeExpiration: res.caeDueDate,
      invoiceNumber: `00001-${res.voucherNumber.toString().padStart(8, "0")}`,
      invoiceType: voucherType === "Factura A" ? "A" : "B",
      qrCodeUrl: res.qrUrl,
      neto: subtotal,
      iva21: vatAmount,
      iva105: 0
    };
  }
}
