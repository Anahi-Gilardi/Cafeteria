import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Configuración Supabase incompleta. Defina VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
  );
}

const parsedUrl = new URL(supabaseUrl);
if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".supabase.co")) {
  throw new Error("VITE_SUPABASE_URL no es una URL válida de Supabase.");
}

export const supabaseProjectRef = parsedUrl.hostname.split(".")[0];

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
