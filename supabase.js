import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

export const supabaseConfig = {
  url: "https://ywfjhuoleaqednkucvea.supabase.co",
  anonKey: "sb_publishable_ujxD9hyTAHKwDtu7mRFW3Q_YaDnikiO"
};

let browserClient = null;

export function hasSupabaseConfig() {
  return Boolean(
    supabaseConfig.url &&
    supabaseConfig.anonKey &&
    !supabaseConfig.url.includes("PASTE_SUPABASE_URL") &&
    !supabaseConfig.anonKey.includes("PASTE_SUPABASE_ANON_KEY")
  );
}

export function getBrowserClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  return browserClient;
}
