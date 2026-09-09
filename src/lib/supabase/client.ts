import { createClient } from "@supabase/supabase-js";

function cleanEnv(val?: string): string {
  if (!val) return "";
  let clean = val.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  supabaseAnonKey !== "your-anon-public-key"
);

// Client-side instance with anon key
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
