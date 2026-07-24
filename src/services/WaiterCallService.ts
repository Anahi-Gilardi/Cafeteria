export interface WaiterCall {
  id: string;
  tableNumber: string;
  type: "call_waiter" | "request_bill";
  customerName?: string;
  timestamp: string;
  status: "pending" | "attended";
}

class WaiterCallService {
  private static instance: WaiterCallService;
  private calls: WaiterCall[] = [];

  private constructor() {
    try {
      const saved = localStorage.getItem("puglia_waiter_calls");
      if (saved) {
        this.calls = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading waiter calls:", e);
    }
  }

  public static getInstance(): WaiterCallService {
    if (!WaiterCallService.instance) {
      WaiterCallService.instance = new WaiterCallService();
    }
    return WaiterCallService.instance;
  }

  public requestAttention(tableNumber: string, type: "call_waiter" | "request_bill", customerName?: string): WaiterCall {
    const newCall: WaiterCall = {
      id: "CALL-" + Date.now(),
      tableNumber,
      type,
      customerName: customerName || "Cliente",
      timestamp: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      status: "pending"
    };

    this.calls.unshift(newCall);
    this.save();

    // Dispatch event for real-time update
    window.dispatchEvent(new CustomEvent("waiter_call_event", { detail: newCall }));
    return newCall;
  }

  public markAttended(callId: string): void {
    this.calls = this.calls.map(c => c.id === callId ? { ...c, status: "attended" } : c);
    this.save();
    window.dispatchEvent(new Event("waiter_calls_updated"));
  }

  public getPendingCalls(): WaiterCall[] {
    return this.calls.filter(c => c.status === "pending");
  }

  private save(): void {
    try {
      localStorage.setItem("puglia_waiter_calls", JSON.stringify(this.calls));
    } catch (e) {
      console.error("Error saving waiter calls:", e);
    }
  }
}

export default WaiterCallService.getInstance();
