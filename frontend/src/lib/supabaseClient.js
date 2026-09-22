import { createClient } from "@supabase/supabase-js";

let client;

export function getSupabaseClient() {
  if (!client) {
    const url = process.env.REACT_APP_SUPABASE_URL;
    const publishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      throw new Error("Supabase authentication is not configured for this deployment.");
    }
    client = createClient(url, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
