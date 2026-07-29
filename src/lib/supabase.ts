import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://qavpleanmjbxbwfzismp.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdnBsZWFubWpieGJ3Znppc21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MzkyOTgsImV4cCI6MjEwMDUxNTI5OH0.8ch0D-p019xHw17DzIfa-k_2GXT_I49jfd1rAwPjKh4";

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const supabaseUrl = rawUrl && rawUrl.startsWith("http") ? rawUrl : DEFAULT_SUPABASE_URL;
const supabaseAnonKey = rawKey && rawKey.length > 20 ? rawKey : DEFAULT_SUPABASE_ANON_KEY;

let ref = "qavpleanmjbxbwfzismp";
try {
  const parsedUrl = new URL(supabaseUrl);
  ref = parsedUrl.hostname.split(".")[0] || ref;
} catch {
  // Graceful fallback if URL parsing fails
}

export const supabaseProjectRef = ref;

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

