import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://idjecovmqlyjhflfakfr.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkamVjb3ZtcWx5amhmbGZha2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NDgzMDYsImV4cCI6MjA5ODUyNDMwNn0.ERhlMTS-ElRhghi10ZNXPi8IvUw9N3O-p8yuPJk6GIY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
