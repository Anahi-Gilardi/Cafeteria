import { Order } from "../types";

export type StationType = "barra" | "cocina" | "parrilla" | "cocina_fria" | "barra_tragos";

export class KDSManager {
  /**
   * Determina la estación de trabajo de cocina o barra según las palabras clave del producto.
   */
  static getItemDestination(name: string): StationType {
    const n = name.toLowerCase();
    
    if (n.includes("bife") || n.includes("entraña") || n.includes("provolone") || n.includes("parrilla") || n.includes("asado") || n.includes("chorizo") || n.includes("bondiola")) {
      return "parrilla";
    }
    if (n.includes("flan") || n.includes("tiramisú") || n.includes("volcán") || n.includes("ensalada") || n.includes("bruschetta")) {
      return "cocina_fria";
    }
    if (n.includes("vino") || n.includes("aperol") || n.includes("cerveza") || n.includes("trago") || n.includes("coctel") || n.includes("spritz")) {
      return "barra_tragos";
    }
    if (
      n.includes("café") || n.includes("cafe") || n.includes("latte") || n.includes("flat") || 
      n.includes("espresso") || n.includes("cappuccino") || n.includes("macchiato") || 
      n.includes("mocaccino") || n.includes("submarino") || n.includes("té") || n.includes("te") || 
      n.includes("limonada") || n.includes("jugo") || n.includes("licuado") || n.includes("cold") || 
      n.includes("iced") || n.includes("filtrado")
    ) {
      return "barra";
    }
    
    return "cocina";
  }

  /**
   * Distribuye en tiempo real los ítems de la comanda hacia sus respectivas pantallas KDS.
   */
  static routeOrderToStations(order: Order): Record<StationType, typeof order.items> {
    const routed: Record<StationType, typeof order.items> = {
      barra: [],
      cocina: [],
      parrilla: [],
      cocina_fria: [],
      barra_tragos: []
    };

    order.items.forEach(item => {
      const station = ((item as any).destination as StationType) || this.getItemDestination(item.name);
      routed[station].push(item);
    });

    console.log(`[KDSManager] Comanda #${order.id} ruteada a estaciones:`, routed);
    return routed;
  }
}
