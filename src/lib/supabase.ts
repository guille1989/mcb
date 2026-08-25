import { createClient } from "@supabase/supabase-js";

// Server-only — uses the service_role key, which bypasses Row Level Security.
// Never import this from a "use client" component.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
