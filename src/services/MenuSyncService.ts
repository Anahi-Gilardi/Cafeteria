import type { RealtimeChannel } from "@supabase/supabase-js";
import type { MenuItem } from "../types";
import { supabase } from "../lib/supabase";
import { mapDbMenuItem } from "./MenuMappingService";

export interface MenuSyncResult {
  items: MenuItem[];
  error?: string;
  imageWarning?: string;
}

export class MenuSyncService {
  static async fetchCanonicalMenu(): Promise<MenuSyncResult> {
    const { data: menuData, error: menuError } = await supabase
      .from("menu_items")
      .select("*")
      .order("category")
      .order("name");

    if (menuError) {
      return {
        items: [],
        error: `${menuError.message} (${menuError.code || "sin código"})`
      };
    }

    const { data: imageData, error: imageError } = await supabase
      .from("product_images")
      .select("product_id,image_base64");

    // Local & system_settings fallback cache map
    let customImageMap = new Map<string, string>();

    try {
      const { data: sysSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "custom_menu_items")
        .maybeSingle();

      if (sysSetting && sysSetting.value) {
        const parsed = typeof sysSetting.value === "string" ? JSON.parse(sysSetting.value) : sysSetting.value;
        if (Array.isArray(parsed)) {
          parsed.forEach((item: MenuItem) => {
            if (item.id && item.image) {
              customImageMap.set(item.id, item.image);
            }
          });
        }
      }
    } catch (e) {}

    try {
      const savedLocal = localStorage.getItem("castano_menu_cache");
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: MenuItem) => {
            if (item.id && item.image && !customImageMap.has(item.id)) {
              customImageMap.set(item.id, item.image);
            }
          });
        }
      }
    } catch (e) {}

    const imagesByProduct = new Map(
      (imageData || []).filter(img => img.product_id && img.image_base64).map((image) => [image.product_id, image.image_base64])
    );

    const items = (menuData || []).map((row) => {
      const item = mapDbMenuItem(row);
      const customImg = imagesByProduct.get(item.id) || customImageMap.get(item.id) || item.image || "";
      return {
        ...item,
        image: customImg
      };
    });

    return {
      items,
      imageWarning: imageError
        ? `${imageError.message} (${imageError.code || "sin código"})`
        : undefined
    };
  }

  static subscribe(
    onChanged: () => void,
    onStatus?: (status: string) => void
  ): () => void {
    let channel: RealtimeChannel | null = supabase
      .channel("catalog-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => onChanged()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_images" },
        () => onChanged()
      )
      .subscribe((status) => onStatus?.(status));

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }
}
