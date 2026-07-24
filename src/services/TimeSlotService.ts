import { MenuItem } from "../types";

export type TimeSlotId = "franja1_desayunos" | "franja2_almuerzos" | "franja3_meriendas" | "franja4_cenas";

export interface TimeSlotConfig {
  id: TimeSlotId;
  name: string;
  subtitle: string;
  startHour: number;
  endHour: number;
  allowedCategories: string[];
  emoji: string;
}

export const TIME_SLOTS: TimeSlotConfig[] = [
  {
    id: "franja1_desayunos",
    name: "Franja 1: Desayunos & Cafetería de Especialidad",
    subtitle: "07:00 a 11:30 hs • Cafetería, Pastelería, Tostados, Medialunas & Avocado Toast",
    startHour: 7,
    endHour: 11.5,
    allowedCategories: ["desayunos_meriendas", "coffee", "traditional", "bakery", "cold", "bebidas_sa", "postres"],
    emoji: "☕"
  },
  {
    id: "franja2_almuerzos",
    name: "Franja 2: Almuerzo & Menú Ejecutivo Gourmet",
    subtitle: "11:30 a 16:00 hs • Combo 4 Pasos, Minutas, Pastas Caseras, Ensaladas & Carnes",
    startHour: 11.5,
    endHour: 16,
    allowedCategories: ["executive", "minutas_carnes", "pastas_caseras", "empanadas", "starters", "mains", "desserts", "bebidas_sa", "bebidas_alcohol", "postres"],
    emoji: "🥩"
  },
  {
    id: "franja3_meriendas",
    name: "Franja 3: Meriendas & Brunch de Autor",
    subtitle: "16:00 a 20:00 hs • Cafetería Completa, Waffles, Tostados Miga, Licuados & Brunch",
    startHour: 16,
    endHour: 20,
    allowedCategories: ["desayunos_meriendas", "coffee", "bakery", "brunch", "cold", "bebidas_sa", "postres"],
    emoji: "🥐"
  },
  {
    id: "franja4_cenas",
    name: "Franja 4: Cena, Pizzería & Coctelería de Autor",
    subtitle: "20:00 a 00:00 hs • Pizzas Masa Madre, Focaccias, Empanadas, Cerveza & Fernet Cordobés",
    startHour: 20,
    endHour: 24,
    allowedCategories: ["pizzas_focaccias", "empanadas", "minutas_carnes", "pastas_caseras", "bebidas_alcohol", "bebidas_sa", "postres", "mains", "starters"],
    emoji: "🍕"
  }
];

export class TimeSlotService {
  /**
   * Returns the active time slot based on current local time or manual override.
   */
  public static getCurrentTimeSlot(overrideSlotId?: TimeSlotId): TimeSlotConfig {
    if (overrideSlotId) {
      const found = TIME_SLOTS.find(s => s.id === overrideSlotId);
      if (found) return found;
    }

    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    if (currentHour >= 7 && currentHour < 11.5) {
      return TIME_SLOTS[0];
    } else if (currentHour >= 11.5 && currentHour < 16) {
      return TIME_SLOTS[1];
    } else if (currentHour >= 16 && currentHour < 20) {
      return TIME_SLOTS[2];
    } else {
      return TIME_SLOTS[3];
    }
  }

  /**
   * Filters catalog items available for the specified time slot.
   */
  public static filterMenuItemsBySlot(items: MenuItem[], slot: TimeSlotConfig): MenuItem[] {
    return items.filter(item => {
      // Transversal items (bebidas_sa, postres, basic coffee) are always available
      if (item.category === "bebidas_sa" || item.category === "postres" || item.tags.includes("Transversal")) {
        return true;
      }
      return slot.allowedCategories.includes(item.category);
    });
  }
}
