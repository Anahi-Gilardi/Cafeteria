import { MenuItem, Order, Insumo } from "../types";
import { MENU_ITEMS } from "../data/menu";

export class StockService {
  /**
   * Calculates the updated raw material inventory list after deducting stock per recipe.
   */
  public static deductStockForOrder(
    order: Order,
    menuItems: MenuItem[] = MENU_ITEMS,
    currentInsumos: Insumo[] = []
  ): { updatedInsumos: Insumo[]; deductedSummary: string[] } {
    const updatedInsumos = [...currentInsumos];
    const deductedSummary: string[] = [];

    order.items.forEach((orderItem) => {
      const matchedMenuItem = menuItems.find((m) => m.name === orderItem.name);
      if (matchedMenuItem && matchedMenuItem.recipe && matchedMenuItem.recipe.length > 0) {
        matchedMenuItem.recipe.forEach((recipeItem) => {
          const totalAmountDeducted = recipeItem.amount * orderItem.quantity;
          const insumoIndex = updatedInsumos.findIndex((i) => i.id === recipeItem.ingredientId);

          if (insumoIndex !== -1) {
            const prevStock = updatedInsumos[insumoIndex].currentStock;
            const newStock = Math.max(0, parseFloat((prevStock - totalAmountDeducted).toFixed(3)));
            updatedInsumos[insumoIndex] = {
              ...updatedInsumos[insumoIndex],
              currentStock: newStock
            };

            deductedSummary.push(
              `➖ ${updatedInsumos[insumoIndex].name}: -${totalAmountDeducted} ${updatedInsumos[insumoIndex].unit}`
            );
          }
        });
      }
    });

    return { updatedInsumos, deductedSummary };
  }
}
