import { Order } from "../types";

export interface CashClosureAudit {
  shiftStart: string;
  shiftEnd: string;
  expectedCash: number;
  expectedMercadoPago: number;
  expectedCard: number;
  totalExpected: number;
  actualCashEntered: number;
  cashDifference: number;
  totalOrdersCount: number;
}

export interface TopProductMetric {
  name: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
}

export interface HourlySalesMetric {
  hourLabel: string;
  salesTotal: number;
  ordersCount: number;
}

export class ReportingService {
  /**
   * Genera el arqueo de caja X/Z con balance por turno y discrepancia.
   */
  static generateShiftClosure(
    orders: Order[],
    actualCashEntered: number
  ): CashClosureAudit {
    const completedOrders = orders.filter(o => o.status === "Completado");
    
    let expectedCash = 0;
    let expectedMercadoPago = 0;
    let expectedCard = 0;

    completedOrders.forEach(order => {
      // Si tiene desglose de pago registrado o monto total
      if (order.paymentMethod === "Efectivo") expectedCash += order.total;
      else if (order.paymentMethod === "MercadoPago") expectedMercadoPago += order.total;
      else expectedCard += order.total;
    });

    const totalExpected = expectedCash + expectedMercadoPago + expectedCard;
    const cashDifference = actualCashEntered - expectedCash;

    return {
      shiftStart: new Date().setHours(8, 0, 0, 0) ? new Date(new Date().setHours(8, 0, 0, 0)).toISOString() : new Date().toISOString(),
      shiftEnd: new Date().toISOString(),
      expectedCash,
      expectedMercadoPago,
      expectedCard,
      totalExpected,
      actualCashEntered,
      cashDifference,
      totalOrdersCount: completedOrders.length
    };
  }

  /**
   * Ranking de productos más vendidos (Cafetería vs. Menú Ejecutivo vs. Restaurante).
   */
  static getTopSellingProducts(orders: Order[]): TopProductMetric[] {
    const productMap: Record<string, TopProductMetric> = {};

    orders.filter(o => o.status === "Completado").forEach(order => {
      order.items.forEach(item => {
        if (!productMap[item.name]) {
          productMap[item.name] = {
            name: item.name,
            category: item.name.includes("Menú") ? "Menú Ejecutivo" : "Carta General",
            unitsSold: 0,
            totalRevenue: 0
          };
        }
        productMap[item.name].unitsSold += item.quantity;
        productMap[item.name].totalRevenue += item.price * item.quantity;
      });
    });

    return Object.values(productMap).sort((a, b) => b.unitsSold - a.unitsSold);
  }

  /**
   * Exportador de datos contables a formato CSV.
   */
  static exportToCSV(orders: Order[]): void {
    let csv = "ID Comanda,Fecha,Mesa,Tipo,Total,Estado\n";
    orders.forEach(o => {
      csv += `"${o.id}","${o.createdAt}","${o.tableNumber || "N/A"}","${o.type}",${o.total},"${o.status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Contable_Resto_Bar_Del_Teatro_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
