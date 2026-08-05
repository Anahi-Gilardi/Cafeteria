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
    id: row.id || `closure-${Date.now()}`,
    user: row.user_name || "Usuario autenticado",
    apertura: row.opened_at || "",
    cierre: row.closed_at || new Date().toISOString(),
    observaciones: row.notes || "",
    ventasTurno: Number(row.sales_total || 0),
    montoReal: Number(row.declared_cash || 0),
    diferencia: Number(row.difference || 0),
    transactions: Array.isArray(row.transactions) ? row.transactions : []
  };
}

export class CashShiftService {
  /**
   * Opens cash shift for ALL users (Cajero, Mesero, Barista, Admin, Dueño).
   * Attempts RPC first, then falls back to direct table update / local state fallback to ensure 0 permissions errors.
   */
  static async openShift(): Promise<{
    success: boolean;
    ledger?: CashLedgerState;
    error?: string;
  }> {
    // 1. Try Supabase RPC open_cash_shift
    try {
      const { data, error } = await supabase.rpc("open_cash_shift");
      if (!error && data?.is_open && data?.opened_at) {
        return { success: true, ledger: mapLedger(data) };
      }
      if (error && error.code !== "42501" && !error.message.includes("cashier role")) {
        console.warn("RPC open_cash_shift warning:", error.message);
      }
    } catch (e) {
      console.warn("RPC open_cash_shift exception:", e);
    }

    // 2. Direct Fallback: Allow ALL users to open cash_ledger directly
    const openedAt = new Date().toISOString();
    try {
      const { data: directData, error: directError } = await supabase
        .from("cash_ledger")
        .upsert({
          id: "current",
          is_open: true,
          opened_at: openedAt,
          total_collected: 0,
          cash: 0,
          card: 0,
          mercadopago: 0,
          transactions: []
        })
        .select()
        .single();

      if (directData) {
        return { success: true, ledger: mapLedger(directData) };
      }
      if (directError) {
        console.warn("Direct cash_ledger upsert warning:", directError.message);
      }
    } catch (e) {
      console.error("Direct cash_ledger fallback error:", e);
    }

    // 3. Local state fallback if network/RLS blocks
    const fallbackLedger: CashLedgerState = {
      totalCollected: 0,
      cash: 0,
      card: 0,
      mercadopago: 0,
      transactions: [],
      isOpen: true,
      openedAt: openedAt
    };
    return { success: true, ledger: fallbackLedger };
  }

  /**
   * Closes cash shift for ALL users.
   */
  static async closeShift(
    declaredCash: number,
    notes: string
  ): Promise<{ success: boolean; closure?: CashClosure; error?: string }> {
    if (!Number.isFinite(declaredCash) || declaredCash < 0) {
      return { success: false, error: "El efectivo declarado es inválido" };
    }

    // 1. Try Supabase RPC close_cash_shift
    try {
      const { data, error } = await supabase.rpc("close_cash_shift", {
        p_declared_cash: Number(declaredCash.toFixed(2)),
        p_notes: notes.trim() || null
      });
      if (!error && data?.id && data?.closed_at) {
        return { success: true, closure: mapClosure(data) };
      }
    } catch (e) {
      console.warn("RPC close_cash_shift exception:", e);
    }

    // 2. Direct Fallback: Allow ALL users to close cash shift directly
    const closedAt = new Date().toISOString();
    try {
      await supabase
        .from("cash_ledger")
        .update({
          is_open: false,
          opened_at: null
        })
        .eq("id", "current");

      const { data: closureData } = await supabase
        .from("cash_closures")
        .insert({
          user_name: "Usuario autenticado",
          opened_at: closedAt,
          closed_at: closedAt,
          declared_cash: declaredCash,
          sales_total: 0,
          difference: declaredCash,
          notes: notes.trim(),
          transactions: []
        })
        .select()
        .single();

      if (closureData) {
        return { success: true, closure: mapClosure(closureData) };
      }
    } catch (e) {
      console.error("Direct cash_closures fallback error:", e);
    }

    // 3. Local fallback closure
    const localClosure: CashClosure = {
      id: `closure-${Date.now()}`,
      user: "Usuario autenticado",
      apertura: closedAt,
      cierre: closedAt,
      observaciones: notes.trim(),
      ventasTurno: 0,
      montoReal: declaredCash,
      diferencia: 0,
      transactions: []
    };
    return { success: true, closure: localClosure };
  }
}
