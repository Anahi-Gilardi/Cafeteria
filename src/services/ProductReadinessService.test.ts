import { describe, expect, it } from "vitest";
import type { MenuItem } from "../types";
import { getProductReadiness, summarizeProductReadiness } from "./ProductReadinessService";

const baseItem: MenuItem = {
  id: "item-1",
  name: "Producto",
  price: 5000,
  description: "Producto de prueba",
  category: "empanadas",
  tags: [],
  image: "",
  customizable: false,
  nutrition: { calories: 0, allergens: [] },
  stock: 10,
  recipeRequired: true,
  recipe: [{ ingredientId: "ins-1", amount: 0.2 }],
  vatRate: 21,
  arcaItemCode: "CODIGO-INTERNO",
  arcaUnitCode: "UNIDAD-CONFIGURADA",
  fiscalEnabled: true,
  isAvailable: true
};

describe("ProductReadinessService", () => {
  it("marks a product ready only when sales, recipe and fiscal data are complete", () => {
    const result = getProductReadiness(baseItem, [{ id: "ins-1", costPerUnit: 1200 }]);

    expect(result).toEqual({
      recipeReady: true,
      fiscalReady: true,
      salesReady: true,
      fullyReady: true,
      issues: []
    });
  });

  it("allows finished goods to opt out of raw-material recipes explicitly", () => {
    const result = getProductReadiness(
      { ...baseItem, recipeRequired: false, recipe: [] },
      []
    );

    expect(result.recipeReady).toBe(true);
    expect(result.fullyReady).toBe(true);
  });

  it("reports missing costs, fiscal fields and publication separately", () => {
    const result = getProductReadiness(
      {
        ...baseItem,
        recipe: [{ ingredientId: "missing", amount: 0.2 }],
        arcaUnitCode: "",
        isAvailable: false
      },
      []
    );

    expect(result.fullyReady).toBe(false);
    expect(result.issues).toEqual([
      "Receta incompleta o con insumos sin costo",
      "Ficha fiscal ARCA pendiente",
      "Producto no publicado"
    ]);
  });

  it("summarizes readiness without hiding incomplete products", () => {
    const summary = summarizeProductReadiness(
      [baseItem, { ...baseItem, id: "item-2", fiscalEnabled: false }],
      [{ id: "ins-1", costPerUnit: 1200 }]
    );

    expect(summary).toEqual({
      total: 2,
      recipeReady: 2,
      fiscalReady: 1,
      salesReady: 2,
      fullyReady: 1
    });
  });
});
