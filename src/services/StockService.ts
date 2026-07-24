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

  /**
   * Filters insumos that are below or at critical minimum limits.
   */
  public static getLowStockAlerts(insumos: Insumo[] = []): Insumo[] {
    return insumos.filter((i) => i.currentStock <= (i.minStock || 5));
  }

  /**
   * Generates a WhatsApp order link for restocking a critical insumo from its supplier.
   */
  public static generateSupplierOrderWhatsAppLink(insumo: Insumo, phone: string = "543585042311"): string {
    const cleanPhone = phone.replace(/\D/g, "");
    const targetPhone = cleanPhone.startsWith("54") ? cleanPhone : "54" + cleanPhone;
    const minLimit = insumo.minStock || 5;
    const requiredQty = Math.max(10, minLimit * 2 - insumo.currentStock);
    const message = `Hola ${insumo.supplier || "Proveedor"}, les escribo desde *Resto Bar Del Teatro* (Constitución 944, Río Cuarto).\n\n` +
      `📦 *PEDIDO DE REPOSICIÓN DE INSUMO EN STOCK CRÍTICO*\n` +
      `• *Producto:* ${insumo.name}\n` +
      `• *Stock Actual:* ${insumo.currentStock} ${insumo.unit}\n` +
      `• *Cantidad Solicitada:* ${requiredQty} ${insumo.unit}\n\n` +
      `Agradecemos coordinar la entrega a la brevedad. ¡Muchas gracias!`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  }
}
