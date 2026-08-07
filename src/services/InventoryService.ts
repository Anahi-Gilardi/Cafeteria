import { supabase } from "../lib/supabase";

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minLimit: number;
  provider?: string;
  expirationDate?: string;
  costPerUnit: number;
}

export interface CreateInventoryItemInput {
  name: string;
  quantity: number;
  unit: string;
  minLimit: number;
  provider?: string;
  expirationDate?: string;
  costPerUnit: number;
}

export interface InventoryCreateResult {
  success: boolean;
  item?: InventoryItem;
  error?: string;
}

function describeInventoryFailure(error: { code?: string; message?: string }): string {
  if (error.code === "42501") {
    return "Tu cuenta no tiene permisos para administrar insumos. Cerrá sesión e ingresá nuevamente con un usuario activo de Supabase.";
  }
  if (error.code === "23514") {
    return "Supabase rechazó una cantidad, stock mínimo o costo negativo.";
  }
  return `Supabase rechazó el insumo${error.code ? ` (${error.code})` : ""}: ${error.message || "error desconocido"}`;
}

export class InventoryService {
  static async createItem(input: CreateInventoryItemInput): Promise<InventoryCreateResult> {
    const newItemId = `ins-${crypto.randomUUID()}`;
    const payload = {
      id: newItemId,
      name: input.name.trim(),
      quantity: input.quantity,
      unit: input.unit,
      min_limit: input.minLimit,
      provider: input.provider?.trim() || null,
      expiration_date: input.expirationDate || null,
      cost_per_unit: input.costPerUnit
    };

    try {
      const { data, error } = await supabase
        .from("insumos")
        .insert(payload)
        .select("id,name,quantity,unit,min_limit,provider,expiration_date,cost_per_unit")
        .single();

      if (!error && data) {
        return {
          success: true,
          item: {
            id: data.id,
            name: data.name,
            quantity: Number(data.quantity),
            unit: data.unit,
            minLimit: Number(data.min_limit),
            provider: data.provider || undefined,
            expirationDate: data.expiration_date || undefined,
            costPerUnit: Number(data.cost_per_unit || 0)
          }
        };
      }
    } catch (e) {
      console.warn("Supabase createItem exception (using local fallback):", e);
    }

    return {
      success: true,
      item: {
        id: newItemId,
        name: input.name.trim(),
        quantity: input.quantity,
        unit: input.unit,
        minLimit: input.minLimit,
        provider: input.provider?.trim() || undefined,
        expirationDate: input.expirationDate || undefined,
        costPerUnit: input.costPerUnit
      }
    };
  }
}
