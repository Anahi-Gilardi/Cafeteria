import type { MenuItem } from "../types";

export interface ReadinessInsumo {
  id: string;
  costPerUnit?: number;
}

export interface ProductReadiness {
  recipeReady: boolean;
  fiscalReady: boolean;
  salesReady: boolean;
  fullyReady: boolean;
  issues: string[];
}

const ALLOWED_VAT_RATES = new Set([0, 10.5, 21, 27]);

export function getProductReadiness(
  item: MenuItem,
  insumos: ReadinessInsumo[]
): ProductReadiness {
  const issues: string[] = [];
  const insumosById = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const recipeRequired = item.recipeRequired !== false;
  const recipeLines = item.recipe || [];
  const recipeReady = !recipeRequired || (
    recipeLines.length > 0 &&
    recipeLines.every((line) => {
      const insumo = insumosById.get(line.ingredientId);
      return Number.isFinite(line.amount) && line.amount > 0 && Boolean(insumo) && Number(insumo?.costPerUnit || 0) > 0;
    })
  );
  if (!recipeReady) {
    issues.push("Receta incompleta o con insumos sin costo");
  }

  const fiscalReady = item.fiscalEnabled === true &&
    item.vatRate !== undefined &&
    ALLOWED_VAT_RATES.has(Number(item.vatRate)) &&
    Boolean(item.arcaItemCode?.trim()) &&
    Boolean(item.arcaUnitCode?.trim());
  if (!fiscalReady) {
    issues.push("Ficha fiscal ARCA pendiente");
  }

  const salesReady = item.isAvailable !== false && Number(item.stock || 0) > 0;
  if (!salesReady) {
    issues.push(item.isAvailable === false ? "Producto no publicado" : "Producto sin stock");
  }

  return {
    recipeReady,
    fiscalReady,
    salesReady,
    fullyReady: recipeReady && fiscalReady && salesReady,
    issues
  };
}

export function summarizeProductReadiness(
  items: MenuItem[],
  insumos: ReadinessInsumo[]
) {
  const results = items.map((item) => getProductReadiness(item, insumos));
  return {
    total: results.length,
    recipeReady: results.filter((result) => result.recipeReady).length,
    fiscalReady: results.filter((result) => result.fiscalReady).length,
    salesReady: results.filter((result) => result.salesReady).length,
    fullyReady: results.filter((result) => result.fullyReady).length
  };
}
