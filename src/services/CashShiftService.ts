import { supabase } from "../lib/supabase";

export interface CashTransaction {
  id: string;
  type: string;
  orderId: string;
  total: number;
  method: string;
  timestamp: string;
}

export interface CashLedgerState {
  totalCollected: number;
  cash: number;
  card: number;
  mercadopago: number;
  transactions: CashTransaction[];
  isOpen: boolean;
  openedAt: string;
}

export interface CashClosure {
  id: string;
  user: string;
  apertura: string;
  cierre: string;
  observaciones: string;
  ventasTurno: number;
  montoReal: number;
  diferencia: number;
  transactions: CashTransaction[];
}

function mapLedger(row: any): CashLedgerState {
  return {
    totalCollected: Number(row.total_collected || 0),
    cash: Number(row.cash || 0),
    card: Number(row.card || 0),
    mercadopago: Number(row.mercadopago || 0),
    transactions: Array.isArray(row.transactions) ? row.transactions : [],
    isOpen: Boolean(row.is_open),
    openedAt: row.opened_at || ""
  };
}

function mapClosure(row: any): CashClosure {
  return {
    id: row.id,
    user: row.user_name || "Usuario autenticado",
    apertura: row.opened_at || "",
    cierre: row.closed_at,
    observaciones: row.notes || "",
    ventasTurno: Number(row.sales_total || 0),
    montoReal: Number(row.declared_cash || 0),
    diferencia: Number(row.difference || 0),
    transactions: Array.isArray(row.transactions) ? row.transactions : []
  };
}

export class CashShiftService {
  static async openShift(): Promise<{
    success: boolean;
    ledger?: CashLedgerState;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc("open_cash_shift");
      if (error) return { success: false, error: `${error.message} (${error.code})` };
      if (!data?.is_open || !data?.opened_at) {
        return { success: false, error: "Supabase no confirmó la apertura de caja" };
      }
      return { success: true, ledger: mapLedger(data) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "No fue posible abrir la caja"
      };
    }
  }

  static async closeShift(
    declaredCash: number,
    notes: string
  ): Promise<{ success: boolean; closure?: CashClosure; error?: string }> {
    if (!Number.isFinite(declaredCash) || declaredCash < 0) {
      return { success: false, error: "El efectivo declarado es inválido" };
    }

    try {
      const { data, error } = await supabase.rpc("close_cash_shift", {
        p_declared_cash: Number(declaredCash.toFixed(2)),
        p_notes: notes.trim() || null
      });
      if (error) return { success: false, error: `${error.message} (${error.code})` };
      if (!data?.id || !data?.closed_at) {
        return { success: false, error: "Supabase no confirmó el cierre de caja" };
      }
      return { success: true, closure: mapClosure(data) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "No fue posible cerrar la caja"
      };
    }
  }
}
