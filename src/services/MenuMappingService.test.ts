import { describe, expect, it } from "vitest";
import { mapDbMenuItem } from "./MenuMappingService";

describe("mapDbMenuItem", () => {
  it("keeps Supabase as the canonical source even when a price was reduced", () => {
    const item = mapDbMenuItem({
      id: "empanada",
      name: "Empanada",
      price: 2000,
      takeaway_price: 1800,
      delivery_price: 2400,
      description: "Prueba",
      category: "empanadas",
      tags: [],
      image: "",
      customizable: false,
      calories: 0,
      allergens: [],
      stock: 10,
      is_offer: false,
      offer_price: null,
      recipe: []
    });

    expect(item.price).toBe(2000);
    expect(item.takeawayPrice).toBe(1800);
    expect(item.deliveryPrice).toBe(2400);
  });

  it("preserves explicit zero values instead of treating them as missing", () => {
    const item = mapDbMenuItem({
      id: "item-0",
      name: "Item",
      price: 0,
      takeaway_price: 0,
      delivery_price: 0,
      category: "empanadas",
      stock: 0
    });

    expect(item.price).toBe(0);
    expect(item.takeawayPrice).toBe(0);
    expect(item.deliveryPrice).toBe(0);
    expect(item.stock).toBe(0);
  });
});
