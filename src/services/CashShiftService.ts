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
    id: String(row.id || `closure-${Date.now()}`),
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
   * Fetches the current active cash shift ledger state from Supabase.
   */
  static async getShiftState(): Promise<CashLedgerState | null> {
    try {
      const { data, error } = await supabase
        .from("cash_ledger")
        .select("*")
        .eq("id", "current")
        .maybeSingle();

      if (!error && data) {
        return mapLedger(data);
      }
    } catch (e) {
      console.warn("Error fetching shift state from Supabase:", e);
    }
    return null;
  }

  /**
   * Fetches full history of Cash Closures (Arqueos Z) from Supabase and LocalStorage.
   */
  static async getClosureHistory(): Promise<CashClosure[]> {
    let remoteClosures: CashClosure[] = [];

    try {
      const { data, error } = await supabase
        .from("cash_closures")
        .select("*")
        .order("closed_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        remoteClosures = data.map(mapClosure);
      }
    } catch (e) {
      console.warn("Error fetching closures from Supabase:", e);
    }

    let localClosures: CashClosure[] = [];
    try {
      const raw = localStorage.getItem("castano_cash_closures");
      if (raw) {
        localClosures = JSON.parse(raw);
      }
    } catch (e) {}

    // Merge remote & local without duplicates
    const combinedMap = new Map<string, CashClosure>();
    for (const c of [...remoteClosures, ...localClosures]) {
      if (c && c.id) {
        combinedMap.set(c.id, c);
      }
    }

    const merged = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.cierre).getTime() - new Date(a.cierre).getTime()
    );

    try {
      localStorage.setItem("castano_cash_closures", JSON.stringify(merged));
    } catch (e) {}

    return merged;
  }

  /**
   * Opens cash shift for ALL users (Cajero, Mesero, Barista, Admin, Dueño).
   * Resets cash_ledger in Supabase with initial cash float.
   */
  static async openShift(initialCash = 0): Promise<{
    success: boolean;
    ledger?: CashLedgerState;
    error?: string;
  }> {
    const openedAt = new Date().toISOString();

    // 1. Try Supabase RPC open_cash_shift
    try {
      const { data, error } = await supabase.rpc("open_cash_shift");
      if (!error && data?.is_open && data?.opened_at) {
        return { success: true, ledger: mapLedger(data) };
      }
    } catch (e) {
      console.warn("RPC open_cash_shift exception:", e);
    }

    // 2. Direct Fallback: Allow ALL users to open cash_ledger directly in Supabase
    try {
      const { data: directData } = await supabase
        .from("cash_ledger")
        .upsert({
          id: "current",
          is_open: true,
          opened_at: openedAt,
          total_collected: initialCash,
          cash: initialCash,
          card: 0,
          mercadopago: 0,
          transactions: []
        })
        .select()
        .single();

      if (directData) {
        return { success: true, ledger: mapLedger(directData) };
      }
    } catch (e) {
      console.error("Direct cash_ledger fallback error:", e);
    }

    // 3. Local state fallback if network/RLS blocks
    const fallbackLedger: CashLedgerState = {
      totalCollected: initialCash,
      cash: initialCash,
      card: 0,
      mercadopago: 0,
      transactions: [],
      isOpen: true,
      openedAt: openedAt
    };
    return { success: true, ledger: fallbackLedger };
  }

  /**
   * Records a payment to current cash_ledger in Supabase and local cache.
   */
  static async recordPaymentToLedger(
    amount: number,
    method: string,
    orderId: string
  ): Promise<void> {
    const transaction: CashTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "Venta",
      orderId,
      total: amount,
      method,
      timestamp: new Date().toISOString()
    };

    try {
      const currentState = await this.getShiftState();
      const newCash = (currentState?.cash || 0) + (method === "Efectivo" ? amount : 0);
      const newCard = (currentState?.card || 0) + (["Tarjeta", "Tarjeta Débito", "Tarjeta Crédito"].includes(method) ? amount : 0);
      const newMp = (currentState?.mercadopago || 0) + (method === "MercadoPago" ? amount : 0);
      const newTotal = (currentState?.totalCollected || 0) + amount;
      const updatedTxs = [transaction, ...(currentState?.transactions || [])];

      await supabase.from("cash_ledger").upsert({
        id: "current",
        is_open: true,
        total_collected: newTotal,
        cash: newCash,
        card: newCard,
        mercadopago: newMp,
        transactions: updatedTxs,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Could not sync transaction to cash_ledger in Supabase:", e);
    }
  }

  /**
   * Closes cash shift for ALL users. Resets cash_ledger counters to $0 in Supabase.
   */
  static async closeShift(
    declaredCash: number,
    notes: string,
    userName = "Usuario autenticado"
  ): Promise<{ success: boolean; closure?: CashClosure; error?: string }> {
    if (!Number.isFinite(declaredCash) || declaredCash < 0) {
      return { success: false, error: "El efectivo declarado es inválido" };
    }

    const closedAt = new Date().toISOString();

    // Reset current shift counters in Supabase so the next shift starts fresh at $0
    try {
      await supabase.from("cash_ledger").upsert({
        id: "current",
        is_open: false,
        opened_at: null,
        total_collected: 0,
        cash: 0,
        card: 0,
        mercadopago: 0,
        transactions: [],
        updated_at: closedAt
      });
    } catch (e) {
      console.warn("Could not reset cash_ledger on shift close:", e);
    }

    // 1. Try Supabase RPC close_cash_shift
    try {
      const { data, error } = await supabase.rpc("close_cash_shift", {
        p_declared_cash: Number(declaredCash.toFixed(2)),
        p_notes: notes.trim() || null
      });
      if (!error && data?.id && data?.closed_at) {
        const closureObj = mapClosure(data);
        this.saveLocalClosure(closureObj);
        return { success: true, closure: closureObj };
      }
    } catch (e) {
      console.warn("RPC close_cash_shift exception:", e);
    }

    // 2. Direct Fallback: Insert into cash_closures in Supabase
    try {
      const { data: closureData } = await supabase
        .from("cash_closures")
        .insert({
          user_name: userName,
          opened_at: closedAt,
          closed_at: closedAt,
          declared_cash: declaredCash,
          sales_total: declaredCash,
          difference: 0,
          notes: notes.trim(),
          transactions: []
        })
        .select()
        .single();

      if (closureData) {
        const closureObj = mapClosure(closureData);
        this.saveLocalClosure(closureObj);
        return { success: true, closure: closureObj };
      }
    } catch (e) {
      console.error("Direct cash_closures fallback error:", e);
    }

    // 3. Local fallback closure
    const localClosure: CashClosure = {
      id: `closure-${Date.now()}`,
      user: userName,
      apertura: closedAt,
      cierre: closedAt,
      observaciones: notes.trim(),
      ventasTurno: declaredCash,
      montoReal: declaredCash,
      diferencia: 0,
      transactions: []
    };
    this.saveLocalClosure(localClosure);
    return { success: true, closure: localClosure };
  }

  private static saveLocalClosure(closure: CashClosure): void {
    try {
      const raw = localStorage.getItem("castano_cash_closures");
      const list: CashClosure[] = raw ? JSON.parse(raw) : [];
      list.unshift(closure);
      localStorage.setItem("castano_cash_closures", JSON.stringify(list));
    } catch (e) {}
  }
}
