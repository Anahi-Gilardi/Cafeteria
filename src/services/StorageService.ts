import { supabase } from "../lib/supabase";

export class StorageService {
  /**
   * Uploads an image file to Supabase Storage bucket 'product-images'.
   * Returns public URL on success, or base64 fallback string if bucket is not created yet.
   */
  public static async uploadProductImage(file: File): Promise<string> {
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // 1. Try uploading to Supabase Storage bucket 'product-images'
      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }

      console.warn("Supabase Storage info (using Base64 fallback):", error?.message);
    } catch (e) {
      console.warn("Storage exception, using Base64 fallback:", e);
    }

    // 2. Fallback: Convert file to Base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}
