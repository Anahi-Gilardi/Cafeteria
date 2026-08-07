import { supabase } from "../lib/supabase";

function compressImageFile(file: File, maxWidth = 800, maxHeight = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width || 400;
      canvas.height = height || 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
        return;
      }

      URL.revokeObjectURL(objectUrl);
      fallbackFileReader(file, resolve);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      fallbackFileReader(file, resolve);
    };

    img.src = objectUrl;
  });
}

function fallbackFileReader(file: File, resolve: (val: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let result = (e.target?.result as string) || "";
    if (result.startsWith("data:")) {
      result = result.replace(/^data:(image\/[a-zA-Z0-9.-]+|application\/octet-stream);/, "data:image/jpeg;");
    }
    resolve(result);
  };
  reader.onerror = () => resolve("");
  reader.readAsDataURL(file);
}

export class StorageService {
  /**
   * Uploads an image file to Supabase Storage bucket 'product-images'.
   * Returns public URL on success, or lightweight compressed base64 fallback string if bucket is not public/created.
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

      console.warn("Supabase Storage info (using compressed Base64 fallback):", error?.message);
    } catch (e) {
      console.warn("Storage exception, using compressed Base64 fallback:", e);
    }

    // 2. Fallback: Compress file to lightweight Base64 data URL (< 60KB)
    return compressImageFile(file, 800, 800, 0.75);
  }
}
