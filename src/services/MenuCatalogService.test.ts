import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn()
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from
  }
}));

import { MenuCatalogService } from "./MenuCatalogService";
import type { MenuItem } from "../types";

const product: MenuItem = {
  id: "product-1",
  name: "Empanada",
  price: 3500,
  takeawayPrice: 3200,
  deliveryPrice: 3900,
  description: "Empanada salteña",
  category: "empanadas",
  tags: ["Artesanal"],
  image: "https://example.com/empanada.jpg",
  customizable: true,
  nutrition: { calories: 250, allergens: ["Gluten"] },
  stock: 100,
  recipe: []
};

describe("MenuCatalogService", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.from.mockReset();
  });

  it("rejects local or expired sessions before attempting a database write", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await MenuCatalogService.saveProduct(product);

    expect(result.success).toBe(false);
    expect(result.error).toContain("no está autenticada");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("updates the existing catalog row and waits for Supabase confirmation", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: product.id }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.from.mockReturnValue({ update });

    const result = await MenuCatalogService.saveProduct(product);

    expect(result.success).toBe(true);
    expect(mocks.from).toHaveBeenCalledWith("menu_items");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Empanada", price: 3500, stock: 100 })
    );
    expect(eq).toHaveBeenCalledWith("id", product.id);
    expect(select).toHaveBeenCalledWith("id");
  });

  it("returns an actionable message when RLS rejects the update", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", message: "row-level security policy" }
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.from.mockReturnValue({ update });

    const result = await MenuCatalogService.saveProduct(product);

    expect(result.success).toBe(false);
    expect(result.error).toContain("no tiene permisos");
  });
});
