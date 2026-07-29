import { DailyExecutiveMenu } from "../types";

const days: DailyExecutiveMenu["dayOfWeek"][] = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
];

/**
 * Returns an empty presentation model while Supabase loads the configured menu.
 * Operational menu content is never seeded or recovered from browser storage.
 */
export function getTodayExecutiveMenu(): DailyExecutiveMenu {
  return {
    dayOfWeek: days[new Date().getDay()],
    title: "",
    description: "",
    price: 0,
    starters: [],
    mains: [],
    drinks: [],
    desserts: [],
    active: false
  };
}
