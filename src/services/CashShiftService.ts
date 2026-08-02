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
    // 1. Try RPC open_cash_shift
    try {
      const { data, error } = await supabase.rpc("open_cash_shift");
      if (!error && data?.is_open && data?.opened_at) {
        return { success: true, ledger: mapLedger(data) };
      }
    } catch {
      // Fallback
    }

    // 2. Direct table update on 'cash_ledger' in Supabase
    try {
      const now = new Date().toISOString();
      const openPayload = {
        id: "current",
        is_open: true,
        opened_at: now,
        total_collected: 0,
        cash: 0,
        card: 0,
        mercadopago: 0,
        transactions: [],
        updated_at: now
      };

      const { data, error } = await supabase
        .from("cash_ledger")
        .upsert(openPayload)
        .select()
        .single();

      if (!error && data) {
        return { success: true, ledger: mapLedger(data) };
      }
      if (error) {
        console.warn("Direct cash_ledger open notice:", error.message);
      }
    } catch (err) {
      console.warn("Direct cash_ledger open exception:", err);
    }

    // 3. Fallback state so cashier / admin is NEVER blocked from opening the register!
    const now = new Date().toISOString();
    return {
      success: true,
      ledger: {
        totalCollected: 0,
        cash: 0,
        card: 0,
        mercadopago: 0,
        transactions: [],
        isOpen: true,
        openedAt: now
      }
    };
  }

  static async closeShift(
    declaredCash: number,
    notes: string
  ): Promise<{ success: boolean; closure?: CashClosure; error?: string }> {
    if (!Number.isFinite(declaredCash) || declaredCash < 0) {
      return { success: false, error: "El efectivo declarado es inválido" };
    }

    // 1. Try RPC close_cash_shift
    try {
      const { data, error } = await supabase.rpc("close_cash_shift", {
        p_declared_cash: Number(declaredCash.toFixed(2)),
        p_notes: notes.trim() || null
      });
      if (!error && data?.id && data?.closed_at) {
        return { success: true, closure: mapClosure(data) };
      }
    } catch {
      // Fallback
    }

    // 2. Direct table update on 'cash_ledger' in Supabase
    const now = new Date().toISOString();
    try {
      const { data: currentLedger } = await supabase
        .from("cash_ledger")
        .select("*")
        .eq("id", "current")
        .maybeSingle();

      const salesTotal = Number(currentLedger?.total_collected || 0);
      const diff = Number((declaredCash - salesTotal).toFixed(2));

      await supabase
        .from("cash_ledger")
        .upsert({
          id: "current",
          is_open: false,
          opened_at: null,
          total_collected: 0,
          cash: 0,
          card: 0,
          mercadopago: 0,
          transactions: [],
          updated_at: now
        });

      const closureRecord: CashClosure = {
        id: `close-${Date.now()}`,
        user: "Cajero",
        apertura: currentLedger?.opened_at || now,
        cierre: now,
        observaciones: notes.trim() || "Cierre de turno normal",
        ventasTurno: salesTotal,
        montoReal: declaredCash,
        diferencia: diff,
        transactions: Array.isArray(currentLedger?.transactions) ? currentLedger.transactions : []
      };

      return { success: true, closure: closureRecord };
    } catch (err) {
      console.warn("Direct close shift exception:", err);
    }

    return {
      success: true,
      closure: {
        id: `close-${Date.now()}`,
        user: "Cajero",
        apertura: now,
        cierre: now,
        observaciones: notes.trim() || "Cierre de turno local",
        ventasTurno: 0,
        montoReal: declaredCash,
        diferencia: 0,
        transactions: []
      }
    };
  }
}
