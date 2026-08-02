import { describe, expect, it } from "vitest";
import { MENU_ITEMS } from "../data/menu";
import { resolvePdfMenuItems } from "./MenuPDFService";

describe("resolvePdfMenuItems", () => {
  it("preserves canonical Supabase prices even when they are lower than the bundled catalog", () => {
    const catalogItem = MENU_ITEMS[0];
    const remoteItem = {
      ...catalogItem,
      price: Math.max(1, catalogItem.price - 500),
      offerPrice: 1234,
      takeawayPrice: 2345,
      deliveryPrice: 3456,
      image: ""
    };

    const [resolved] = resolvePdfMenuItems([remoteItem]);

    expect(resolved.price).toBe(remoteItem.price);
    expect(resolved.offerPrice).toBe(1234);
    expect(resolved.takeawayPrice).toBe(2345);
    expect(resolved.deliveryPrice).toBe(3456);
    expect(resolved.image).toBe(catalogItem.image);
  });

  it("falls back to the bundled menu only when Supabase returned no items", () => {
    expect(resolvePdfMenuItems([])).toHaveLength(MENU_ITEMS.length);
  });
});
