import { supabase } from "../lib/supabase";

export interface WaiterCall {
  id: string;
  tableNumber: string;
  type: "call_waiter" | "request_bill";
  customerName?: string;
  timestamp: string;
  status: "pending" | "attended";
}

function mapCall(row: any): WaiterCall {
  return {
    id: row.id,
    tableNumber: row.table_name,
    type: row.call_type,
    customerName: row.customer_name || undefined,
    timestamp: new Date(row.created_at).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit"
    }),
    status: row.status
  };
}

class WaiterCallService {
  public async requestAttention(
    tableNumber: string,
    type: "call_waiter" | "request_bill",
    customerName?: string
  ): Promise<WaiterCall> {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      const { data, error } = await supabase.functions.invoke("create-waiter-call", {
        body: { tableName: tableNumber, type, customerName }
      });
      if (error || !data?.call) {
        throw new Error(error?.message || data?.error || "No se pudo enviar la solicitud.");
      }
      return mapCall(data.call);
    }
    const { data, error } = await supabase
      .from("waiter_calls")
      .insert({
        table_name: tableNumber,
        call_type: type,
        customer_name: customerName || null,
        status: "pending"
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapCall(data);
  }

  public async markAttended(callId: string): Promise<void> {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("waiter_calls")
      .update({
        status: "attended",
        attended_by: user?.id || null,
        attended_at: new Date().toISOString()
      })
      .eq("id", callId);
    if (error) throw error;
  }

  public async getPendingCalls(): Promise<WaiterCall[]> {
    const { data, error } = await supabase
      .from("waiter_calls")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapCall);
  }
}

export default new WaiterCallService();
