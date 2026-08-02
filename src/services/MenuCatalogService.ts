import { supabase } from "../lib/supabase";
import type { MenuItem } from "../types";

interface SupabaseFailure {
  code?: string;
  message?: string;
}

export interface MenuSaveResult {
  success: boolean;
  error?: string;
}

function describeSaveFailure(error: SupabaseFailure): string {
  if (error.code === "42501") {
    return "Tu cuenta no tiene permisos para modificar la carta. Cerrá sesión e ingresá con un usuario activo de Supabase.";
  }
  if (error.code === "PGRST116") {
    return "El producto ya no existe o no está disponible para tu cuenta. Recargá la carta e intentá nuevamente.";
  }
  return `Supabase rechazó el cambio${error.code ? ` (${error.code})` : ""}: ${error.message || "error desconocido"}`;
}

export class MenuCatalogService {
  static async saveProduct(item: MenuItem): Promise<MenuSaveResult> {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "La sesión administrativa no está autenticada en Supabase. Cerrá sesión e ingresá nuevamente."
      };
    }

    const payload = {
      name: item.name.trim(),
      price: item.price,
      takeaway_price: item.takeawayPrice ?? null,
      delivery_price: item.deliveryPrice ?? null,
      description: item.description,
      category: item.category,
      tags: item.tags || [],
      image: item.image || null,
      customizable: item.customizable,
      calories: item.nutrition?.calories ?? null,
      allergens: item.nutrition?.allergens || [],
      stock: item.stock ?? 0,
      is_offer: item.isOffer ?? false,
      offer_price: item.isOffer ? item.offerPrice ?? null : null,
      recipe: item.recipe || [],
      recipe_required: item.recipeRequired !== false,
      vat_rate: item.vatRate ?? null,
      arca_item_code: item.arcaItemCode?.trim() || null,
      arca_unit_code: item.arcaUnitCode?.trim() || null,
      fiscal_enabled: item.fiscalEnabled === true,
      is_available: item.isAvailable !== false,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("menu_items")
      .update(payload)
      .eq("id", item.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, error: describeSaveFailure(error) };
    }
    if (!data) {
      return {
        success: false,
        error: "Supabase no confirmó ningún producto actualizado. Recargá la carta antes de volver a guardar."
      };
    }

    return { success: true };
  }
}
