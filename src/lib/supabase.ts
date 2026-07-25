// Cliente de Supabase para RESTO BAR DEL TEATRO - Credenciales oficiales del propietario
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) 
  || "https://qavpleanmjbxbwfzismp.supabase.co";

const supabaseAnonKey = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) 
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdnBsZWFubWpieGJ3Znppc21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MzkyOTgsImV4cCI6MjEwMDUxNTI5OH0.8ch0D-p019xHw17DzIfa-k_2GXT_I49jfd1rAwPjKh4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
