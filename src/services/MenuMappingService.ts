import type { MenuItem } from "../types";

export function mapDbMenuItem(db: Record<string, any>): MenuItem {
  return {
    id: db.id,
    name: db.name,
    price: Number(db.price),
    takeawayPrice: db.takeaway_price == null ? undefined : Number(db.takeaway_price),
    deliveryPrice: db.delivery_price == null ? undefined : Number(db.delivery_price),
    description: db.description || "",
    category: db.category as MenuItem["category"],
    tags: db.tags || [],
    image: db.image || "",
    customizable: db.customizable === true,
    nutrition: {
      calories: Number(db.calories || 0),
      allergens: db.allergens || []
    },
    stock: db.stock == null ? undefined : Number(db.stock),
    isOffer: db.is_offer === true,
    offerPrice: db.offer_price == null ? undefined : Number(db.offer_price),
    recipe: db.recipe || [],
    recipeRequired: db.recipe_required !== false,
    vatRate: db.vat_rate == null ? undefined : Number(db.vat_rate) as MenuItem["vatRate"],
    arcaItemCode: db.arca_item_code || undefined,
    arcaUnitCode: db.arca_unit_code || undefined,
    fiscalEnabled: db.fiscal_enabled === true,
    isAvailable: db.is_available !== false
  };
}
