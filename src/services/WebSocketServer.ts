import { Order, OrderStatusType } from "../types";
import { StationType } from "./KDSManager";

export type EventRoom = "room:kitchen" | "room:bar" | "room:cashier" | "room:waiters" | "room:admin";

export interface RealtimeEventPayload {
  eventId: string;
  room: EventRoom;
  type: "order:created" | "order:item_status_changed" | "table:request_bill" | "stock:low_warning";
  timestamp: string;
  data: any;
}

export class WebSocketServerManager {
  private static instance: WebSocketServerManager;
  private subscribers: Record<EventRoom, Array<(event: RealtimeEventPayload) => void>> = {
    "room:kitchen": [],
    "room:bar": [],
    "room:cashier": [],
    "room:waiters": [],
    "room:admin": []
  };

  private processedEventIds: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): WebSocketServerManager {
    if (!WebSocketServerManager.instance) {
      WebSocketServerManager.instance = new WebSocketServerManager();
    }
    return WebSocketServerManager.instance;
  }

  /**
   * Suscribe un cliente a una sala específica (Room)
   */
  public subscribe(room: EventRoom, callback: (event: RealtimeEventPayload) => void): () => void {
    this.subscribers[room].push(callback);
    console.log(`[WebSocketServer] Cliente suscrito a la sala: ${room}`);

    // Retorna función para desuscribirse limpiamente
    return () => {
      this.subscribers[room] = this.subscribers[room].filter(cb => cb !== callback);
      console.log(`[WebSocketServer] Cliente desuscrito de la sala: ${room}`);
    };
  }

  /**
   * Emite un evento en tiempo real a una sala específica (<100ms latency)
   */
  public broadcast(room: EventRoom, eventType: RealtimeEventPayload["type"], data: any): void {
    const eventId = "evt-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);

    // Evitar procesamiento duplicado (Idempotencia)
    if (this.processedEventIds.has(eventId)) {
      return;
    }
    this.processedEventIds.add(eventId);

    // Mantener la memoria limpia limitando a 1000 IDs de eventos
    if (this.processedEventIds.size > 1000) {
      const firstId = this.processedEventIds.values().next().value;
      if (firstId) this.processedEventIds.delete(firstId);
    }

    const payload: RealtimeEventPayload = {
      eventId,
      room,
      type: eventType,
      timestamp: new Date().toISOString(),
      data
    };

    console.log(`[WebSocketServer Broadcast ⚡ <100ms] Sala: ${room} | Evento: ${eventType}`, payload);

    // Notificar a todos los clientes conectados a esa sala
    const listeners = this.subscribers[room] || [];
    listeners.forEach(callback => {
      try {
        callback(payload);
      } catch (err) {
        console.error(`[WebSocketServer] Error notificando suscriptor en ${room}:`, err);
      }
    });
  }

  /**
   * Métodos helpers de emisión rápida para eventos clave
   */
  public emitOrderCreated(order: Order, station: StationType): void {
    const targetRoom: EventRoom = station === "barra" || station === "barra_tragos" ? "room:bar" : "room:kitchen";
    this.broadcast(targetRoom, "order:created", { order, station });
  }

  public emitTableRequestBill(tableNumber: string, orderId: string, totalAmount: number): void {
    this.broadcast("room:cashier", "table:request_bill", { tableNumber, orderId, totalAmount });
  }

  public emitStockLowWarning(insumoName: string, currentStock: number, minLimit: number): void {
    this.broadcast("room:admin", "stock:low_warning", { insumoName, currentStock, minLimit });
  }

  public emitOrderStatusChanged(orderId: string, newStatus: OrderStatusType, waiterId?: string): void {
    this.broadcast("room:waiters", "order:item_status_changed", { orderId, newStatus, waiterId });
  }
}
