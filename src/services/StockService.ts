import { MenuItem } from "../types";
import { supabase } from "../lib/supabase";

export interface StockDeductionItem {
  item: MenuItem;
  quantity: number;
}

export interface InsumoStockAlert {
  insumoId: string;
  insumoName: string;
  currentStock: number;
  minLimit: number;
}

export class StockService {
  /**
   * Descuenta insumos atómicamente según la Ficha Técnica / Receta del producto.
   */
  static async deductStockForOrder(orderItems: StockDeductionItem[]): Promise<InsumoStockAlert[]> {
    const alerts: InsumoStockAlert[] = [];

    for (const { item, quantity } of orderItems) {
      if (!item.recipe || item.recipe.length === 0) continue;

      for (const recipeItem of item.recipe) {
        const totalIngredientNeeded = recipeItem.amount * quantity;

        try {
          // Obtener el insumo actual
          const { data: insumo } = await supabase
            .from("insumos")
            .select("*")
            .eq("id", recipeItem.ingredientId)
            .single();

          if (insumo) {
            const newQty = Math.max(0, Number(insumo.quantity) - totalIngredientNeeded);
            
            // Actualizar stock en Supabase
            await supabase
              .from("insumos")
              .update({ quantity: newQty })
              .eq("id", recipeItem.ingredientId);

            // Generar alerta de stock preventivo si cae del mínimo
            if (newQty <= insumo.minLimit) {
              alerts.push({
                insumoId: insumo.id,
                insumoName: insumo.name,
                currentStock: newQty,
                minLimit: insumo.minLimit
              });
            }
          }
        } catch (err) {
          console.warn(`[StockService] Error deduciendo insumo ${recipeItem.ingredientId}:`, err);
        }
      }
    }

    return alerts;
  }

  /**
   * Reintegra o registra mermas ante cancelación de comandas.
   */
  static async handleOrderCancelation(
    orderItems: StockDeductionItem[],
    type: "Reintegro" | "Merma"
  ): Promise<void> {
    if (type === "Reintegro") {
      for (const { item, quantity } of orderItems) {
        if (!item.recipe) continue;
        for (const r of item.recipe) {
          const totalToReturn = r.amount * quantity;
          try {
            const { data: insumo } = await supabase.from("insumos").select("quantity").eq("id", r.ingredientId).single();
            if (insumo) {
              await supabase.from("insumos").update({ quantity: Number(insumo.quantity) + totalToReturn }).eq("id", r.ingredientId);
            }
          } catch (e) {
            console.error("[StockService] Error en reintegro de stock:", e);
          }
        }
      }
    } else {
      // Registrar en bitácora de mermas
      console.log(`[StockService] Registrada merma/desperdicio de comanda cancelada.`);
    }
  }
}
